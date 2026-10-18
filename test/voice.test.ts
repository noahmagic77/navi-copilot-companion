import test from 'node:test';
import assert from 'node:assert/strict';
import {VoiceController,parseVoiceCommand,type VoiceProvider,type VoiceIntent} from '../src/integration/voice';
const metadata={name:'Existing test provider',device:'Test microphone',processing:'unknown' as const,dataPath:'Mock only; no audio',continuous:true as const};
test('voice commands accept a bounded allowlist without shell execution',()=>{
  assert.deepEqual(parseVoiceCommand(' Zur Seite! '),{action:'aside'});
  assert.deepEqual(parseVoiceCommand('Komm zurück'),{action:'return'});
  assert.deepEqual(parseVoiceCommand('Zeig das nächste Problem.'),{action:'problem'});
  assert.deepEqual(parseVoiceCommand('Öffne Datei App.ts'),{action:'openFile',name:'App.ts'});
  assert.deepEqual(parseVoiceCommand('Nicht mehr zuhören'),{action:'stopListening'});
  assert.equal(parseVoiceCommand('Starte PowerShell und lösche Dateien'),null);
  assert.equal(parseVoiceCommand('constructor'),null);assert.equal(parseVoiceCommand('__proto__'),null);
  assert.equal(parseVoiceCommand('Öffne Datei '+'x'.repeat(301)),null);
});
test('no microphone starts without a registered provider; metadata is required',async()=>{
  const status:string[]=[];const voice=new VoiceController(async()=>{},(_on,reason)=>status.push(reason));
  await voice.start();assert.match(status.at(-1)!,/Kein unterstützter/);assert.equal(voice.metadata,undefined);
  assert.throws(()=>voice.register({metadata:{...metadata,device:''},async start(){},async stop(){}}),/Ungültiger/);
});
test('registered provider routes final commands, stops on error and ignores late transcripts',async()=>{
  const commands:VoiceIntent[]=[];let handlers:Parameters<VoiceProvider['start']>[0]|undefined;let stops=0;
  const voice=new VoiceController(async intent=>{commands.push(intent);},()=>{});
  const registration=voice.register({metadata,async start(callbacks){handlers=callbacks;},async stop(){stops++;}});
  await voice.start();handlers!.transcript('Zur Seite');assert.equal(commands.length,1);
  await voice.stop('Focus lost');handlers!.transcript('Komm zurück');assert.equal(commands.length,1);assert.equal(stops,1);
  await voice.start();handlers!.error(new Error('offline'));await new Promise(resolve=>setImmediate(resolve));assert.equal(stops,2);
  handlers!.transcript('Zur Seite');assert.equal(commands.length,1);
  registration.dispose();assert.equal(voice.metadata,undefined);
});
test('stopping during delayed activation cannot revive listening',async()=>{
  let release!:()=>void;let entered!:()=>void;const started=new Promise<void>(resolve=>entered=resolve);
  let stops=0;const states:boolean[]=[];
  const voice=new VoiceController(async()=>{},state=>states.push(state));
  voice.register({metadata,start:()=>{entered();return new Promise<void>(resolve=>release=resolve);},async stop(){stops++;}});
  const pending=voice.start();await started;await voice.stop('Focus lost');release();await pending;
  assert.equal(states.at(-1),false);assert.equal(stops,2);
});

test('a failed microphone stop stays visibly unconfirmed and can be retried',async()=>{
  const states:{on:boolean;reason:string}[]=[];let fail=true;let starts=0;
  const voice=new VoiceController(async()=>{},(on,reason)=>states.push({on,reason}));
  voice.register({metadata,async start(){starts++;},async stop(){if(fail)throw new Error('device busy');}});
  await voice.start();await voice.stop();
  assert.equal(states.at(-1)?.on,true);assert.match(states.at(-1)!.reason,/möglicherweise aktiv/);
  await voice.start();assert.equal(starts,1);
  fail=false;await voice.stop();assert.equal(states.at(-1)?.on,false);
  await voice.start();assert.equal(starts,2);await voice.stop();
});
