import test from 'node:test';
import assert from 'node:assert/strict';
import {GreetingCycle} from '../src/core/greetingCycle';
import {greetingMotionIds, motionIds} from '../src/core/motionCatalog';

test('ten additional greetings rotate without repetition before completing a cycle',()=>{
  assert.equal(greetingMotionIds.length,10);
  const cycle=new GreetingCycle(()=>.3);
  const ids=Array.from({length:10},(_,i)=>cycle.next(i*15000));
  assert.equal(new Set(ids).size,10);
  for(const id of ids) assert(id && motionIds.has(id));
  assert.notEqual(cycle.next(150000),ids[9]);
});

test('startup, focus and rapid tab events share a fifteen-second cooldown',()=>{
  const cycle=new GreetingCycle(()=>.99);
  assert.equal(cycle.next(0),greetingMotionIds[9]);
  for(const now of [0,1,5000,14999]) assert.equal(cycle.next(now),undefined);
  assert.equal(cycle.next(15000),greetingMotionIds[8]);
  assert.equal(cycle.next(NaN),undefined);
  assert.equal(cycle.next(30000),greetingMotionIds[7]);
});

test('shuffle covers every greeting per bag and avoids repeats at bag boundaries',()=>{
  for(const random of [()=>0,()=>.5,()=>.999999]) {
    const cycle=new GreetingCycle(random);let previous:string|undefined;
    for(let bag=0;bag<5;bag++) {
      const ids=Array.from({length:10},(_,i)=>cycle.next((bag*10+i)*15000));
      assert.equal(new Set(ids).size,10);
      assert.notEqual(ids[0],previous);
      previous=ids[9];
    }
  }
  const first=new GreetingCycle(()=>0),second=new GreetingCycle(()=>.99);
  assert.notEqual(first.next(0),second.next(0));
});
