'use strict';
// Dependency-free runtime check of the actual Webview in installed Chromium/Edge.
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {renderNaviWebview}=require('../dist/src/ui/webviewContent.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'build/preview-runtime');
fs.mkdirSync(out,{recursive:true});
const uri=file=>pathToFileURL(path.join(root,'media',file)).href;
const nonce='navi-preview-runtime';
const html=renderNaviWebview({cspSource:'file:',nonce,styleUri:uri('fairy.css'),motionUri:uri('fairy-motion.js'),scriptUri:uri('fairy.js'),soundScriptUri:uri('fairy-sound.js'),soundBaseUri:uri('sounds'),animationEnabled:true});
const mock=`<script nonce="${nonce}">window.__naviMessages=[];function acquireVsCodeApi(){return {postMessage(message){window.__naviMessages.push(message);}};}</script>`;
const page=path.join(out,'preview.html');fs.writeFileSync(page,html.replace('</head>',mock+'</head>'));
const edge=process.env.NAVI_CHROMIUM||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port=19387;
const browser=spawn(edge,['--headless=new','--mute-audio',`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(out,'profile')}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
async function main(){
 let pages;
 for(let attempt=0;attempt<80;attempt++){try{pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(pages.length)break;}catch{}await delay(100);}
 if(!pages?.length)throw Error('Chromium did not start');
 socket=new WebSocket(pages.find(page=>page.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let id=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text+': '+message.params.exceptionDetails.exception?.description);if(message.id){const entry=pending.get(message.id);pending.delete(message.id);if(message.error)entry.reject(Error(JSON.stringify(message.error)));else entry.resolve(message.result);}});
 function command(method,params={}){return new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});socket.send(JSON.stringify({id:request,method,params}));});}
 async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
 await command('Runtime.enable');await command('Page.enable');
 await command('Emulation.setDeviceMetricsOverride',{width:420,height:1100,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:pathToFileURL(page).href});
 for(let i=0;i<80;i++){if(await evaluate(`!!window.NaviMotion && document.getElementById('fairy-scene')?.dataset.motion==='running'`))break;await delay(100);}
 if(errors.length)throw Error(errors.join('\n'));
 const count=await evaluate(`document.querySelectorAll('#motion-choice option').length-1`);if(count!==110)throw Error('Incomplete preview catalogue: '+count);
 const report={count,cases:[],errors};
 const state=`(()=>{const f=document.querySelector('.fairy-float'),h=document.querySelector('.core-halo');return {id:document.getElementById('fairy-scene').dataset.animation,body:f.style.transform,wing:document.querySelector('.wing').style.transform,halo:h.style.transform,progress:document.getElementById('motion-progress').value};})()`;
 for(const motion of ['orbit-clock','light-beacon','gesture-wave']){
  await evaluate(`(()=>{document.querySelector('.motion-gallery').open=true;const choice=document.getElementById('motion-choice');choice.value=${JSON.stringify(motion)};choice.dispatchEvent(new Event('change'));})()`);
  const samples=[];for(let i=0;i<8;i++){await delay(250);samples.push(await evaluate(state));}
  if(samples.some(s=>s.id!==motion)||new Set(samples.map(s=>s.body)).size<5||new Set(samples.map(s=>s.wing)).size<5)throw Error('Preview is not visibly advancing: '+motion);
  if(!await evaluate(`window.__naviMessages.some(m=>m.motion===${JSON.stringify(motion)}&&m.preview===true)`))throw Error('Native preview flag missing');
  report.cases.push({motion,distinctBodyFrames:new Set(samples.map(s=>s.body)).size,distinctWingFrames:new Set(samples.map(s=>s.wing)).size});
 }
 await evaluate(`(()=>{const choice=document.getElementById('motion-choice');choice.value='greet-wave';choice.dispatchEvent(new Event('change'));})()`);
 await delay(4200);
 const looping=await evaluate(`document.getElementById('fairy-scene').dataset.animation==='greet-wave'&&window.__naviMessages.filter(m=>m.motion==='greet-wave'&&m.preview).length>=2`);
 if(!looping)throw Error('Single preview did not repeat');report.singlePreviewLoops=true;
 await evaluate(`document.getElementById('toggle-animation').click()`);const paused=await evaluate(state);await delay(350);const after=await evaluate(state);
 if(paused.body!==after.body||paused.wing!==after.wing||paused.progress!==after.progress)throw Error('Paused preview advanced');report.pauseFreezesFrame=true;
 await evaluate(`document.getElementById('toggle-animation').click()`);await delay(350);
 if((await evaluate(state)).body===paused.body)throw Error('Resume did not animate');report.resumeWorks=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'visibility',visible:false}}))`);const hidden=await evaluate(state);await delay(250);
 if((await evaluate(state)).body!==hidden.body)throw Error('Hidden preview advanced');report.hiddenFreezesFrame=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'visibility',visible:true}}));document.getElementById('preview-all').click()`);
 if(!await evaluate(`document.getElementById('motion-choice').value==='auto'`))throw Error('Stop did not restore automatic motion');report.stopReturnsToAuto=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'<img src=x> Ich bin da. Schreib mir mit @navi.'}}))`);
 if(!await evaluate(`!document.getElementById('speech-bubble').hidden&&document.getElementById('bubble-text').textContent.startsWith('<img src=x>')&&document.querySelectorAll('#speech-bubble img').length===0`))throw Error('Bubble text was not safely displayed');
 report.speechPlainText=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'audioFocus',focused:false}}));window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Not while unfocused'}}))`);
 if(!await evaluate(`document.getElementById('speech-bubble').hidden`))throw Error('Unfocused bubble appeared');report.speechRespectsFocus=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'audioFocus',focused:true}}));window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Ich bin da. Schreib mir mit @navi.'}}))`);
 await evaluate(`document.getElementById('bubble-chat').click()`);
 if(!await evaluate(`window.__naviMessages.some(m=>m.type==='openChat')`))throw Error('Chat action missing');report.speechChatAction=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Ich bin da. Schreib mir mit @navi.'}}))`);
 const bubbleShot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'speech-bubble.png'),Buffer.from(bubbleShot.data,'base64'));
 await evaluate(`document.getElementById('close-bubble').click();window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Should stay hidden'}}))`);
 if(!await evaluate(`document.getElementById('speech-bubble').hidden&&window.__naviMessages.some(m=>m.type==='hideSpeech')`))throw Error('Bubble did not respect dismissal');report.speechDismissal=true;
 await evaluate(`(()=>{const OriginalAudio=window.Audio;window.__naviPlayed=[];window.Audio=function(url){const audio=new OriginalAudio(url);audio.addEventListener('playing',()=>window.__naviPlayed.push({url,volume:audio.volume,ready:audio.readyState}));return audio;};document.querySelector('.sound-controls').open=true;})()`);
 await command('Runtime.evaluate',{expression:`document.getElementById('preview-sound').click()`,userGesture:true});
 for(let i=0;i<30;i++){if(await evaluate(`window.__naviPlayed.length>0`))break;await delay(100);}
 if(!await evaluate(`window.__naviPlayed.length>0&&document.getElementById('sound-status').textContent.includes('Testton gestartet')&&document.querySelector('.sound-controls').dataset.soundEnabled==='false'`))throw Error('Audition did not start with automatic sound disabled');
 report.actualAudioPlaybackStarted=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'settings',animationEnabled:true,bubbleEnabled:true}}));window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Ein kleines Licht an deiner Seite.'}}))`);
 const styledShot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'speech-bubble-styled.png'),Buffer.from(styledShot.data,'base64'));
 if(errors.length)throw Error(errors.join('\n'));
 const screenshot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'preview.png'),Buffer.from(screenshot.data,'base64'));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();});
