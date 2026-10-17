'use strict';
// NAVI-MANAGED-OBSERVER: Copilot hook -> sanitized local JSONL.
// Installed into an opted-in workspace. Runs under external Node.js >=18.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { analyzePrompt } = require('./analyze.cjs');

function normalizeTool(input) {
  const s = String(input || '').toLowerCase();
  if (/search|grep|glob|rg|read|view/.test(s)) return 'search';
  if (/edit|write|create|apply/.test(s)) return 'edit';
  if (/bash|shell|terminal|powershell|exec/.test(s)) return 'terminal';
  return 'other';
}

function processEvent(kind, input) {
  const raw = input && typeof input === 'object' ? input : {};
  const sessionId = String(raw.sessionId || raw.session_id || '').trim();
  const event = {
    ts: new Date().toISOString(),
    kind: ['prompt', 'start', 'tool'].includes(kind) ? kind : 'unknown',
    session: sessionId ? crypto.createHash('sha256').update(sessionId).digest('hex').slice(0, 16) : 'unknown'
  };
  if (kind === 'prompt') {
    const result = analyzePrompt(raw.prompt);
    event.words = result.words;
    event.category = result.category;
    event.flags = result.flags;
  } else if (kind === 'tool') {
    event.toolCategory = normalizeTool(raw.toolName || raw.tool_name);
  }
  return event;
}

function appendSafe(file, event) {
  if (!file || typeof file !== 'string') return;
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) fs.truncateSync(file, 0);
    fs.appendFileSync(file, JSON.stringify(event) + '\n', { encoding: 'utf8', mode: 0o600 });
  } catch (_error) { /* Never interrupt Copilot because NAVI logging failed. */ }
}

async function main() {
  let incoming = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    incoming += chunk;
    if (incoming.length > 512 * 1024) break;
  }
  try {
    const parsed = JSON.parse(incoming || '{}');
    const event = processEvent(process.argv[2], parsed);
    appendSafe(process.env.NAVI_EVENTS_FILE, event);
  } catch (_error) { /* Malformed event; ignore. */ }
  process.stdout.write('{}\n'); // Do not inject, block or modify Copilot.
}

if (require.main === module) {
  main().catch(() => { process.stdout.write('{}\n'); });
}
module.exports = { processEvent, normalizeTool };
