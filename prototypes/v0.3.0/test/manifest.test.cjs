'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const p = JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const html = fs.readFileSync(path.join(root,'media/index.html'),'utf8');
const ui = fs.readFileSync(path.join(root,'media/ui.js'),'utf8');

test('extension manifest declares a real Webview and valid command IDs', () => {
  assert.equal(p.contributes.views['navi-companion'][0].type,'webview');
  assert.equal(p.contributes.views['navi-companion'][0].id,'navi.assistant');
  const ids = p.contributes.commands.map(c=>c.command);
  assert.equal(new Set(ids).size,ids.length);
  for (const name of ['navi.open','navi.installHooks','navi.removeHooks','navi.enableTelemetry','navi.disableTelemetry','navi.clearData']) assert.ok(ids.includes(name));
});

test('webview only accesses named elements which exist, and CSP is declared', () => {
  const needed = [...ui.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
  const unique = [...new Set(needed)];
  for (const id of unique) assert.ok(html.includes(`id="${id}"`),`missing HTML #${id}`);
  assert.ok(html.includes('Content-Security-Policy'));
  assert.ok(html.includes('nonce-{{nonce}}'));
  assert.ok(!ui.includes('.innerHTML ='));
});
