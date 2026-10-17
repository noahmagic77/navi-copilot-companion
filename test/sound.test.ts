import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {soundForMotion,isSoundCue} from '../src/core/soundPolicy';
const {synthesize,cues}=require('../../scripts/generate-audio.cjs');
const {createPlayer}=require('../../media/fairy-sound.js');

test('all twelve original audio variants are deterministic, distinct, bounded PCM WAVs',()=>{
  const hashes=new Set();
  for(const cue of cues)for(let variant=0;variant<3;variant++){
    const wave:Buffer=synthesize(cue,variant);
    assert.deepEqual(wave,synthesize(cue,variant));
    hashes.add(createHash('sha256').update(wave).digest('hex'));
    assert.equal(wave.toString('ascii',0,4),'RIFF');assert.equal(wave.toString('ascii',8,12),'WAVE');
    assert.equal(wave.readUInt32LE(4),wave.length-8);assert.equal(wave.readUInt32LE(40),wave.length-44);
    assert.equal(wave.readUInt32LE(24),22050);assert.equal(wave.readUInt16LE(22),1);assert.equal(wave.readUInt16LE(34),16);
    let energy=0,peak=0;for(let i=44;i<wave.length;i+=2){const value=wave.readInt16LE(i);assert(Math.abs(value)<25000);peak=Math.max(peak,Math.abs(value));energy+=value*value;}
    assert(peak>=22000&&peak<=22400,'Audio should have consistent audible headroom');
    assert(energy>1000000);assert.equal(wave.readInt16LE(44),0);assert(Math.abs(wave.readInt16LE(wave.length-2))<10);
  }
  assert.equal(hashes.size,12);
});

test('sounds are limited to meaningful events, not continuous flight frames',()=>{
  assert.equal(soundForMotion('greet-wave'),'greeting');assert.equal(soundForMotion('curious'),'discover');
  assert.equal(soundForMotion('hint'),'hint');assert.equal(soundForMotion('celebrate'),'celebrate');
  for(const id of ['hover','drift','think','listen','rest','spiral-home'])assert.equal(soundForMotion(id),undefined);
  assert(!isSoundCue('../file'));assert(!isSoundCue(null));
});

function playerFixture(){
  let clock=0;const created:any[]=[];
  const player=createPlayer({baseUri:'local/sounds',now:()=>clock,random:()=>0,createAudio:(url:string)=>{
    const audio={url,volume:0,paused:false,play:async()=>{},pause(){this.paused=true;}};created.push(audio);return audio;
  }});
  return {player,created,advance:()=>{clock+=1600;}};
}
test('webview playback respects opt-in, volume, cooldown, visibility and focus',async()=>{
  const {player,created,advance}=playerFixture();
  assert.equal(await player.play('greeting'),false);assert.equal(created.length,0);
  player.configure({enabled:true,volume:30});assert(await player.play('greeting'));assert.equal(created[0].volume,.3);
  assert.equal(await player.play('hint'),false);advance();assert(await player.play('greeting'));
  assert.notEqual(created[0].url,created[1].url);assert(created[0].paused);
  player.configure({volume:0});assert(created[1].paused);advance();assert.equal(await player.play('hint'),false);
  player.configure({volume:50,visible:false});assert.equal(await player.play('hint'),false);
  player.configure({visible:true,focused:false});assert.equal(await player.play('hint'),false);
  player.configure({focused:true});assert(await player.play('hint'));
  player.configure({enabled:false});assert(created[2].paused);
  assert.equal(await player.play('../bad'),false);
});

test('autoplay rejection is contained and reported once without an unhandled promise',async()=>{
  let blocked=0;let paused=false;
  const player=createPlayer({baseUri:'local',onBlocked:()=>blocked++,createAudio:()=>({play:()=>Promise.reject(Error('NotAllowed')),pause:()=>{paused=true;}})});
  player.configure({enabled:true});assert.equal(await player.play('hint'),false);assert.equal(blocked,1);assert(paused);
});

test('explicit audition works with automatic cues off, without enabling them or bypassing mute/focus',async()=>{
  const {player,created}=playerFixture();
  assert(await player.play('greeting',{audition:true}));
  assert(await player.play('hint',{audition:true}));assert(created[0].paused);
  assert.equal(await player.play('discover'),false);
  player.configure({volume:0});assert.equal(await player.play('hint',{audition:true}),false);
  player.configure({volume:30,focused:false});assert.equal(await player.play('hint',{audition:true}),false);
  player.configure({focused:true,visible:false});assert.equal(await player.play('hint',{audition:true}),false);
});
