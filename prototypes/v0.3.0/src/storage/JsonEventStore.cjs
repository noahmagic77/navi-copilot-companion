'use strict';
const fs = require('node:fs');
const path = require('node:path');
/** Atomic bounded JSON snapshots. Stores only sanitized recommendations and aggregates. */
class JsonEventStore {
  constructor(directory, { limit = 200, retentionDays = 14 } = {}) {
    this.file = path.join(directory, 'navi-state-v1.json');
    this.limit = limit; this.retentionDays = retentionDays;
  }
  load() {
    try {
      const o = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (o.version !== 1 || !Array.isArray(o.events)) return [];
      return this.filter(o.events);
    } catch { return []; }
  }
  filter(events, now = Date.now()) {
    const cutoff = now - this.retentionDays * 24 * 3600 * 1000;
    return events.filter(e => e && Number.isFinite(Date.parse(e.at)) && Date.parse(e.at) >= cutoff &&
      typeof e.source === 'string' && Array.isArray(e.advice) && e.advice.every(a => a && typeof a.id === 'string' && typeof a.message === 'string'))
      .slice(0, this.limit).map(e => ({ at: e.at, source: e.source.slice(0, 40), advice: e.advice.slice(0, 3).map(a => ({ id: a.id, message: a.message })) }));
  }
  save(events) {
    const dir = path.dirname(this.file); fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const temp = `${this.file}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(temp, JSON.stringify({ version: 1, events: this.filter(events) }) + '\n', { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(temp, this.file);
    } finally { try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {} }
  }
  clear() { try { fs.unlinkSync(this.file); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
}
module.exports = { JsonEventStore };
