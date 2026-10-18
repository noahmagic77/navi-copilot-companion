'use strict';
// Real Chromium DOM/rendering with a controllable animation clock; no product test hooks.
const fs=require('node:fs');
const path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const {renderNaviWebview}=require('../dist/src/ui/webviewContent.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'build/animation-catalogue');
fs.mkdirSync(out,{recursive:true});
const nonce='navi-catalogue-check',uri=name=>pathToFileURL(path.join(root,'media',name)).href;
let scriptUri=uri('fairy.js');
if(process.env.NAVI_ANIMATION_BASELINE==='1'){
 const original=path.join(out,'baseline-fairy.js');fs.writeFileSync(original,execFileSync('git',['show','b89d777:media/fairy.js']));scriptUri=pathToFileURL(original).href;
}
const html=renderNaviWebview({cspSource:'file:',nonce,styleUri:uri('fairy.css'),motionUri:uri('fairy-motion.js'),scriptUri,soundScriptUri:uri('fairy-sound.js'),soundBaseUri:uri('sounds'),animationEnabled:true,overlaySupported:true});
const mock=`<script nonce="${nonce}">
window.__messages=[];function acquireVsCodeApi(){return {postMessage(message){window.__messages.push(message)}};}
let clock=0,serial=0;const frames=new Map();
window.requestAnimationFrame=callback=>{frames.set(++serial,callback);return serial};window.cancelAnimationFrame=id=>frames.delete(id);
Date.now=()=>1800000000000+clock;
window.__advance=seconds=>{const steps=Math.ceil(seconds*60);for(let i=0;i<steps;i++){clock+=1000/60;const batch=[...frames.values()];frames.clear();for(const callback of batch)callback(clock)}};
</script>`;
const page=path.join(out,'catalogue.html');fs.writeFileSync(page,html.replace('</head>',mock+'</head>'));
const edge=process.env.NAVI_CHROMIUM||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':'google-chrome'),port=19390;
const browser=spawn(edge,['--headless=new',...(process.env.CI?['--no-sandbox']:[]),'--mute-audio',`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(out,'profile')}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
browser.on('error',error=>{console.error(error);process.exitCode=1;});
const timeout=setTimeout(()=>{console.error('Animation catalogue browser test timed out');browser.kill();process.exit(1);},120000);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));let socket;
async function main(){
 let pages;for(let i=0;i<80;i++){try{pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(pages.length)break;}catch{}await delay(100);}
 assert(pages?.length,'Chromium did not start');socket=new WebSocket(pages.find(page=>page.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let serial=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);if(message.id){const request=pending.get(message.id);pending.delete(message.id);if(message.error)request.reject(Error(JSON.stringify(message.error)));else request.resolve(message.result);}});
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await command('Runtime.enable');await command('Page.enable');await command('Emulation.setDeviceMetricsOverride',{width:420,height:1100,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:pathToFileURL(page).href});
 for(let i=0;i<80;i++){if(await evaluate(`document.getElementById('motion-choice')?.options.length===111`))break;await delay(100);}
 const report={clock:'controlled requestAnimationFrame; actual Chromium DOM and CSS',motions:[],errors};
 await evaluate(`window.sendExpression=(state,engaged=false)=>window.dispatchEvent(new MessageEvent('message',{data:{type:'expression',state,engaged,age:0,source:'manual'}}));window.selectMotion=id=>{const choice=document.getElementById('motion-choice');choice.value=id;choice.dispatchEvent(new Event('change'))};window.sendExpression('welcoming');`);
 assert(await evaluate(`!document.getElementById('motion-choice').disabled`),'An ambient expression blocks explicit preview selection');
 const motions=await evaluate(`NaviMotion.motions.map(({id,duration})=>({id,duration}))`);assert.equal(motions.length,110);
 for(const motion of motions){
  const result=await evaluate(`(()=>{
   const id=${JSON.stringify(motion.id)},duration=${motion.duration};selectMotion(id);const samples=[];
   for(let i=0;i<12;i++){
    __advance(duration/5);if(i===2)sendExpression('curious');if(i===3)sendExpression('idle');
    const scene=document.getElementById('fairy-scene'),body=document.querySelector('.fairy-float'),halo=document.querySelector('.core-halo'),matrix=new DOMMatrix(getComputedStyle(body).transform);
    samples.push({id:scene.dataset.animation,selected:document.getElementById('motion-choice').value,x:matrix.m41,y:matrix.m42,body:body.style.transform,wing:document.querySelector('.wing').style.transform,halo:halo.style.transform,progress:document.getElementById('motion-progress').value});
   }
   return {id,samples,nativePacket:__messages.some(message=>message.motion===id&&message.preview===true)};
  })()`);
  assert(result.samples.every(s=>s.id===motion.id&&s.selected===motion.id),`Preview interrupted: ${motion.id}`);
  assert(result.nativePacket,`Native preview packet missing: ${motion.id}`);
  assert(new Set(result.samples.map(s=>s.wing)).size>=8,`Wings not advancing: ${motion.id}`);
  assert(new Set(result.samples.map(s=>s.body+s.halo)).size>=8,`Body/light frozen: ${motion.id}`);
  assert(result.samples.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.y)&&s.progress>=0&&s.progress<=1),`Invalid rendered frame: ${motion.id}`);
  assert(result.samples.slice(5).some((s,i)=>i>0&&s.progress<result.samples[i+4].progress),`Second preview cycle froze: ${motion.id}`);
  report.motions.push({id:motion.id,bodyTravelPixels:Math.hypot(...['x','y'].map(axis=>Math.max(...result.samples.map(s=>s[axis]))-Math.min(...result.samples.map(s=>s[axis])))),wingFrames:new Set(result.samples.map(s=>s.wing)).size,repeats:true,survivesAmbient:true});
  if(report.motions.length%10===0)console.log(`Rendered ${report.motions.length}/110 animations`);
 }
 const sequence=await evaluate(`(()=>{
  sendExpression('idle');selectMotion('auto');const start=__messages.length;document.getElementById('preview-all').click();
  for(const motion of NaviMotion.motions){
   if(document.getElementById('fairy-scene').dataset.animation!==motion.id)throw Error('Play-all lost its current clip: '+motion.id);
   sendExpression('attentive');const remaining=motion.duration*(1-document.getElementById('motion-progress').value);__advance(remaining+.12);sendExpression('idle');
  }
  return {ids:__messages.slice(start).filter(message=>message.type==='motion'&&message.preview).map(message=>message.motion),selection:document.getElementById('motion-choice').value};
 })()`);
 assert.deepEqual(sequence.ids,motions.map(m=>m.id),'Play-all skipped or repeated animations');assert.equal(sequence.selection,'auto');report.completeSequence=true;
 const priorities=await evaluate(`(()=>{
  sendExpression('pleased');selectMotion('figure8');__advance(.5);sendExpression('welcoming');document.getElementById('preview-all').click();
  const restored=document.getElementById('fairy-scene').dataset.animation===NaviExpression.profiles.welcoming.motion;
  selectMotion('figure8');sendExpression('working',true);const busy=document.getElementById('motion-choice').disabled&&document.getElementById('motion-choice').value==='auto'&&document.getElementById('fairy-scene').dataset.animation==='think';
  sendExpression('idle');selectMotion('gesture-wave');__advance(.5);document.getElementById('toggle-animation').click();const before=document.querySelector('.fairy-float').style.transform;__advance(2);const paused=before===document.querySelector('.fairy-float').style.transform;document.getElementById('toggle-animation').click();__advance(.5);
  const resumed=before!==document.querySelector('.fairy-float').style.transform;
  window.dispatchEvent(new MessageEvent('message',{data:{type:'visibility',visible:false}}));const hiddenBody=document.querySelector('.fairy-float').style.transform;__advance(2);const hidden=hiddenBody===document.querySelector('.fairy-float').style.transform;
  const packets=__messages.length;window.dispatchEvent(new MessageEvent('message',{data:{type:'visibility',visible:true}}));__advance(.5);
  const returns=__messages.slice(packets).some(message=>message.motion==='gesture-wave'&&message.preview)&&hiddenBody!==document.querySelector('.fairy-float').style.transform;
  return {restored,busy,paused,resumed,hidden,returns};
 })()`);
 for(const [key,value] of Object.entries(priorities))assert(value,`Preview priority/lifecycle failed: ${key}`);report.priorities=priorities;
 const idle=await evaluate(`(()=>{sendExpression('idle');selectMotion('auto');__advance(12);const early=document.getElementById('fairy-scene').dataset.animation;__advance(80);return {early,late:document.getElementById('fairy-scene').dataset.animation}})()`);
 assert.notEqual(idle.early,'rest','Idle catalogue stopped after only nine seconds');assert.equal(idle.late,'rest');report.restAfter90Seconds=true;
 assert.equal(errors.length,0,JSON.stringify(errors));report.success=true;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({success:true,motions:report.motions.length,completeSequence:true,priorities,restAfter90Seconds:true}));
}
main().catch(error=>{console.error(error);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({success:false,error:String(error)},null,2)+'\n');process.exitCode=1;}).finally(()=>{clearTimeout(timeout);socket?.close();browser.kill();});
