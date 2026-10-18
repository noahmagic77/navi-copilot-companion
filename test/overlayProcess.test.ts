import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import type {ChildProcessWithoutNullStreams} from 'node:child_process';
import {OverlayProcess} from '../src/overlay/overlayProcess';

function fakeChild() {
  const child = new EventEmitter() as EventEmitter & {stdin:PassThrough;stdout:PassThrough;stderr:PassThrough;kill:()=>boolean};
  child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();
  child.kill=()=>{queueMicrotask(()=>child.emit('close',0));return true;};
  child.stdin.on('finish',()=>queueMicrotask(()=>child.emit('close',0)));
  return {child,typed:child as unknown as ChildProcessWithoutNullStreams};
}

test('editor anchor status is forwarded only from a ready live helper with validated geometry',async()=>{
  const {child,typed}=fakeChild();const reports:unknown[]=[];
  const bridge=new OverlayProcess(()=>{},()=>typed,undefined,undefined,undefined,undefined,undefined,state=>reports.push(state));
  const start=bridge.start('helper.exe',123);
  const state={type:'editorAnchor',id:3,status:'arrived',x:10,y:20,coreX:10,coreY:20};
  child.stdout.write(JSON.stringify(state)+'\n');assert.equal(reports.length,0);
  child.stdout.write('{"type":"ready"}\n');await start;
  child.stdout.write(JSON.stringify({...state,coreX:'bad'})+'\n');assert.equal(reports.length,0);
  child.stdout.write(JSON.stringify({...state,extra:'not part of the geometry projection'})+'\n');
  const {type,...geometry}=state;assert.deepEqual(reports,[geometry]);
  bridge.stop();child.stdout.write(JSON.stringify(state)+'\n');assert.equal(reports.length,1);
});

test('game and direct-interaction priorities accept only a ready current helper',async()=>{
  const {child,typed}=fakeChild();const states:string[]=[];
  const bridge=new OverlayProcess(()=>{},()=>typed,()=>{},()=>{},()=>{},()=>{},state=>states.push(state));
  const pending=bridge.start('helper.exe',123);
  child.stdout.write('{"type":"gameStarted"}\n');assert.deepEqual(states,[]);
  child.stdout.write('{"type":"ready"}\n');await pending;
  for(const type of ['gameStarted','interaction','gameStopped','actions'])child.stdout.write(JSON.stringify({type})+'\n');
  assert.deepEqual(states,['gameStarted','interaction','gameStopped','actions']);
  bridge.stop();child.stdout.write('{"type":"actions"}\n');assert.equal(states.length,4);
});

test('concurrent starts share one helper and typed control pipe',async()=>{
  const {child,typed}=fakeChild();let launches=0;const failures:Error[]=[];const wire:string[]=[];
  child.stdin.on('data',chunk=>wire.push(chunk.toString()));
  const bridge=new OverlayProcess(error=>failures.push(error),(_file,args)=>{launches++;assert.deepEqual(args,['--host-pid','123']);return typed;});
  const first=bridge.start('helper.exe',123),second=bridge.start('helper.exe',123);
  child.stdout.write('{"type":"ready"}\n');await Promise.all([first,second]);
  assert.equal(launches,1);assert(bridge.running);
  bridge.send({type:'focus',focused:true});bridge.send({type:'motion',motion:'greet'});bridge.stop();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(wire.map(line=>JSON.parse(line)),[{type:'focus',focused:true},{type:'motion',motion:'greet'},{type:'stop'}]);
  assert.equal(bridge.running,false);assert.equal(failures.length,0);
});

test('startup failures reject once without a second crash notification',async()=>{
  const {child,typed}=fakeChild();const failures:Error[]=[];const bridge=new OverlayProcess(error=>failures.push(error),()=>typed);
  const start=bridge.start('helper.exe',123);const rejection=assert.rejects(start,/render failed/);
  child.stderr.write('render failed');child.emit('close',1);await rejection;
  assert.equal(failures.length,0);assert.equal(bridge.running,false);
});

test('target coordinates and cancellation cross the control pipe without file or prompt contents',async()=>{
  const {child,typed}=fakeChild();const wire:string[]=[];
  child.stdin.on('data',chunk=>wire.push(chunk.toString()));
  const bridge=new OverlayProcess(()=>{},()=>typed);
  const start=bridge.start('helper.exe',123);child.stdout.write('{"type":"ready"}\n');await start;
  bridge.send({type:'target',x:0,y:1});bridge.send({type:'cancelTarget'});bridge.send({type:'startGame',mode:'hide'});bridge.send({type:'stopGame'});bridge.stop();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(wire.map(line=>JSON.parse(line)),[{type:'target',x:0,y:1},{type:'cancelTarget'},{type:'startGame',mode:'hide'},{type:'stopGame'},{type:'stop'}]);
});

test('native game invitations are forwarded only from the live ready helper',async()=>{
  const {child,typed}=fakeChild();let invitations=0;
  const bridge=new OverlayProcess(()=>{},()=>typed,undefined,undefined,()=>invitations++);
  child.stdout.write('{"type":"gameInvite"}\n');
  const start=bridge.start('helper.exe',123);child.stdout.write('{"type":"ready"}\n');await start;
  child.stdout.write('{"type":"gameInvite"}\n');
  assert.equal(invitations,1);
  bridge.stop();
  child.stdout.write('{"type":"gameInvite"}\n');
  assert.equal(invitations,1);
  await new Promise(resolve=>setImmediate(resolve));
});

test('native pointer events expose only valid window-local geometry and clear on loss',async()=>{
  const {child,typed}=fakeChild();const points:({x:number;y:number}|null)[]=[];
  const bridge=new OverlayProcess(()=>{},()=>typed,undefined,undefined,undefined,point=>points.push(point));
  const start=bridge.start('helper.exe',123);child.stdout.write('{"type":"ready"}\n');await start;
  child.stdout.write('{"type":"pointer","x":320.5,"y":140.25}\n{"type":"pointer","x":"bad","y":4}\n{"type":"pointerLost"}\n');
  assert.deepEqual(points,[{x:320.5,y:140.25},null]);
  bridge.stop();await new Promise(resolve=>setImmediate(resolve));
});

test('helper diagnostics are forwarded while the process is running',async()=>{
  const {child,typed}=fakeChild();const diagnostics:string[]=[];
  const bridge=new OverlayProcess(()=>{},()=>typed,message=>diagnostics.push(message));
  const start=bridge.start('helper.exe',123);child.stdout.write('{"type":"ready"}\n');await start;
  child.stderr.write('SetTimer failed; retrying: unavailable\n');
  assert.deepEqual(diagnostics,['SetTimer failed; retrying: unavailable']);
  bridge.stop();
  await new Promise(resolve=>setImmediate(resolve));
});

test('native audio failures trigger a bounded fallback only for the live helper',async()=>{
  const {child,typed}=fakeChild();const sounds:string[]=[];
  const bridge=new OverlayProcess(()=>{},()=>typed,()=>{},cue=>sounds.push(cue));
  child.stdout.write('{"type":"soundFailed","cue":"hint"}\n');
  const start=bridge.start('helper.exe',123);child.stdout.write('{"type":"ready"}\n');await start;
  child.stdout.write('{"type":"soundFailed","cue":"greeting"}\n{"type":"soundFailed","cue":"../bad"}\n');
  assert.deepEqual(sounds,['greeting']);bridge.stop();
  child.stdout.write('{"type":"soundFailed","cue":"hint"}\n');
  assert.deepEqual(sounds,['greeting']);await new Promise(resolve=>setImmediate(resolve));
});

test('unexpected exit is reported once and does not restart in a loop',async()=>{
  const {child,typed}=fakeChild();const failures:Error[]=[];let launches=0;
  const bridge=new OverlayProcess(error=>failures.push(error),()=>{launches++;return typed;});
  const start=bridge.start('helper.exe',123);child.stdout.write('{"type":"ready"}\n');await start;
  child.emit('close',2);assert.equal(failures.length,1);assert.equal(launches,1);assert.equal(bridge.running,false);
});

test('stopping during startup is quiet and leaves no running helper',async()=>{
  const {typed}=fakeChild();const failures:Error[]=[];const bridge=new OverlayProcess(error=>failures.push(error),()=>typed);
  const start=bridge.start('helper.exe',123);bridge.stop();await start;
  assert.equal(failures.length,0);assert.equal(bridge.running,false);
  bridge.send({type:'focus',focused:true});
});
