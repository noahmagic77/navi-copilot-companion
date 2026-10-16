import {test} from 'node:test';import {strict as assert} from 'node:assert';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {SessionJournal} from '../src/storage/sessionJournal';
test('session events are minimal, segregated, and reconstructable',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'navi-journal-')); const store=new SessionJournal(dir);
 try{
 await store.initialize();const a=store.workspaceKey('file:///repo/a');const b=store.workspaceKey('file:///repo/b');assert.notEqual(a,b);
 const s=store.newSessionId();const t=store.newSessionId();
 await store.record({workspaceId:a,sessionId:s,type:'hint',code:'UNCLEAR_GOAL'});
 await store.record({workspaceId:b,sessionId:t,type:'token_metrics',inputTokens:120,outputTokens:40,cachedInputTokens:12});
 const exported=await store.exportJsonl();assert.equal(exported.trim().split('\n').length,2);
 assert.ok(!exported.includes('/repo/'));
 assert.ok(!exported.includes('prompt'));
 assert.deepEqual((await store.rebuild()).eventCount,2);
 store.close();const other=new SessionJournal(dir);assert.deepEqual((await other.rebuild()).sessionCount,2);
 await other.clear();assert.equal((await other.rebuild()).eventCount,0);other.close();
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});
