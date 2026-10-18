import test from 'node:test';
import assert from 'node:assert/strict';
import {ExpressionController,type ExpressionFrame} from '../src/brain/expression';
import {Brain} from '../src/brain/brain';
import {ActivityController} from '../src/integration/activity';
import {runModelTurn} from '../src/chat/modelTurn';
const {profiles,applyExpression}=require('../../media/fairy-expression.js');
const {sampleMotion}=require('../../media/fairy-motion.js');

test('brain expressions acknowledge once, then distinguish waiting and streaming without restarting',()=>{
  let now=0;const frames:ExpressionFrame[]=[];
  const brain=new Brain(true,()=>now);
  const expression=new ExpressionController(frame=>frames.push(frame),()=>now);
  const activity=new ActivityController(event=>{brain.observe(event);expression.observe(brain.snapshot(),event);},()=>now);
  activity.update('vscode','a','received');assert.equal(frames.at(-1)?.state,'acknowledge');
  now=10;activity.update('vscode','a','waiting');
  now=649;expression.tick();assert.equal(frames.length,1);
  now=650;expression.tick();assert.equal(frames.at(-1)?.state,'waiting');
  now=1000;activity.update('vscode','a','busy');assert.equal(frames.at(-1)?.state,'working');
  now=1500;activity.update('vscode','a','busy');assert.equal(frames.length,3);
  assert.equal(expression.snapshot().age,.5);
  activity.update('codex','b','busy');assert.equal(frames.length,3);
  activity.update('codex','b','completed','Unrelated');assert.equal(frames.length,3);
  activity.update('vscode','a','completed','Result');assert.equal(frames.at(-1)?.state,'completed');
  assert(!frames.at(-1)?.message.includes('Tests bestanden'));
  now=3100;expression.tick();assert.equal(frames.at(-1)?.state,'idle');
});

test('completion, error and cancellation preempt acknowledgement; local hints cannot interrupt a task',()=>{
  let now=0;const frames:ExpressionFrame[]=[];const brain=new Brain(true,()=>now);
  const expression=new ExpressionController(frame=>frames.push(frame),()=>now);
  const activity=new ActivityController(event=>{brain.observe(event);expression.observe(brain.snapshot(),event);},()=>now);
  for(const state of ['completed','error','cancelled'] as const){
    const id=state;activity.update('codex',id,'busy');expression.hint();
    assert.equal(frames.at(-1)?.state,'acknowledge');
    now+=100;activity.update('codex',id,state);assert.equal(frames.at(-1)?.state,state);
    now+=500;expression.tick();assert.equal(frames.at(-1)?.state,state);
  }
  expression.hint(true);assert.equal(frames.at(-1)?.state,'uncertain');
  now+=2400;expression.tick();assert.equal(frames.at(-1)?.state,'idle');
});

test('real streamed turn events feed brain and shared expression decisions',async()=>{
  let now=0;const frames:ExpressionFrame[]=[];const states:string[]=[];const brain=new Brain(true,()=>now);
  const expression=new ExpressionController(frame=>frames.push(frame),()=>now);
  const activity=new ActivityController(event=>{brain.observe(event);expression.observe(brain.snapshot(),event);},()=>now);
  await runModelTurn({
    request:async()=>{now=700;expression.tick();assert.equal(expression.snapshot().state,'waiting');return (async function*(){yield 'Answer';})();},
    cancelled:()=>false,fragment:()=>{assert.equal(expression.snapshot().state,'working');},
    state:(state,message)=>{states.push(state);activity.update('vscode','real-turn',state,message);}
  });
  assert.deepEqual(states,['received','waiting','busy','completed']);
  assert.deepEqual(frames.map(frame=>frame.state),['acknowledge','waiting','working','completed']);
});

test('expression trajectories are distinct, bounded, finite, and preserve the supplied pose object',()=>{
  const signatures=new Set<string>();
  for(const [state,p] of Object.entries(profiles) as [string,any][]){
    const poses=Array.from({length:61},(_,i)=>{
      const age=(p.duration||5)*i/60;
      const pose=sampleMotion(p.motion,age,age);
      assert.equal(applyExpression(state,age,pose),pose);
      assert(Object.values(pose).every(value=>Number.isFinite(value)));
      assert(Math.abs(pose.x)<75&&Math.abs(pose.y)<75&&pose.wingSpeed>0);
      return pose;
    });
    signatures.add(JSON.stringify(poses));
  }
  assert.equal(signatures.size,Object.keys(profiles).length);
  const base=sampleMotion('hover',0,0);
  assert.deepEqual(applyExpression('unknown',1,{...base}),base);
  assert.deepEqual(applyExpression('error',NaN,{...base}),base);
});
