'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AnalysisEngine } = require('../src/core/AnalysisEngine.cjs');
const { SessionManager } = require('../src/core/SessionManager.cjs');
const { JsonEventStore } = require('../src/storage/JsonEventStore.cjs');
const { IncrementalJsonlReader } = require('../src/integrations/IncrementalJsonlReader.cjs');
const { CopilotHookManager } = require('../src/integrations/CopilotHookManager.cjs');

test('session topics detect change only for known, same-session categories', () => {
  const sm = new SessionManager();
  assert.equal(sm.registerPrompt('abc', 'auth').topicChanged, false);
  assert.equal(sm.registerPrompt('abc', 'database').topicChanged, true);
  assert.equal(sm.registerPrompt('unknown', 'auth').topicChanged, false);
  assert.equal(sm.registerPrompt('unknown', 'database').topicChanged, false);
  assert.equal(sm.registerPrompt('abc', 'unclassified').topicChanged, false);
  assert.equal(sm.registerPrompt('abc', 'database').topicChanged, false);
});

test('AnalysisEngine generates explicit tentative new-chat signal', () => {
  const engine = new AnalysisEngine();
  engine.fromHook({ kind:'prompt', session:'abc', category:'auth', flags:[] });
  const result = engine.fromHook({ kind:'prompt', session:'abc', category:'database', flags:[] });
  assert.ok(result.some(a => a.id === 'fresh-chat'));
  assert.equal(engine.fromHook({ kind:'tool' }).length, 0);
});

test('JsonEventStore stores only sanitized events, respects limits and clear', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'navi-store-'));
  try {
    const store = new JsonEventStore(dir, {limit:2});
    store.save([
      {at:new Date().toISOString(),source:'Hook',advice:[{id:'clarify',message:'Konkretisieren'}],rawPrompt:'secret'},
      {at:'2000-01-01T00:00:00Z',source:'Old',advice:[{id:'scope',message:'Scope'}]}
    ]);
    const content = fs.readFileSync(store.file, 'utf8');
    assert.ok(!content.includes('secret'));
    assert.equal(store.load().length,1);
    store.clear(); assert.deepEqual(store.load(),[]);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('incremental reader ignores existing lines, reads append and supports truncation', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'navi-tail-'));
  try {
    const log=path.join(dir,'e.jsonl'), events=[];
    fs.writeFileSync(log,'{"event":"historical"}\n');
    const tail=new IncrementalJsonlReader(log,e=>events.push(e));
    tail.poll(); assert.equal(events.length,0);
    fs.appendFileSync(log,'{"event":"new"}\n'); tail.poll();
    assert.deepEqual(events.map(e=>e.event),['new']);
    fs.writeFileSync(log,'{"event":"truncated"}\n'); tail.poll();
    assert.equal(events.some(e=>e.event==='truncated'),true);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('hook manager installs only into empty target; verifies manifest hash before removal', () => {
  const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'navi-hooks-'));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'navi-meta-'));
  const manager=new CopilotHookManager(path.resolve(__dirname,'..'),data);
  try {
    manager.install(workspace,path.join(data,'events.jsonl'));
    assert.equal(manager.status(workspace),true);
    assert.throws(()=>manager.install(workspace,'x'),/bereits NAVI-Dateien/);
    const target=manager.paths(workspace)[1];
    fs.appendFileSync(target,'\n// manually edited\n');
    assert.equal(manager.status(workspace),false);
    assert.throws(()=>manager.remove(workspace),/verändert/);
  } finally { fs.rmSync(workspace,{recursive:true,force:true}); fs.rmSync(data,{recursive:true,force:true}); }
});

test('hook manager can clean unmodified installation', () => {
  const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'navi-hooks-'));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'navi-meta-'));
  const manager=new CopilotHookManager(path.resolve(__dirname,'..'),data);
  try { manager.install(workspace,path.join(data,'events.jsonl')); manager.remove(workspace); assert.equal(manager.status(workspace),false); }
  finally { fs.rmSync(workspace,{recursive:true,force:true}); fs.rmSync(data,{recursive:true,force:true}); }
});


test('reader observes the very first event when log file is created after startup', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'navi-newfile-'));
  const filepath = path.join(dir, 'brand-new.jsonl');
  const seen = [];
  try {
    const reader = new IncrementalJsonlReader(filepath, x => seen.push(x));
    reader.poll();
    fs.writeFileSync(filepath, '{"kind":"prompt","new":true}\n');
    reader.poll();
    assert.equal(seen.length,1);
    assert.equal(seen[0].new,true);
  } finally { fs.rmSync(dir, {recursive:true,force:true}); }
});
