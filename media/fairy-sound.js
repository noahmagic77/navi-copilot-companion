'use strict';
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NaviSound=api;
})(globalThis,()=>{
 const cues=Object.freeze(['greeting','discover','hint','celebrate']);
 function createPlayer({baseUri,createAudio=url=>new Audio(url),now=()=>Date.now(),random=Math.random,onBlocked=()=>{}}){
  let enabled=false,volume=30,visible=true,focused=true,current=null,lastAt=-Infinity;
  const previous=new Map();
  function stop(){if(current){current.pause();current=null;}}
  function configure(state){
   if(typeof state.enabled==='boolean')enabled=state.enabled;
   if(Number.isFinite(state.volume))volume=Math.max(0,Math.min(100,state.volume));
   if(typeof state.visible==='boolean')visible=state.visible;
   if(typeof state.focused==='boolean')focused=state.focused;
   if(current)current.volume=volume/100;
   if(!enabled||volume===0||!visible||!focused)stop();
  }
  async function play(cue,{audition=false}={}){
   if(!cues.includes(cue)||(!enabled&&!audition)||volume<=0||!visible||!focused||(!audition&&now()-lastAt<1500))return false;
   let variant=Math.floor(random()*3);
   if(previous.get(cue)===variant)variant=(variant+1+Math.floor(random()*2))%3;
   lastAt=now();stop();
   const audio=createAudio(baseUri+'/'+cue+'-'+variant+'.wav');
   current=audio;audio.preload='none';audio.volume=volume/100;
   try{await audio.play();previous.set(cue,variant);return true;}
   catch(error){if(current===audio)stop();onBlocked(error);return false;}
  }
  return Object.freeze({configure,play,stop});
 }
 return Object.freeze({cues,createPlayer});
});
