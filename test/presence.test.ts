import test from 'node:test';
import assert from 'node:assert/strict';
import {PresenceController,type PresenceEvent} from '../src/brain/presence';
import {ExpressionController} from '../src/brain/expression';
import {Brain} from '../src/brain/brain';
const free={enabled:true,focused:true,occupied:false,expressionIdle:true};
const {applyPresence}=require('../../media/fairy-expression.js');
const {sampleMotion}=require('../../media/fairy-motion.js');

test('presence coalesces bursts by meaning and rate limits repeated gestures',()=>{
  const living=new PresenceController(0);
  living.observe('scroll',4000);living.observe('selection',4100);living.observe('taskFailure',4200);
  const reaction=living.evaluate(4250,free)!;
  assert.equal(reaction.state,'startled');assert.match(reaction.reason,/Exit-Code/);
  living.observe('taskFailure',4400);assert.equal(living.evaluate(7800,free),null);
  living.observe('save',8000);assert.equal(living.evaluate(8000,free)?.state,'pleased');
  living.observe('save',8100);assert.equal(living.evaluate(12000,free),null);
});

test('a fast task result follows its start gesture before the ordinary low-priority cooldown',()=>{
  const living=new PresenceController(0);
  living.observe('taskStart',4000);assert.equal(living.evaluate(4000,free)?.state,'attentive');
  living.observe('taskSuccess',4100);
  assert.equal(living.evaluate(5000,{...free,expressionIdle:false}),null);
  assert.equal(living.evaluate(6050,free)?.state,'pleased');
});

test('important results survive a longer greeting but are never replayed after an active request',()=>{
  const living=new PresenceController(0);
  living.observe('return',4000);assert.equal(living.evaluate(4000,free)?.state,'welcoming');
  living.observe('taskFailure',4100);assert.equal(living.evaluate(6500,{...free,expressionIdle:false}),null);
  assert.equal(living.evaluate(6700,free)?.state,'startled');
  living.observe('taskSuccess',10000);living.evaluate(10100,{...free,occupied:true});assert.equal(living.evaluate(12000,free),null);
});
test('direct contact responds during startup while ambient startup events remain quiet',()=>{
  const living=new PresenceController(0);living.observe('touch',100);
  assert.equal(living.evaluate(100,free)?.state,'startled');
});
test('paused, unfocused and occupied states discard transient reactions instead of replaying later',()=>{
  for(const blocked of [{enabled:false},{focused:false},{occupied:true}]){
    const living=new PresenceController(0);living.observe('file',4000);
    assert.equal(living.evaluate(4100,{...free,...blocked}),null);
    assert.equal(living.evaluate(4200,free),null);
  }
  const living=new PresenceController(0);living.observe('file',4000);
  assert.equal(living.evaluate(4100,{...free,expressionIdle:false}),null);
  assert.equal(living.evaluate(7000,free),null);
});
test('startup, editing bursts and ordinary recovery keep attention from turning into constant interruptions',()=>{
  const living=new PresenceController(0);living.observe('file',0);assert.equal(living.evaluate(1000,free),null);
  living.observe('edit',4000);living.observe('scroll',4100);assert.equal(living.evaluate(4200,free),null);
  living.observe('save',5000);assert.equal(living.evaluate(5000,free)?.state,'pleased');
  living.observe('selection',5100);assert.equal(living.evaluate(5200,free),null);
  assert.equal(living.evaluate(9000,free),null);
});
test('simulated dynamics decay independently of tick size, including the rest threshold',()=>{
  const coarse=new PresenceController(0),fine=new PresenceController(0);
  coarse.observe('file',0);fine.observe('file',0);
  coarse.evaluate(120000,free);
  for(const at of [1000,10000,30000,90000,100000,120000])fine.evaluate(at,free);
  const a=coarse.snapshot(),b=fine.snapshot();
  for(const key of ['energy','attention','curiosity'] as const)assert(Math.abs(a[key]-b[key])<1e-12,key);
  assert.equal(a.mode,'resting');assert(a.energy<.72);
  coarse.observe('return',124000);assert.equal(coarse.evaluate(124000,free)?.state,'welcoming');
});
test('speech has a separate budget and state never retains contents or task names',()=>{
  const living=new PresenceController(0);
  living.observe('taskSuccess',4000);assert(living.evaluate(4000,free)?.message);
  living.observe('taskFailure',8000);assert.equal(living.evaluate(8000,free)?.message,'');
  living.observe('return',40000);assert(living.evaluate(40000,free)?.message);
  const before=living.snapshot().observed;living.observe('touch',NaN);living.observe('touch',1);assert.equal(living.snapshot().observed,before);
  const copy=living.snapshot();copy.attention=123;assert(living.snapshot().attention<=1);
  const kinds:PresenceEvent[]=['file','edit','selection','scroll','save','errorsCleared','taskStart','taskSuccess','taskFailure','taskEnd','debugStart','debugStop','return','touch','pointer'];
  for(let i=0;i<5000;i++)living.observe(kinds[i%kinds.length],41000+i);
  for(const key of ['energy','attention','curiosity'] as const)assert(living.snapshot()[key]>=0&&living.snapshot()[key]<=1);
});
test('presence expressions cannot replace a model task or its terminal response',()=>{
  let now=0;const expression=new ExpressionController(()=>{},()=>now),brain=new Brain();
  const response={state:'curious' as const,reason:'Document changed',message:''};
  assert(expression.react(response));
  const event={source:'vscode' as const,requestId:'a',state:'received' as const,message:''};brain.observe(event);expression.observe(brain.snapshot(),event);
  assert.equal(expression.snapshot().state,'acknowledge');assert.equal(expression.react(response),false);
  const done={source:'vscode' as const,requestId:'a',state:'completed' as const,message:''};brain.observe(done);expression.observe(brain.snapshot(),done);
  assert.equal(expression.react(response),false);now=1700;expression.tick();assert(expression.react(response));
});
test('ambient pose modifiers are bounded, reuse their output and follow the pointer smoothly through the rig',()=>{
  for(const energy of [0,.5,1])for(const attention of [0,.5,1])for(const age of [0,.1,1,10,100]){
    const pose=sampleMotion('hover',age,age);
    assert.equal(applyPresence({energy,attention,curiosity:.5},age,{x:9,y:-9},pose),pose);
    assert(Object.values(pose).every(Number.isFinite));assert(Math.abs(pose.gazeX)<=3&&Math.abs(pose.gazeY)<=1.8);
    assert(pose.wingSpeed>0&&pose.scale>.9&&pose.scale<1.1);
  }
});
