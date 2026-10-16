-- NAVI v0.3.0: real runtime schema (SQLite index is rebuildable from session JSONL).
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, events INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), at TEXT NOT NULL, kind TEXT NOT NULL, source TEXT, rule_ids TEXT);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, at DESC);
CREATE TABLE IF NOT EXISTS token_metrics(event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE, input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL, cached_tokens INTEGER NOT NULL, calls INTEGER NOT NULL);
INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));

