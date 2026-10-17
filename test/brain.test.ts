import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain, initialBrain, reduceBrain, describeBrain, type BrainEvent} from '../src/brain/brain';
import {ActivityController} from '../src/integration/activity';

test('brain replay is deterministic and focus loss preserves a running request',()=>{
  const events:BrainEvent[]=[
    {type:'activity',source:'vscode',state:'busy',at:10},
    {type:'focus',focused:false,at:20},
    {type:'activity',source:'vscode',state:'completed',at:30}
  ];
  const replay=()=>events.reduce(reduceBrain,initialBrain());
  const working=events.slice(0,2).reduce(reduceBrain,initialBrain());
  assert.equal(working.phase,'working');assert.equal(working.focused,false);
  assert.equal(replay().phase,'completed');assert.equal(replay().focused,false);
  assert.deepEqual(replay(),replay());assert.equal(replay().revision,3);
  assert.equal(initialBrain().revision,0);
});

test('self-model distinguishes implemented, observed and planned capabilities',()=>{
  const initial=initialBrain();
  assert.equal(initial.capabilities.codex.implemented,true);
  assert.equal(initial.capabilities.codex.availability,'unknown');
  assert.equal(initial.capabilities.editorTargets.implemented,false);
  const busy=reduceBrain(initial,{type:'activity',source:'vscode',state:'busy',at:1});
  assert.equal(busy.capabilities.chat.availability,'unknown');
  const done=reduceBrain(busy,{type:'activity',source:'vscode',state:'completed',at:2});
  assert.equal(done.capabilities.chat.availability,'available');
  const failed=reduceBrain(done,{type:'activity',source:'vscode',state:'error',at:3});
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

test('existing activity arbitration feeds only selected states into the brain',()=>{
  let now=1;const brain=new Brain(true,()=>now++);
  const activity=new ActivityController(event=>brain.observe(event),()=>0);
  activity.update('vscode','a','busy');activity.update('codex','b','busy');
  assert.equal(brain.snapshot().source,'vscode');
  assert.equal(brain.snapshot().capabilities.codex.availability,'unknown');
  activity.update('vscode','a','cancelled');
  assert.equal(brain.snapshot().source,'codex');assert.equal(brain.snapshot().phase,'working');
  activity.update('codex','b','error');assert.equal(brain.snapshot().phase,'error');
  assert.match(brain.describe(),/konkrete Ursache ist hier nicht bekannt/);
  activity.update('codex','b','completed','Late result');assert.equal(brain.snapshot().phase,'error');
  activity.update('vscode','c','busy');activity.update('vscode','c','cancelled');
  assert.equal(brain.snapshot().phase,'cancelled');
  assert.match(brain.describe(),/Abbruch oder Ablauf/);
});
