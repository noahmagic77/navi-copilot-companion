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
  bridge.send({type:'target',x:0,y:1});bridge.send({type:'cancelTarget'});bridge.stop();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(wire.map(line=>JSON.parse(line)),[{type:'target',x:0,y:1},{type:'cancelTarget'},{type:'stop'}]);
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
