'use strict';
/** NAVI v0.3 per-user: JSONL is the source of truth; SQLite is a disposable search index.
 * No prompts, code, tool parameters, Windows identities or GitHub tokens are persisted.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ADVICE } = require('../analyze.cjs');
const SCHEMA_VERSION = 1;
const sha = value => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 32);
const isDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const nonneg = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const validIds = new Set(Object.keys(ADVICE));

function sanitize(value) {
  if (!value || typeof value !== 'object') throw new TypeError('Event must be an object');
  const kind = value.kind;
  if (!['advice', 'metric', 'session'].includes(kind)) throw new TypeError('Unsupported event kind');
  const out = {
    v: 1,
    id: crypto.randomUUID(),
    kind,
    at: isDate(value.at) ? new Date(value.at).toISOString() : new Date().toISOString(),
    // Hashes prevent traversal and keep user, repository and original Copilot IDs out of files.
    workspace: sha(value.workspace || 'default'),
    session: sha(`${sha(value.workspace || 'default')}:${value.session || 'unknown'}`)
  };
  if (kind === 'advice') {
    out.source = ['NAVI', 'Copilot Hook', 'system'].includes(value.source) ? value.source : 'NAVI';
    const input = Array.isArray(value.advice) ? value.advice : [];
    out.advice = input.filter(item => item && validIds.has(item.id)).slice(0, 3)
      .map(item => ({ id: item.id, message: ADVICE[item.id] }));
    if (!out.advice.length) throw new TypeError('No recognized advice IDs');
  } else if (kind === 'metric') {
    out.input = nonneg(value.input);
    out.output = nonneg(value.output);
    out.cached = Math.min(out.input, nonneg(value.cached));
    out.calls = nonneg(value.calls);
    if (!out.calls || (!out.input && !out.output)) throw new TypeError('Empty metric');
  } else {
    out.source = value.source === 'Copilot Hook' ? 'Copilot Hook' : 'NAVI';
  }
  return out;
}

const SCHEMA = `
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, events INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), at TEXT NOT NULL, kind TEXT NOT NULL, source TEXT, rule_ids TEXT);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, at DESC);
CREATE TABLE IF NOT EXISTS token_metrics(event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE, input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL, cached_tokens INTEGER NOT NULL, calls INTEGER NOT NULL);
INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
`;

class CopilotStyleStore {
  constructor(directory, { retentionDays = 30, requireSqlite = false, sqliteFactory } = {}) {
    this.root = directory;
    this.sessionsDir = path.join(directory, 'sessions');
    this.indexPath = path.join(directory, 'navi-index.sqlite');
    this.retentionDays = retentionDays;
    fs.mkdirSync(this.sessionsDir, { recursive: true, mode: 0o700 });
    this.sqliteAvailable = false;
    this.indexError = '';
    let DatabaseSync;
    try { DatabaseSync = sqliteFactory || require('node:sqlite').DatabaseSync; }
    catch (e) { this.indexError = `SQLite nicht verfügbar: ${e.message}`; }
    if (DatabaseSync) {
      try {
        this.db = new DatabaseSync(this.indexPath);
        this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=1500;');
        this.db.exec(SCHEMA);
        const version = this.db.prepare('SELECT MAX(version) v FROM schema_migrations').get().v;
        if (Number(version) !== SCHEMA_VERSION) throw new Error(`Unbekannte Schema-Version: ${version}`);
        this.sqliteAvailable = true;
        // Consistency check: the JSONL journal is always authoritative.
        // It is idempotent and repairs a crashed append/index transition.
        this.rebuildIndex();
      } catch (e) {
        this.indexError = `SQLite-Index nicht betriebsbereit: ${e.message}`;
        try { this.db?.close(); } catch {}
        this.db = null;
      }
    }
    if (requireSqlite && !this.sqliteAvailable) throw new Error(this.indexError);
  }
  sessionPath(record) {
    return path.join(this.sessionsDir, record.workspace, `${record.session}.jsonl`);
  }
  append(value) {
    const record = sanitize(value);
    const file = this.sessionPath(record);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    // Append FIRST. Crash before indexing is recovered via reindex.
    fs.appendFileSync(file, JSON.stringify(record) + '\n', { encoding: 'utf8', mode: 0o600 });
    if (this.db) {
      try { this.indexOne(record); }
      catch (e) { this.indexError = `Index veraltet; neu aufbauen: ${e.message}`; }
    }
    return record;
  }
  indexOne(record) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.db.prepare('SELECT 1 FROM events WHERE id=?').get(record.id)) { this.db.exec('COMMIT'); return; }
      this.db.prepare('INSERT OR IGNORE INTO workspaces(id) VALUES(?)').run(record.workspace);
      this.db.prepare(`INSERT INTO sessions(id,workspace_id,first_seen,last_seen,events) VALUES(?,?,?,?,1)
        ON CONFLICT(id) DO UPDATE SET first_seen=MIN(first_seen,excluded.first_seen),last_seen=MAX(last_seen,excluded.last_seen),events=events+1`)
        .run(record.session, record.workspace, record.at, record.at);
      this.db.prepare('INSERT OR IGNORE INTO events(id,session_id,at,kind,source,rule_ids) VALUES(?,?,?,?,?,?)')
        .run(record.id, record.session, record.at, record.kind, record.source || null,
          record.advice ? record.advice.map(a => a.id).join(',') : null);
      if (record.kind === 'metric')
        this.db.prepare('INSERT INTO token_metrics(event_id,input_tokens,output_tokens,cached_tokens,calls) VALUES(?,?,?,?,?)')
          .run(record.id, record.input, record.output, record.cached, record.calls);
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  *journal() {
    if (!fs.existsSync(this.sessionsDir)) return;
    for (const workspace of fs.readdirSync(this.sessionsDir, { withFileTypes:true }).filter(x => x.isDirectory())) {
      const wdir = path.join(this.sessionsDir, workspace.name);
      for (const entry of fs.readdirSync(wdir, { withFileTypes:true }).filter(x => x.isFile() && /^[a-f0-9]{32}\.jsonl$/.test(x.name))) {
        const filename = path.join(wdir, entry.name);
        const contents = fs.readFileSync(filename, 'utf8');
        for (const line of contents.split('\n')) {
          if (!line || line.length > 16_384) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.v !== 1 || !isDate(obj.at) || !/^[a-f0-9]{32}$/.test(obj.session) || obj.workspace !== workspace.name || obj.session !== entry.name.slice(0, -6) || !['advice','metric','session'].includes(obj.kind) || typeof obj.id !== 'string' || !/^[0-9a-f-]{36}$/.test(obj.id)) continue;
            if (obj.kind === 'advice') {
              if (!Array.isArray(obj.advice) || !obj.advice.every(a => validIds.has(a.id))) continue;
              obj.advice = obj.advice.map(a => ({ id: a.id, message: ADVICE[a.id] }));
            }
            yield obj;
          } catch { /* partial/corrupt line */ }
        }
      }
    }
  }
  rebuildIndex() {
    if (!this.db) return { indexed: 0, sqlite: false };
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.exec('DELETE FROM token_metrics; DELETE FROM events; DELETE FROM sessions; DELETE FROM workspaces;');
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
    let indexed = 0;
    for (const record of this.journal()) { this.indexOne(record); indexed++; }
    this.indexError = '';
    return { indexed, sqlite: true };
  }
  recentAdvice(limit = 12) {
    return Array.from(this.journal()).filter(x => x.kind === 'advice')
      .sort((a,b) => b.at.localeCompare(a.at)).slice(0, limit)
      .map(x => ({ at: x.at, source: x.source, advice: x.advice }));
  }
  summary() {
    if (this.db && !this.indexError) {
      try {
        const sessions = Number(this.db.prepare('SELECT COUNT(*) n FROM sessions').get().n);
        const advice = Number(this.db.prepare("SELECT COUNT(*) n FROM events WHERE kind='advice'").get().n);
        const t = this.db.prepare(`SELECT COALESCE(SUM(input_tokens),0) input, COALESCE(SUM(output_tokens),0) output,
          COALESCE(SUM(cached_tokens),0) cached, COALESCE(SUM(calls),0) calls FROM token_metrics`).get();
        return { sessions, advice, tokens: { input: Number(t.input), output: Number(t.output), cached: Number(t.cached), calls: Number(t.calls) }, sqlite: true, indexError: '' };
      } catch (e) { this.indexError = e.message; }
    }
    let sessions = new Set(), input = 0, output = 0, cached = 0, calls = 0, advice = 0;
    for (const e of this.journal()) {
      sessions.add(e.session);
      if (e.kind === 'metric') { input += e.input; output += e.output; cached += e.cached; calls += e.calls; }
      if (e.kind === 'advice') advice++;
    }
    return { sessions: sessions.size, advice, tokens: { input, output, cached, calls }, sqlite: Boolean(this.db) && !this.indexError, indexError: this.indexError };
  }
  exportJSON() {
    // Export contains only the sanitized event schema, never raw hooks or OTel payloads.
    return JSON.stringify({ product: 'NAVI', schemaVersion: 1, exportedAt: new Date().toISOString(), events: Array.from(this.journal()) }, null, 2) + '\n';
  }
  prune(now = Date.now()) {
    const cutoff = now - this.retentionDays * 86400_000;
    let dropped = 0;
    const groups = new Map();
    for (const e of this.journal()) {
      const file = this.sessionPath(e);
      if (!groups.has(file)) groups.set(file, []);
      if (Date.parse(e.at) >= cutoff) groups.get(file).push(e); else dropped++;
    }
    for (const [file, rows] of groups) {
      if (!rows.length) fs.unlinkSync(file);
      else {
        const temp = `${file}.${process.pid}.tmp`;
        try { fs.writeFileSync(temp, rows.map(r => JSON.stringify(r)).join('\n') + '\n', { encoding:'utf8', mode:0o600 }); fs.renameSync(temp,file); }
        finally { try { fs.unlinkSync(temp); } catch {} }
      }
    }
    this.rebuildIndex();
    return { dropped };
  }
  clear() {
    try { this.db?.close(); } catch {} this.db = null;
    fs.rmSync(this.sessionsDir, { recursive:true, force:true });
    // Remove SQLite including WAL and SHM; never touch unrelated extension data.
    for (const file of [this.indexPath, this.indexPath + '-wal', this.indexPath + '-shm']) {
      try { fs.unlinkSync(file); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    fs.mkdirSync(this.sessionsDir, { recursive:true, mode:0o700 });
  }
  dispose() { try { this.db?.close(); } catch {} this.db = null; }
}
module.exports = { CopilotStyleStore, sanitize, SCHEMA };
