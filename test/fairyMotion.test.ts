import test from 'node:test';
import assert from 'node:assert/strict';

const {motions, sampleMotion, samplePreviewMotion, createRig, stepRig, nearestAngle, frameRate} = require('../../media/fairy-motion.js');
import {motionCatalog, motionIds} from '../src/core/motionCatalog';
import {renderNaviWebview} from '../src/ui/webviewContent';

test('all 110 motions produce distinct poses with finite, bounded positions', () => {
  assert.equal(motions.length, 110);
  assert.equal(new Set(motions.map((motion: {id: string}) => motion.id)).size, 110);
  const signatures = new Set<string>();
  for (const motion of motions) {
    signatures.add(JSON.stringify(sampleMotion(motion.id, motion.duration * .37, 2)));
    for (let step = 0; step <= 100; step++) {
      const pose = sampleMotion(motion.id, motion.duration * step / 100, step / 10);
      for (const value of Object.values(pose)) assert(Number.isFinite(value));
      assert(Math.abs(pose.x) < 44 && Math.abs(pose.y) < 51);
      assert(pose.scale > .9 && pose.scale < 1.1);
      assert(pose.wingSpeed > 0 && pose.wingAmplitude > 0);
    }
  }
  assert.equal(signatures.size, 110, 'Every motion must have a distinct pose');
});

test('browser and host share the complete categorized catalogue', () => {
  assert.deepEqual(motionCatalog, motions.map(({id,label,category,duration}: typeof motionCatalog[number]) => ({id,label,category,duration})));
  assert.equal(motionIds.size, 110);
  assert.equal(new Set(motions.map((m: {label:string})=>m.label)).size,110);
  assert.equal(new Set(motions.map((m: {category:string})=>m.category)).size,10);
  const idle = require('../../media/fairy-motion.js').idleMotionIds;
  const contextual=new Set(['greet','listen','think','hint','celebrate','rest',...motions.filter((motion:{category:string})=>motion.category==='Begrüßungen').map((motion:{id:string})=>motion.id)]);
  const expected=motions.filter((motion:{id:string})=>!contextual.has(motion.id)).map((motion:{id:string})=>motion.id);
  assert.equal(idle.length,94);
  assert.deepEqual(idle,expected);
  for (const id of idle) assert(motionIds.has(id));
});

test('preview animation has a measurable time course beyond passive hover',()=>{
  for(const motion of motions){
    const channels=['x','y','roll','yaw','wingAmplitude','wingSpread','glow','scatter'];
    const samples=Array.from({length:61},(_,i)=>samplePreviewMotion(motion.id,motion.duration*i/60,motion.duration*i/60));
    for(const pose of samples){for(const value of Object.values(pose))assert(Number.isFinite(value));assert(Math.abs(pose.x)<115&&Math.abs(pose.y)<125);}
    // These two intentionally calm states still have continuous wing animation.
    if(motion.id==='hover'||motion.id==='rest')continue;
    const active=samples.map((p:any,i:number)=>{
      const baseline=samplePreviewMotion('hover',motion.duration*i/60,motion.duration*i/60);
      return channels.map(key=>p[key]-baseline[key]);
    });
    const ranges=channels.map((_,index)=>Math.max(...active.map((p:number[])=>p[index]))-Math.min(...active.map((p:number[])=>p[index])));
    assert(ranges.some((range,index)=>range>(index<4?3:.1)),`No meaningful choreographic time course: ${motion.id}`);
  }
});

test('pointer motion remains visible throughout selected animation previews',()=>{
  for(const id of ['hover','rest','figure8','curious']){
    const motion=motions.find((item:{id:string})=>item.id===id)!;
    const age=motion.duration*.4,elapsed=3.2;
    const center=samplePreviewMotion(id,age,elapsed,{x:0,y:0});
    const pointer=samplePreviewMotion(id,age,elapsed,{x:1,y:-1});
    assert.notEqual(pointer.yaw,center.yaw,`${id} should follow horizontal pointer motion`);
    assert.notEqual(pointer.gazeX,center.gazeX,`${id} should follow horizontal pointer motion`);
    assert.notEqual(pointer.gazeY,center.gazeY,`${id} should follow vertical pointer motion`);
  }
});

test('companion keeps direct game controls visible and explains native platform requirements',()=>{
  const resources={cspSource:'vscode-resource:',nonce:'test',styleUri:'style.css',motionUri:'motion.js',scriptUri:'fairy.js',animationEnabled:true,overlaySupported:true};
  const html=renderNaviWebview(resources);
  for(const mode of ['catch','chase','hide'])assert(html.includes(`data-game-mode="${mode}"`));
  assert(html.includes('id="stop-game"'));
  const unsupported=renderNaviWebview({...resources,overlaySupported:false});
  assert.match(unsupported,/<section class="game-controls"[^>]*>/);
  assert.match(unsupported,/<p class="game-support"[^>]*>Mausspiele benötigen das Windows-x64/);
});

test('all motion pairs transition smoothly without reallocating the rig', () => {
  for (const from of motions) {
    const start=sampleMotion(from.id,from.duration*.37,2);
    for (const to of motions) {
      const rig=createRig(start);
      const pose=stepRig(rig,sampleMotion(to.id,to.duration*.63,2),1/60);
      assert(Math.abs(pose.x-start.x)<1 && Math.abs(pose.y-start.y)<1,`${from.id} -> ${to.id}`);
      assert(Math.abs(pose.roll-start.roll)<5 && Math.abs(pose.scale-start.scale)<.01);
      for (const value of Object.values(pose)) assert(Number.isFinite(value));
    }
  }
});

test('spring settling is independent of refresh rate for a fixed target', () => {
  const start = sampleMotion('hover', 0, 0);
  const target = sampleMotion('listen', 1, 1);
  const outcomes = [30, 60, 120].map(hz => {
    const rig = createRig(start);
    let pose;
    for (let frame = 0; frame < hz; frame++) pose = stepRig(rig, target, 1 / hz);
    return pose;
  });
  for (const key of Object.keys(start)) {
    assert(Math.abs(outcomes[0][key] - outcomes[1][key]) < 1e-10, key);
    assert(Math.abs(outcomes[1][key] - outcomes[2][key]) < 1e-10, key);
  }
});

test('changing motion preserves position and velocity instead of snapping', () => {
  for (const motion of motions) {
    const start = sampleMotion('hover', 0, 0);
    const rig = createRig(start);
    const pose = stepRig(rig, sampleMotion(motion.id, motion.duration * .4, 1), 1 / 60);
    assert(Math.abs(pose.x - start.x) < 1);
    assert(Math.abs(pose.y - start.y) < 1);
    assert(Math.abs(pose.roll - start.roll) < 5);
    assert(Math.abs(pose.scale - start.scale) < .01);
  }
});

test('full turns continue through the angle boundary without reversing', () => {
  assert.equal(nearestAngle(359, 1), 361);
  assert.equal(nearestAngle(361, 359), 359);
  const start = sampleMotion('hover', 0, 0);
  start.roll = 358;
  const target = {...start, roll: 2};
  const rig = createRig(start);
  const pose = stepRig(rig, target, 1 / 60);
  assert(pose.roll > 358 && pose.roll < 362);
});

test('paused and delayed frames cannot jump or destabilize the rig', () => {
  const start = sampleMotion('hover', 0, 0);
  const target = sampleMotion('figure8', 2, 2);
  const rig = createRig(start);
  assert.deepEqual(stepRig(rig, target, 0), start);
  const longFrame = stepRig(createRig(start), target, 60);
  assert.deepEqual(longFrame, stepRig(createRig(start), target, .1));
  for (const value of Object.values(longFrame)) assert(Number.isFinite(value));
});


test('explicit drawing budgets stay low on high-refresh displays', () => {
  assert.equal(frameRate('hover'), 15);
  assert.equal(frameRate('listen', true), 12);
  assert.equal(frameRate('figure8'), 30);
  assert.equal(frameRate('celebrate', true), 24);
  assert.equal(frameRate('rest'), 10);
  assert.equal(frameRate('rest', false, .2), 30);
  assert.equal(frameRate('rest', false, 1), 10);
});

test('idle scheduling waits for quiet periods and blocks while requests or bubbles are active', () => {
  const {shouldScheduleIdle, chooseIdleMotion} = require('../../media/fairy-motion.js');
  assert.equal(shouldScheduleIdle({hostVisible:true, hostFocused:true, busy:false, bubbleVisible:false, bubblePriority:0, lastInteractionAt:0, now:10000}), true);
  assert.equal(shouldScheduleIdle({hostVisible:true, hostFocused:true, busy:true, bubbleVisible:false, bubblePriority:0, lastInteractionAt:0, now:10000}), false);
  assert.equal(shouldScheduleIdle({hostVisible:true, hostFocused:true, busy:false, bubbleVisible:true, bubblePriority:2, lastInteractionAt:0, now:10000}), false);
  assert.equal(shouldScheduleIdle({hostVisible:true, hostFocused:true, busy:false, bubbleVisible:true, bubblePriority:1, lastInteractionAt:0, now:10000}), true);
  assert.equal(shouldScheduleIdle({hostVisible:true, hostFocused:true, busy:false, bubbleVisible:false, bubblePriority:0, lastInteractionAt:7000, now:10000}), false);
  assert.equal(shouldScheduleIdle({hostVisible:true, hostFocused:true, busy:false, bubbleVisible:false, bubblePriority:0, lastInteractionAt:5000, now:10000, minIdleGapMs:5000}), true);
  assert.equal(shouldScheduleIdle({hostVisible:false, hostFocused:true, busy:false, bubbleVisible:false, bubblePriority:0, lastInteractionAt:0, now:10000}), false);
  assert.equal(shouldScheduleIdle({hostVisible:true, hostFocused:false, busy:false, bubbleVisible:false, bubblePriority:0, lastInteractionAt:0, now:10000}), false);
  const choice = chooseIdleMotion('drift', ['drift','curious','stretch']);
  assert.notEqual(choice, 'drift');
  assert(['curious','stretch'].includes(choice));
  assert.equal(chooseIdleMotion('curious', ['curious']), 'curious');
});

test('idle priorities prefer active motion over passive resting states', () => {
  const {motionPriority} = require('../../media/fairy-motion.js');
  assert(motionPriority.greet > motionPriority.listen);
  assert(motionPriority.listen > motionPriority.rest);
  assert(motionPriority.rest > motionPriority.hover);
  assert(motionPriority.drift > motionPriority.hover);
});

test('pose and spring outputs can be reused by the rendering loop', () => {
  const target = {};
  assert.equal(sampleMotion('hover', 0, 0, undefined, target), target);
  const rig = createRig();
  const first = stepRig(rig, target, 1 / 30);
  const second = stepRig(rig, sampleMotion('listen', 1, 1, undefined, target), 1 / 30);
  assert.equal(first, second);
});
