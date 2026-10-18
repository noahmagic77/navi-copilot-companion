import test from 'node:test';
import assert from 'node:assert/strict';
import {DecisionEngine,type DecisionInput} from '../src/brain/decisions';
import {MemoryStore,type MemoryStorage} from '../src/brain/memories';
import {nextProblem,problemAtPosition,sortedProblems,problemKey,problemSetKey,validProblemRange,type Problem} from '../src/companion/problems';
import {brainDisplayData} from '../src/brain/inspection';
import {Brain} from '../src/brain/brain';
import {ExpressionController} from '../src/brain/expression';

const input=(at:number,extra:Partial<DecisionInput>={}):DecisionInput=>({at,enabled:true,focused:true,paused:false,occupied:false,problem:null,...extra});
test('companion makes space after three edits and returns after ten seconds of quiet',()=>{
  const engine=new DecisionEngine();engine.evaluate(input(0));
  engine.changed(100);engine.changed(200);
  assert.equal(engine.evaluate(input(250)).action,'wait');
  engine.changed(300);assert.equal(engine.evaluate(input(301)).action,'makeSpace');
  assert.equal(engine.evaluate(input(302)).action,'wait');
  engine.changed(2000);assert.equal(engine.evaluate(input(11999)).action,'wait');
  assert.equal(engine.evaluate(input(12000)).action,'returnHome');
  assert.equal(engine.evaluate(input(12001)).action,'wait');
});
test('focus, pause, direct actions and disabled initiative suppress without consuming candidates',()=>{
  for(const blocked of [{focused:false},{paused:true},{occupied:true},{enabled:false}]){
    const engine=new DecisionEngine();[100,200,300].forEach(at=>engine.changed(at));
    const decision=engine.evaluate(input(400,blocked));assert.equal(decision.action,'wait');assert.equal(decision.suppressed,'makeSpace');
    assert.equal(engine.evaluate(input(500)).action,'makeSpace');
  }
  const engine=new DecisionEngine();engine.changed(0);engine.changed(100);engine.changed(5101);
  assert.equal(engine.evaluate(input(5200)).action,'wait');
});
test('new error attention, quiet period, five-minute/hourly budgets and unchanged suppression',()=>{
  const engine=new DecisionEngine();
  const error=(at:number,id:string)=>input(at,{problem:id});
  assert.equal(engine.evaluate(error(0,'a')).action,'attention');
  assert.equal(engine.evaluate(error(7999,'a')).action,'wait');
  assert.equal(engine.evaluate(error(8000,'a')).action,'offerHelp');
  assert.equal(engine.evaluate(error(9000,'b')).action,'attention');
  assert.equal(engine.evaluate(error(307999,'b')).action,'wait');
  assert.equal(engine.evaluate(error(308000,'b')).action,'offerHelp');
  engine.evaluate(error(309000,'c'));assert.equal(engine.evaluate(error(608000,'c')).action,'offerHelp');
  engine.evaluate(error(609000,'d'));assert.equal(engine.evaluate(error(908000,'d')).action,'wait');
  assert.equal(engine.evaluate(error(3608000,'d')).action,'offerHelp');
  engine.evaluate(error(4000000,'a'));assert.equal(engine.evaluate(error(4000001,'a')).action,'wait');
});
test('removing an error does not count as a new error and stale clocks cannot trigger actions',()=>{
  const engine=new DecisionEngine();
  engine.evaluate(input(0,{problem:'ab',problemIds:['a','b']}));
  assert.equal(engine.evaluate(input(100,{problem:'a',problemIds:['a']})).action,'wait');
  assert.equal(engine.evaluate(input(50,{problem:'new'})).action,'wait');
  assert.equal(engine.evaluate(input(NaN)).at,100);
});
class Storage implements MemoryStorage {
  private values=new Map<string,unknown>();
  get<T>(key:string,fallback:T):T{return structuredClone((this.values.get(key)??fallback) as T);}
  async update(key:string,value:unknown):Promise<void>{this.values.set(key,structuredClone(value));}
}
test('confirmed memories survive reconstruction, isolate projects and support edit/delete/reset',async()=>{
  const global=new Storage(),projectA=new Storage(),projectB=new Storage();
  const a=new MemoryStore(global,projectA),b=new MemoryStore(global,projectB);
  await a.save('preference','Ruhige Bewegungen');await a.save('next','Tests prüfen');
  assert.equal(b.list().length,1);assert.equal(new MemoryStore(global,projectA).list().length,2);
  const task=a.list().find(item=>item.kind==='next')!;
  await a.save('next','Tests und Build prüfen',task.id);
  assert.equal(a.list().find(item=>item.id===task.id)?.text,'Tests und Build prüfen');
  const copy=a.list();copy[0].text='mutated';assert.notEqual(a.list()[0].text,'mutated');
  assert(a.list().every(item=>item.source==='user'&&Number.isFinite(Date.parse(item.confirmedAt))));
  await a.remove(task.id);assert.equal(a.list().length,1);
  await a.save('task','Build');await a.clear(true);assert.equal(a.list().length,1);
  await a.clear();assert.equal(a.list().length,0);assert.equal(b.list().length,0);
  await assert.rejects(a.save('note',' '.repeat(3)),/1 bis 500/);
  await assert.rejects(a.save('note','a'.repeat(501)),/1 bis 500/);
  await assert.rejects(a.save('note','text','missing'),/nicht mehr/);
});
const problem=(message:string,severity=0,line=0):Problem=>({uri:'file:///project/a.ts',message,severity,start:{line,character:0},end:{line,character:2}});
test('fix target follows the cursor and falls back to the first sorted problem',()=>{
  const error=problem('error',0,4),warning=problem('warning',1,2),multiline={...problem('multiline',0,8),end:{line:10,character:1}};
  assert.equal(problemAtPosition([],{line:0,character:0}),undefined);
  assert.equal(problemAtPosition([error,warning],{line:2,character:1}),warning);
  assert.equal(problemAtPosition([error,warning],{line:0,character:0}),error);
  assert.equal(problemAtPosition([error,multiline],{line:9,character:100}),multiline);
  assert.equal(problemAtPosition([error,multiline],{line:10,character:2}),error);
});
test('next problem advances, wraps and recovers after a diagnosis disappears',()=>{
  const a=problem('first'),b=problem('second',1,1),c=problem('third',1,2);
  assert.equal(nextProblem([]),undefined);
  assert.equal(nextProblem([a,b,c]),a);
  assert.equal(nextProblem([a,b,c],problemKey(a)),b);
  assert.equal(nextProblem([a,b,c],problemKey(c)),a);
  assert.equal(nextProblem([b,c],problemKey(a)),b);
  assert.equal(nextProblem([a],problemKey(a)),a);
});
test('problem ordering, immutable identity, set order independence and stale ranges',()=>{
  const a=problem('error',0,1),b=problem('warning',1,0);
  assert.deepEqual(sortedProblems([b,problem('hint',3),a]),[a,b]);
  assert.notEqual(problemKey(a),problemKey({...a,message:'changed'}));
  assert.equal(problemSetKey([a,b]),problemSetKey([b,a]));
  assert.equal(validProblemRange(a,[3,3]),true);
  assert.equal(validProblemRange(a,[3]),false);
  assert.equal(validProblemRange({...a,end:{line:1,character:9}},[3,3]),false);
  assert.equal(validProblemRange({...a,start:{line:1,character:2},end:{line:0,character:2}},[3,3]),false);
});
test('live inspection projects real decisions without editor, diagnostic or answer contents',()=>{
  const brain=new Brain();brain.editor({languageId:'ts',version:1,selection:{start:{line:0,character:0},end:{line:0,character:1}},contextKind:'line',contextText:'SECRET_CODE',diagnostics:[{severity:'error',source:null,code:null,message:'SECRET_DIAGNOSTIC',start:{line:0,character:0},end:{line:0,character:1}}]});
  const decision={action:'makeSpace' as const,at:1,reason:'Editor activity',suppressed:null};brain.decide(decision,['navi.showProblems']);
  const frame={...new ExpressionController(()=>{}).snapshot(),message:'SECRET_ANSWER'};
  const data=brainDisplayData(brain.snapshot(),frame,Array(60).fill(decision),[],'unavailable');
  assert.equal(data.decisions.length,50);assert.deepEqual(data.decision,decision);
  assert(!JSON.stringify(data).includes('SECRET'));assert.equal(data.perception.editor?.diagnostics,1);
  data.decisions[0].reason='mutated';assert.equal(decision.reason,'Editor activity');
});
