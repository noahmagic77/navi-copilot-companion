'use strict';
// Original, deterministic additive synthesis. No recordings, voices or downloads.
const fs=require('node:fs');
const path=require('node:path');
const rate=22050;
const cues=['greeting','discover','hint','celebrate'];
function synthesize(cue,variant=0){
 if(!cues.includes(cue))throw Error('Unknown cue');
 const duration=cue==='celebrate'?.72:.52;
 const samples=Math.ceil(duration*rate),pcm=Buffer.alloc(samples*2);
 let phase=0,noise=731+variant*109;
 for(let i=0;i<samples;i++){
  const t=i/rate,u=t/duration;
  const envelope=Math.min(1,t/.025)*Math.min(1,(duration-t)/.12)*Math.sin(Math.PI*u)**.5;
  const base=(cue==='discover'?360:cue==='hint'?520:440)+variant*38;
  const pitch=base*(1+(cue==='discover'?-.12:.2)*u+.025*Math.sin(t*38));
  phase+=2*Math.PI*pitch/rate;
  const f1=cue==='discover'?430:650-180*u,f2=cue==='discover'?1200:1900+500*u;
  let voice=0;
  for(let harmonic=1;harmonic<=16;harmonic++){
   const frequency=pitch*harmonic;
   const resonance=.12/harmonic+Math.exp(-(((frequency-f1)/210)**2))*.5+Math.exp(-(((frequency-f2)/330)**2))*.25;
   voice+=Math.sin(phase*harmonic)*resonance;
  }
  noise=(Math.imul(noise,1664525)+1013904223)>>>0;
  const breath=(noise/4294967296*2-1)*.045*Math.exp(-t*28);
  const note=Math.floor(t/.15);
  const chime=Math.sin(2*Math.PI*(880+variant*55)*[1,1.25,1.5,2,2][Math.min(note,4)]*t)*.12*Math.sin(Math.PI*(t%.15)/.15)**2;
  const value=(voice*.28+breath+(cue==='celebrate'||cue==='hint'?chime:chime*.3))*envelope;
  pcm.writeInt16LE(Math.round(Math.max(-.75,Math.min(.75,value))*32767),i*2);
 }
 const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
 // Normalize quiet voice-like cues consistently, retaining headroom for playback.
 let peak=0;for(let i=0;i<pcm.length;i+=2)peak=Math.max(peak,Math.abs(pcm.readInt16LE(i)));
 const gain=peak>0?.68*32767/peak:1;
 for(let i=0;i<pcm.length;i+=2)pcm.writeInt16LE(Math.round(pcm.readInt16LE(i)*gain),i);
 return Buffer.concat([header,pcm]);
}
if(require.main===module){
 for(const cue of cues)for(let variant=0;variant<3;variant++){
  const data=synthesize(cue,variant);
  for(const folder of ['media/sounds','native/overlay/assets/sounds']){
   const file=path.join(__dirname,'..',folder,`${cue}-${variant}.wav`);
   if(process.argv.includes('--check')){if(!fs.readFileSync(file).equals(data))throw Error('Stale audio: '+file);}
   else {fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
  }
 }
}
module.exports={cues,synthesize};
