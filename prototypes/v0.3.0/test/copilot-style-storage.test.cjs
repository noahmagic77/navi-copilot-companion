'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CopilotStyleStore, sanitize } = require('../src/storage/CopilotStyleStore.cjs');
const make = () => fs.mkdtempSync(path.join(os.tmpdir(),'navi-v03-'));

test('session files + SQLite index separate workspaces and survive restart', () => {
  const dir=make();
  try {
    let db = new CopilotStyleStore(dir,{requireSqlite:true});
    const a = db.append({kind:'advice', workspace:'A/repo',session:'session-1',source:'Copilot Hook',advice:[{id:'clarify',message:'PRIVATE PROMPT not stored'}],rawPrompt:'SUPERSECRET'});
    const b = db.append({kind:'metric', workspace:'B/repo',session:'session-1',input:120,output:35,cached:10,calls:1,rawTrace:'SECRET'});
    assert.notEqual(a.workspace,b.workspace);
    assert.notEqual(a.session,b.session);
    assert.ok(fs.existsSync(db.sessionPath(a)));
    assert.ok(fs.existsSync(db.sessionPath(b)));
    const s = db.summary();
    assert.equal(s.sessions,2); assert.equal(s.tokens.input,120); assert.equal(s.sqlite,true);
    assert.equal(s.advice,1);
    assert.equal(db.recentAdvice()[0].advice[0].message.includes('PRIVATE'),false);
    assert.ok(!db.exportJSON().includes('SUPERSECRET'));
    db.dispose();
    db = new CopilotStyleStore(dir,{requireSqlite:true});
    assert.equal(db.summary().sessions,2); assert.equal(db.summary().tokens.output,35);
    assert.equal(db.rebuildIndex().indexed,2);
    assert.equal(db.summary().tokens.input,120);
    db.dispose();
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('JSONL can restore index if sqlite deleted', () => {
  const dir=make();
  try {
    const db = new CopilotStyleStore(dir,{requireSqlite:true});
    db.append({kind:'session',workspace:'A',session:'z'});
    db.append({kind:'advice',workspace:'A',session:'z',source:'NAVI',advice:[{id:'scope'}]});
    const idx=db.indexPath; db.dispose();
    fs.unlinkSync(idx);
    const restored = new CopilotStyleStore(dir,{requireSqlite:true});
    assert.equal(restored.summary().advice,1);
    assert.equal(restored.rebuildIndex().indexed,2);
    restored.dispose();
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('sanitizer accepts only allowlisted event fields', () => {
  const item=sanitize({kind:'advice',workspace:'../../r',session:'untrusted',source:'Copilot Hook',advice:[{id:'scope',message:'secret'},{id:'evil'}],secret:'KEY',rawPrompt:'PASSWORD'});
  assert.equal(item.advice.length,1);
  assert.deepEqual(Object.keys(item).sort(), ['advice','at','id','kind','session','source','v','workspace'].sort());
  assert.ok(!JSON.stringify(item).includes('PASSWORD'));
  assert.ok(!JSON.stringify(item).includes('secret'));
});

test('retention removes old events and rebuilt index matches journal', () => {
  const dir=make();
  try {
    const db = new CopilotStyleStore(dir,{requireSqlite:true,retentionDays:30});
    db.append({kind:'session',session:'old',workspace:'w',at:'2023-01-01T00:00:00Z'});
    db.append({kind:'advice',session:'new',workspace:'w',advice:[{id:'clarify'}]});
    assert.equal(db.prune().dropped,1);
    assert.equal(db.summary().sessions,1);
    assert.equal(db.summary().advice,1);
    db.dispose();
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('clear deletes only NAVI storage files and leaves unrelated file untouched', () => {
  const dir=make();
  try {
    const unrelated=path.join(dir,'other-tool.dat'); fs.writeFileSync(unrelated,'unrelated');
    const db = new CopilotStyleStore(dir,{requireSqlite:true});
    db.append({kind:'metric',session:'a',workspace:'w',calls:1,input:80,output:20});
    db.clear();
    assert.ok(!fs.existsSync(db.indexPath));
    assert.deepEqual([...db.journal()],[]);
    assert.equal(fs.readFileSync(unrelated,'utf8'),'unrelated');
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('degrades to JSONL when SQLite is unavailable', () => {
  const dir=make();
  try {
    class BrokenSqlite { constructor(){ throw new Error('not supported'); } }
    const db=new CopilotStyleStore(dir,{sqliteFactory:BrokenSqlite});
    db.append({kind:'metric',workspace:'local',session:'one',input:5,output:2,calls:1});
    assert.equal(db.summary().tokens.input,5);
    assert.equal(db.summary().sqlite,false);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
