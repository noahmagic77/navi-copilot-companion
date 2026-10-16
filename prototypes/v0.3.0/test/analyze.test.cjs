'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { analyzePrompt, adviceFor, promptTemplate, topicOf } = require('../src/analyze.cjs');
const { processEvent } = require('../src/observer.cjs');

test('vague prompt receives useful deterministic flags', () => {
  const result = analyzePrompt('Mach alles besser');
  assert.equal(result.words, 3);
  assert.ok(result.flags.includes('clarify'));
  assert.ok(result.flags.includes('scope'));
  assert.ok(result.flags.includes('define-acceptance'));
});

test('scoped prompt yields fewer hints', () => {
  const result = analyzePrompt('In auth.ts: Implementiere OAuth-Login, aber ändere keine anderen Module. Teste die Anmeldung und prüfe erwartete Fehlerfälle.');
  assert.equal(result.category, 'auth');
  assert.equal(result.flags.length, 0);
});

test('topic classification', () => {
  assert.equal(topicOf('Please add PostgreSQL migration'), 'database');
  assert.equal(topicOf('Please implement oauth signin'), 'auth');
  assert.equal(topicOf('A completely unknown matter'), 'unclassified');
});

test('template keeps original and indicates unknown constraints', () => {
  const result = promptTemplate('Implementiere ein Feature.');
  assert.ok(result.includes('Implementiere ein Feature.'));
  assert.ok(result.includes('[angeben, falls bekannt]'));
});

test('only predefined advice IDs are allowed', () => {
  assert.equal(adviceFor(['clarify', 'malicious']).length, 1);
});

test('sanitized event excludes raw prompt, cwd and raw session ID', () => {
  const sample = 'OAuth-Login verbessern für kunden@example.com secret-KEY-123';
  const result = processEvent('prompt', { prompt: sample, cwd: '/super/secret', sessionId: 'sensitive-session-ID' });
  const json = JSON.stringify(result);
  assert.equal(result.kind, 'prompt');
  assert.equal(result.category, 'auth');
  assert.equal(typeof result.words, 'number');
  assert.ok(!json.includes('example.com'));
  assert.ok(!json.includes('secret'));
  assert.ok(!json.includes('/super'));
});

test('stdin observer writes sanitized JSONL and never changes Copilot output', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'navi-test-'));
  try {
    const outfile = path.join(dir, 'events.jsonl');
    const original = 'Fix login in auth.ts for alice@example.com';
    const child = spawnSync(process.execPath, [path.join(__dirname, '../src/observer.cjs'), 'prompt'], {
      input: JSON.stringify({ prompt: original, sessionId: 'session-secret' }), encoding: 'utf8',
      env: { ...process.env, NAVI_EVENTS_FILE: outfile }
    });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout.trim(), '{}');
    const content = fs.readFileSync(outfile, 'utf8');
    assert.ok(content.includes('"kind":"prompt"'));
    assert.ok(!content.includes('alice@'));
    assert.ok(!content.includes('session-secret'));
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});


test('missing session id remains unknown to avoid false cross-session topic transitions', () => {
  assert.equal(processEvent('prompt', {prompt: 'OAuth login'}).session, 'unknown');
});
