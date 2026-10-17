import test from 'node:test';
import assert from 'node:assert/strict';
import {ActivityController, type ActivityEvent} from '../src/integration/activity';
import {runModelTurn} from '../src/chat/modelTurn';

test('simultaneous VS Code and Codex requests cannot overwrite the active owner',()=>{
  const events:ActivityEvent[]=[];
  const activity=new ActivityController(event=>events.push(event));
  activity.update('vscode','a','busy');
  assert.equal(activity.update('codex','b','busy'),false);
  assert.equal(activity.message('codex','An unrelated result'),false);
  assert.equal(activity.update('codex','b','completed','Late result'),false);
  assert.equal(events.length,1);
  activity.update('vscode','a','completed','Actual answer');
  assert.equal(events.at(-1)?.message,'Actual answer');
  assert.equal(activity.update('vscode','a','error'),false);
});

test('waiting activity resumes, lease expiry clears busy, and shared excerpts remain bounded',()=>{
  let now=0;const events:ActivityEvent[]=[];
  const activity=new ActivityController(event=>events.push(event),()=>now);
  activity.update('vscode','a','busy');now=20_000;
  activity.update('codex','b','busy');
  activity.update('vscode','a','cancelled');
  assert.deepEqual(events.at(-1),{source:'codex',state:'busy',message:''});
  now=141_000;activity.expire();
  assert.equal(events.at(-1)?.state,'cancelled');
  activity.message('codex','🧚'.repeat(200));
  assert.equal(Array.from(events.at(-1)!.message).length,160);
  assert.equal(activity.update('codex','expired','completed','Not a real turn'),false);
});

test('model turn streams the selected model once and finishes with the full answer',async()=>{
  let calls=0;const fragments:string[]=[];const states:string[]=[];
  const answer=await runModelTurn({
    request:async()=>{calls++;return (async function*(){yield 'Hallo ';yield 'Welt';})();},
    cancelled:()=>false,fragment:text=>fragments.push(text),state:(state,message)=>states.push(state+':'+(message??''))
  });
  assert.equal(calls,1);assert.equal(answer,'Hallo Welt');assert.deepEqual(fragments,['Hallo ','Welt']);
  assert.equal(states.at(-1),'completed:Hallo Welt');
});

test('aborted and failed model turns never publish a completed answer',async()=>{
  let cancelled=false;const states:string[]=[];
  const answer=await runModelTurn({request:async()=>(async function*(){yield 'Partial';cancelled=true;yield 'not shown';})(),cancelled:()=>cancelled,fragment:()=>{},state:state=>states.push(state)});
  assert.equal(answer,undefined);assert.equal(states.at(-1),'cancelled');assert(!states.includes('completed'));
  states.length=0;
  await assert.rejects(runModelTurn({request:async()=>{throw Error('model unavailable');},cancelled:()=>false,fragment:()=>{},state:state=>states.push(state)}));
  assert.deepEqual(states,['busy','error']);
  let invoked=false;
  await runModelTurn({request:async()=>{invoked=true;throw Error();},cancelled:()=>true,fragment:()=>{},state:()=>{throw Error('Should not update');}});
  assert.equal(invoked,false);
});
