import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain, initialBrain, reduceBrain, describeBrain, type BrainEvent} from '../src/brain/brain';
import {ActivityController} from '../src/integration/activity';

test('brain replay is deterministic and focus loss preserves a running request',()=>{
  const events:BrainEvent[]=[
    {type:'activity',source:'vscode',state:'busy',requestId:'turn-a',at:10},
    {type:'focus',focused:false,at:20},
    {type:'activity',source:'vscode',state:'completed',requestId:'turn-a',at:30}
  ];
  const replay=()=>events.reduce(reduceBrain,initialBrain());
  const working=events.slice(0,2).reduce(reduceBrain,initialBrain());
  assert.equal(working.phase,'working');assert.equal(working.focused,false);
  assert.equal(replay().phase,'completed');assert.equal(replay().focused,false);
  assert.equal(replay().requestId,'turn-a');
  assert.deepEqual(replay(),replay());assert.equal(replay().revision,3);
  assert.equal(initialBrain().revision,0);
});

test('self-model distinguishes implemented, observed and planned capabilities',()=>{
  const initial=initialBrain();
  assert.equal(initial.capabilities.codex.implemented,true);
  assert.equal(initial.capabilities.codex.availability,'unknown');
  assert.equal(initial.capabilities.editorTargets.implemented,false);
  const busy=reduceBrain(initial,{type:'activity',source:'vscode',state:'busy',requestId:'chat-1',at:1});
  assert.equal(busy.capabilities.chat.availability,'unknown');
  const done=reduceBrain(busy,{type:'activity',source:'vscode',state:'completed',requestId:'chat-1',at:2});
  assert.equal(done.capabilities.chat.availability,'available');
  const failed=reduceBrain(done,{type:'activity',source:'vscode',state:'error',requestId:'chat-1',at:3});
  assert.equal(failed.phase,'error');assert.equal(failed.capabilities.chat.availability,'unknown');
  assert.equal(failed.capabilities.chat.confirmedAt,2);
  const codex=reduceBrain(failed,{type:'activity',source:'codex',state:'message',at:4});
  assert.equal(codex.capabilities.codex.availability,'available');
  assert.match(describeBrain(codex),/zuletzt bestätigt, aktuell nicht garantiert/);
  assert.match(describeBrain(codex),/Diagnose-Navigation: noch nicht implementiert/);
});

test('brain ignores stale or invalid times and never retains message contents',()=>{
  let now=20;const brain=new Brain(true,()=>now);
  brain.observe({source:'manual',state:'message',message:'SECRET PROMPT AND ANSWER'});
  const snapshot=brain.snapshot();
  assert(!JSON.stringify(snapshot).includes('SECRET'));
  assert(!brain.describe().includes('SECRET'));
  snapshot.capabilities.codex.implemented=false;snapshot.phase='error';
  assert.equal(brain.snapshot().capabilities.codex.implemented,true);
  assert.equal(brain.snapshot().phase,'idle');
  const prior=brain.snapshot();
  now=19;brain.focus(false);assert.deepEqual(brain.snapshot(),prior);
  assert.deepEqual(reduceBrain(prior,{type:'focus',focused:false,at:NaN}),prior);
  now=20;brain.focus(false);assert.equal(brain.snapshot().focused,false);
});

test('brain keeps bounded editor and window-local pointer perception in memory only',()=>{
  let now=1;const brain=new Brain(true,()=>now++);
  brain.pointer({x:320.5,y:140.25});
  brain.editor({
    languageId:'typescript',version:7,
    selection:{start:{line:3,character:2},end:{line:3,character:12}},
    contextKind:'selection',contextText:'const token = 1;',
    diagnostics:[{severity:'warning',source:'test',code:'W1',message:'Check this value.',start:{line:3,character:2},end:{line:3,character:12}}]
  });
  const snapshot=brain.snapshot();
  assert.deepEqual(snapshot.pointer,{x:320.5,y:140.25});
  assert.equal(snapshot.editor?.contextText,'const token = 1;');
  assert.equal(snapshot.editor?.diagnostics[0].message,'Check this value.');
  const report=brain.describe();
  assert.match(report,/320\.5, 140\.3 DIP/);
  assert.match(report,/typescript, Version 7; Auswahl mit 16 Zeichen; 1 Diagnosen/);
  assert(!report.includes('const token = 1;'));
  snapshot.editor!.contextText='mutated';
  assert.equal(brain.snapshot().editor?.contextText,'const token = 1;');
  now=3;brain.focus(false);
  assert.equal(brain.snapshot().pointer,null);
  assert.equal(brain.snapshot().editor?.contextText,'const token = 1;');
});

test('brain clears unavailable pointers and ignores malformed pointer coordinates',()=>{
  let now=1;const brain=new Brain(true,()=>now++);
  brain.pointer({x:100,y:200});
  brain.pointer({x:NaN,y:10});
  assert.equal(brain.snapshot().pointer,null);
  brain.pointer(null);
  assert.equal(brain.snapshot().pointer,null);
});

test('brain bounds editor context and diagnostics at its own input boundary',()=>{
  const brain=new Brain(true,()=>1);
  brain.editor({
    languageId:'x'.repeat(100),version:1,
    selection:{start:{line:0,character:0},end:{line:0,character:5000}},
    contextKind:'selection',contextText:'x'.repeat(3000),
    diagnostics:Array.from({length:30},(_,index)=>({severity:'error' as const,source:'s'.repeat(200),code:String(index),message:'m'.repeat(600),start:{line:index,character:0},end:{line:index,character:1}}))
  });
  const editor=brain.snapshot().editor!;
  assert.equal(editor.languageId.length,80);
  assert.equal(editor.contextText.length,2000);
  assert.equal(editor.diagnostics.length,25);
  assert.equal(editor.diagnostics[0].source?.length,120);
  assert.equal(editor.diagnostics[0].message.length,500);
});

test('existing activity arbitration feeds only selected states into the brain',()=>{
  let now=1;const brain=new Brain(true,()=>now++);
  const activity=new ActivityController(event=>brain.observe(event),()=>0);
  activity.update('vscode','a','busy');activity.update('codex','b','busy');
  assert.equal(brain.snapshot().source,'vscode');
  assert.equal(brain.snapshot().requestId,'a');
  assert.equal(brain.snapshot().capabilities.codex.availability,'unknown');
  activity.update('vscode','a','cancelled');
  assert.equal(brain.snapshot().source,'codex');assert.equal(brain.snapshot().phase,'working');
  assert.equal(brain.snapshot().requestId,'b');
  activity.update('codex','b','error');assert.equal(brain.snapshot().phase,'error');
  assert.match(brain.describe(),/konkrete Ursache ist hier nicht bekannt/);
  activity.update('codex','b','completed','Late result');assert.equal(brain.snapshot().phase,'error');
  activity.update('vscode','c','busy');activity.update('vscode','c','cancelled');
  assert.equal(brain.snapshot().phase,'cancelled');
  assert.match(brain.describe(),/Abbruch oder Ablauf/);
});

test('brain ignores a terminal result belonging to a different task and replays the current ID',()=>{
  const events:BrainEvent[]=[
    {type:'activity',source:'vscode',state:'busy',requestId:'old',at:1},
    {type:'activity',source:'codex',state:'busy',requestId:'current',at:2},
    {type:'activity',source:'vscode',state:'completed',requestId:'old',at:3}
  ];
  const state=events.reduce(reduceBrain,initialBrain());
  assert.equal(state.phase,'working');assert.equal(state.requestId,'current');assert.equal(state.revision,2);
  assert.match(describeBrain(state),/Aktuelle Aufgaben-ID: current/);
  const duplicateIdFromOtherSource=reduceBrain(state,{type:'activity',source:'vscode',state:'completed',requestId:'current',at:3});
  assert.deepEqual(duplicateIdFromOtherSource,state);
  const done=reduceBrain(state,{type:'activity',source:'codex',state:'completed',requestId:'current',at:4});
  assert.equal(done.phase,'completed');assert.equal(done.requestId,'current');
  assert.match(describeBrain(done),/Letzte Aufgaben-ID: current/);
});
