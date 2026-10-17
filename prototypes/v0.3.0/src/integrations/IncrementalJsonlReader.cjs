'use strict';
const fs = require('node:fs');
/** Reads appended JSON lines, skips historical data by default, handles truncation. */
class IncrementalJsonlReader {
  constructor(filename, onRecord, { maxChunk = 1024 * 1024 } = {}) {
    this.filename = filename; this.onRecord = onRecord; this.maxChunk = maxChunk;
    this.offset = 0; this.pending = ''; this.initialized = false;
  }
  poll() {
    let st;
    try { st = fs.statSync(this.filename); } catch { this.initialized = true; this.offset = 0; this.pending = ''; return; }
    if (!this.initialized) { this.offset = st.size; this.initialized = true; return; }
    if (st.size < this.offset) { this.offset = 0; this.pending = ''; }
    if (st.size === this.offset) return;
    let fd;
    try {
      fd = fs.openSync(this.filename, 'r');
      const buffer = Buffer.allocUnsafe(Math.min(this.maxChunk, st.size - this.offset));
      const n = fs.readSync(fd, buffer, 0, buffer.length, this.offset);
      this.offset += n; this.pending += buffer.subarray(0, n).toString('utf8');
      if (this.pending.length > 4 * 1024 * 1024) { this.pending = ''; return; }
      const lines = this.pending.split('\n'); this.pending = lines.pop() || '';
      for (const line of lines) {
        if (line.length > 2 * 1024 * 1024 || !line.trim()) continue;
        try { this.onRecord(JSON.parse(line)); } catch { /* Ignore malformed records. */ }
      }
    } catch { /* Transient FS error must not interrupt VS Code. */ }
    finally { if (fd !== undefined) try { fs.closeSync(fd); } catch {} }
  }
}
module.exports = { IncrementalJsonlReader };
