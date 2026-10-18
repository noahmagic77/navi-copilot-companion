'use strict';
// Dependency-free runtime check of the actual Webview in installed Chromium/Edge.
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {renderNaviWebview}=require('../dist/src/ui/webviewContent.js');
const {ExpressionController}=require('../dist/src/brain/expression.js');
const {Brain}=require('../dist/src/brain/brain.js');
const {ActivityController}=require('../dist/src/integration/activity.js');
const {renderBrainWebview}=require('../dist/src/ui/brainContent.js');
const {brainDisplayData}=require('../dist/src/brain/inspection.js');
const {PresenceController}=require('../dist/src/brain/presence.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'build/preview-runtime');
fs.mkdirSync(out,{recursive:true});
const uri=file=>pathToFileURL(path.join(root,'media',file)).href;
const nonce='navi-preview-runtime';
const html=renderNaviWebview({cspSource:'file:',nonce,styleUri:uri('fairy.css'),motionUri:uri('fairy-motion.js'),scriptUri:uri('fairy.js'),soundScriptUri:uri('fairy-sound.js'),soundBaseUri:uri('sounds'),animationEnabled:true,overlaySupported:true});
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
 if(!await evaluate(`!document.getElementById('prompt')&&!document.getElementById('check')&&!document.querySelector('.prompt-check')`))throw Error('Removed prompt analysis UI is still present');
 const report={count,cases:[],errors};
 const state=`(()=>{const f=document.querySelector('.fairy-float'),h=document.querySelector('.core-halo');return {id:document.getElementById('fairy-scene').dataset.animation,body:f.style.transform,wing:document.querySelector('.wing').style.transform,halo:h.style.transform,yaw:document.querySelector('.fairy-art').style.transform,gaze:document.querySelector('.core-glint').style.transform,progress:document.getElementById('motion-progress').value};})()`;
 const gameControls=await evaluate(`(()=>({visible:!document.querySelector('.game-controls').hidden,modes:[...document.querySelectorAll('[data-game-mode]')].map(button=>button.dataset.gameMode)}))()`);
 if(!gameControls.visible||gameControls.modes.join(',')!=='catch,chase,hide')throw Error('Direct game controls are missing: '+JSON.stringify(gameControls));
 for(const mode of gameControls.modes)await evaluate(`document.querySelector('[data-game-mode="${mode}"]').click()`);
 await evaluate(`document.getElementById('stop-game').click()`);
 if(!await evaluate(`['catch','chase','hide'].every(mode=>window.__naviMessages.some(message=>message.type==='startGame'&&message.mode===mode))&&window.__naviMessages.some(message=>message.type==='stopGame')`))throw Error('Game buttons did not send their actions');
 report.gameButtons=gameControls.modes.concat('stop');
 await evaluate(`window.postMessage({type:'companionPosition',away:true},'*')`);await delay(900);
 const awayX=await evaluate(`new DOMMatrix(getComputedStyle(document.querySelector('.fairy-float')).transform).m41`);
 await evaluate(`window.postMessage({type:'companionPosition',away:false},'*')`);await delay(900);
 const homeX=await evaluate(`new DOMMatrix(getComputedStyle(document.querySelector('.fairy-float')).transform).m41`);
 if(awayX-homeX<30)throw Error('Embedded companion did not make room: '+JSON.stringify({awayX,homeX}));
 await evaluate(`window.postMessage({type:'problemOffer',available:true,message:'Zeile 2: Testdiagnose – Problem zeigen?'},'*')`);await delay(100);
 if(!await evaluate(`!document.getElementById('bubble-problem').hidden&&document.getElementById('bubble-text').textContent.includes('Problem zeigen')`))throw Error('Problem offer is missing');
 await evaluate(`document.getElementById('bubble-problem').click();document.querySelector('[data-companion-command="navi.openBrain"]').click()`);
 if(!await evaluate(`['navi.showOfferedProblem','navi.openBrain'].every(command=>window.__naviMessages.some(message=>message.type==='companionCommand'&&message.command===command))`))throw Error('Companion action buttons are not wired');
 await evaluate(`document.getElementById('fairy-scene').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));document.querySelector('[data-companion-command="navi.actions"]').click()`);
 if(!await evaluate(`window.__naviMessages.filter(message=>message.type==='companionCommand'&&message.command==='navi.actions').length===2`))throw Error('Fairy context menu or accessible action button is missing');
 await evaluate(`document.querySelector('[data-companion-command="navi.fixProblem"]').click()`);
 if(!await evaluate(`window.__naviMessages.some(message=>message.type==='companionCommand'&&message.command==='navi.fixProblem')`))throw Error('Explicit fix button is missing or unwired');
 report.explicitFixAction=true;
 await evaluate(`window.postMessage({type:'problemOffer',available:false},'*');window.postMessage({type:'expression',state:'acknowledge',age:0,engaged:true,source:'vscode'},'*');window.postMessage({type:'expression',state:'idle',age:0,engaged:false,source:'vscode'},'*')`);
 report.companionMakeSpaceAndActions=true;
 for(const motion of ['orbit-clock','light-beacon','gesture-wave']){
  await evaluate(`(()=>{document.querySelector('.motion-gallery').open=true;const choice=document.getElementById('motion-choice');choice.value=${JSON.stringify(motion)};choice.dispatchEvent(new Event('change'));})()`);
  const samples=[];for(let i=0;i<8;i++){await delay(250);samples.push(await evaluate(state));}
  if(samples.some(s=>s.id!==motion)||new Set(samples.map(s=>s.body)).size<5||new Set(samples.map(s=>s.wing)).size<5)throw Error('Preview is not visibly advancing: '+motion);
  const positions=samples.map(s=>s.body.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/).slice(1).map(Number));
  const travel=Math.hypot(...[0,1].map(axis=>Math.max(...positions.map(p=>p[axis]))-Math.min(...positions.map(p=>p[axis]))));
  const haloRange=Math.max(...samples.map(s=>Number(s.halo.match(/scale\(([^)]+)\)/)[1])))-Math.min(...samples.map(s=>Number(s.halo.match(/scale\(([^)]+)\)/)[1])));
  if(motion==='light-beacon'?haloRange<.15:travel<8)throw Error('Animation changes are too subtle: '+motion+' travel='+travel+' halo='+haloRange);
  if(!await evaluate(`window.__naviMessages.some(m=>m.motion===${JSON.stringify(motion)}&&m.preview===true)`))throw Error('Native preview flag missing');
  report.cases.push({motion,travelPixels:travel,haloScaleRange:haloRange,distinctBodyFrames:new Set(samples.map(s=>s.body)).size,distinctWingFrames:new Set(samples.map(s=>s.wing)).size});
 }
 await evaluate(`(()=>{const choice=document.getElementById('motion-choice');choice.value='rest';choice.dispatchEvent(new Event('change'));})()`);
 const pointAt=async(x,y)=>{
  await evaluate(`(()=>{const scene=document.getElementById('fairy-scene'),bounds=scene.getBoundingClientRect();scene.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:bounds.left+bounds.width*${x},clientY:bounds.top+bounds.height*${y}}));})()`);
  await delay(150);
  return evaluate(state);
 };
 const leftPointer=await pointAt(.15,.2),rightPointer=await pointAt(.85,.8);
 if(leftPointer.yaw===rightPointer.yaw||leftPointer.gaze===rightPointer.gaze)throw Error('Selected preview did not react to pointer movement');
 report.previewTracksPointer=true;
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
 if(!await evaluate(`document.getElementById('bubble-problem').hidden`))throw Error('Old problem action leaked into unrelated speech');
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Neue gleichrangige Nachricht'}}))`);
 if(!await evaluate(`document.getElementById('bubble-text').textContent==='Neue gleichrangige Nachricht'`))throw Error('New same-priority speech was suppressed');
 report.speechActionsMatchCurrentMessage=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'audioFocus',focused:false}}));window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Not while unfocused'}}))`);
 if(!await evaluate(`document.getElementById('speech-bubble').hidden`))throw Error('Unfocused bubble appeared');report.speechRespectsFocus=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'audioFocus',focused:true}}));window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Ich bin da. Schreib mir mit @navi.'}}))`);
 await evaluate(`document.getElementById('bubble-chat').click()`);
 if(!await evaluate(`window.__naviMessages.some(m=>m.type==='openChat')`))throw Error('Chat action missing');report.speechChatAction=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Ich bin da. Schreib mir mit @navi.'}}))`);
 const geometry=await evaluate(`(()=>{const stage=document.querySelector('.fairy-stage').getBoundingClientRect(),core=document.querySelector('.core-light').getBoundingClientRect(),d=document.querySelector('.bubble-tail path').getAttribute('d').match(/L ([^ ]+) ([^ ]+)/);return {tipX:Number(d[1]),tipY:Number(d[2]),coreX:core.left-stage.left+core.width/2,coreY:core.top-stage.top+core.height/2,background:getComputedStyle(document.getElementById('speech-bubble')).backgroundImage};})()`);
 if(Math.hypot(geometry.tipX-geometry.coreX,geometry.tipY-geometry.coreY)>.1||!geometry.background.includes('rgba'))throw Error('Bubble is opaque or tail misses the rendered core: '+JSON.stringify(geometry));report.bubbleTransparentAndTailTracksCore=true;
 const bubbleShot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'speech-bubble.png'),Buffer.from(bubbleShot.data,'base64'));
 await evaluate(`document.getElementById('close-bubble').click();window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Should stay hidden'}}))`);
 if(!await evaluate(`document.getElementById('speech-bubble').hidden&&window.__naviMessages.some(m=>m.type==='hideSpeech')`))throw Error('Bubble did not respect dismissal');report.speechDismissal=true;
 if(!await evaluate(`document.querySelector('.bubble-tail').hasAttribute('hidden')`))throw Error('Detached speech tail remained visible');
 let expressionTime=0;const expressionFrames=[];const expressionBrain=new Brain(true,()=>expressionTime);
 const controller=new ExpressionController(frame=>expressionFrames.push(frame),()=>expressionTime);
 const activities=new ActivityController(event=>{expressionBrain.observe(event);controller.observe(expressionBrain.snapshot(),event);},()=>expressionTime);
 async function showExpression(){
  for(const frame of expressionFrames.splice(0))await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify({type:'expression',...frame})}}))`);
 }
 async function checkExpression(expected){
  await showExpression();
  if(!await evaluate(`document.getElementById('fairy-scene').dataset.expression===${JSON.stringify(expected)}`))throw Error('Brain expression not displayed: '+expected);
  const samples=[];for(let i=0;i<4;i++){await delay(100);samples.push(await evaluate(state));}
  if(new Set(samples.map(sample=>sample.body+sample.halo+sample.wing)).size<3)throw Error('Brain expression is static: '+expected);
  const shot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'expression-'+expected+'.png'),Buffer.from(shot.data,'base64'));
  report.brainExpressions.push(expected);
 }
 report.brainExpressions=[];
 activities.update('vscode','expression-turn','received');await checkExpression('acknowledge');
 activities.update('vscode','expression-turn','waiting');expressionTime=650;controller.tick();await checkExpression('waiting');
 activities.update('vscode','expression-turn','busy');await checkExpression('working');
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'analysis',hints:[],characterCount:10}}))`);
 if(!await evaluate(`document.getElementById('fairy-scene').dataset.expression==='working'&&document.getElementById('motion-choice').disabled`))throw Error('Retired analysis message interrupted the brain expression');
 await evaluate(`document.getElementById('toggle-animation').click()`);const expressionPaused=await evaluate(state);await delay(300);
 if((await evaluate(state)).body!==expressionPaused.body)throw Error('Paused expression advanced');
 await evaluate(`document.getElementById('toggle-animation').click()`);
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'visibility',visible:false}}))`);const hiddenExpression=await evaluate(state);await delay(250);
 if((await evaluate(state)).body!==hiddenExpression.body)throw Error('Hidden brain expression advanced');
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'visibility',visible:true}}))`);await delay(150);
 if(!await evaluate(`document.getElementById('fairy-scene').dataset.expression==='working'&&document.getElementById('fairy-scene').dataset.animation==='think'`))throw Error('Returning view replaced brain expression with greeting');
 activities.update('vscode','expression-turn','completed','A model answer, not a verified test result.');await checkExpression('completed');
 if(!await evaluate(`document.getElementById('presence').textContent.includes('ungeprüft')`))throw Error('Unverified completion was presented as verified success');
 for(const terminal of ['cancelled','error']){
  activities.update('codex',terminal,'busy');await showExpression();
  activities.update('codex',terminal,terminal);await checkExpression(terminal);
 }
 controller.hint();await checkExpression('offer');
 controller.hint(true);await checkExpression('uncertain');
 expressionTime+=2500;controller.tick();await showExpression();
 if(!await evaluate(`document.getElementById('fairy-scene').dataset.expression==='idle'&&!document.getElementById('motion-choice').disabled`))throw Error('Expression did not release idle controls');
 report.brainExpressionPauseAndRecovery=true;
 report.lifelikeReactions=[];
 for(const kind of ['file','save','touch',null,'return','selection']){
  const living=new PresenceController(0);
  if(kind)living.observe(kind,4000);
  const response=living.evaluate(kind?4000:90000,{enabled:true,focused:true,occupied:false,expressionIdle:true});
  if(!response||!controller.react(response))throw Error('Presence reaction did not reach expression controller');
  await checkExpression(response.state);report.lifelikeReactions.push(response.state);
  expressionTime+=4000;controller.tick();await showExpression();
 }
 await evaluate(`window.postMessage({type:'presence',enabled:true,energy:.8,attention:1,curiosity:.8},'*')`);await delay(100);
 const leftGaze=await pointAt(.05,.3),rightGaze=await pointAt(.95,.7);
 if(leftGaze.gaze===rightGaze.gaze)throw Error('Living gaze did not follow the pointer');
 await evaluate(`document.getElementById('fairy-scene').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);
 if(!await evaluate(`window.__naviMessages.some(message=>message.type==='fairyInteraction'&&message.kind==='touch')&&document.getElementById('fairy-scene').getAttribute('role')==='button'`))throw Error('Fairy contact is not keyboard accessible');
 report.livingPointerAndContact=true;
 await evaluate(`window.postMessage({type:'presence',enabled:false,energy:0,attention:0,curiosity:0},'*')`);await delay(50);
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:''}}));(()=>{const scene=document.getElementById('fairy-scene'),bounds=scene.getBoundingClientRect();scene.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:bounds.left+bounds.width*.8,clientY:bounds.top+bounds.height*.35}));})()`);
 await delay(100);
 if(!await evaluate(`document.getElementById('fairy-scene').dataset.animation==='curious'&&document.getElementById('speech-bubble').hidden`))throw Error('Mouse curiosity should move silently without asking a question');
 report.pointerCuriosityIsSilent=true;
 await evaluate(`(()=>{const OriginalAudio=window.Audio;window.__naviPlayed=[];window.Audio=function(url){const audio=new OriginalAudio(url);audio.addEventListener('playing',()=>window.__naviPlayed.push({url,volume:audio.volume,ready:audio.readyState}));return audio;};document.querySelector('.sound-controls').open=true;})()`);
 await command('Runtime.evaluate',{expression:`document.getElementById('preview-sound').click()`,userGesture:true});
 for(let i=0;i<30;i++){if(await evaluate(`window.__naviPlayed.length>0`))break;await delay(100);}
 if(!await evaluate(`window.__naviPlayed.length>0&&document.getElementById('sound-status').textContent.includes('Testton gestartet')&&document.querySelector('.sound-controls').dataset.soundEnabled==='false'`))throw Error('Audition did not start with automatic sound disabled');
 report.actualAudioPlaybackStarted=true;
 await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'settings',animationEnabled:true,bubbleEnabled:true}}));window.dispatchEvent(new MessageEvent('message',{data:{type:'speech',message:'Ein kleines Licht an deiner Seite.'}}))`);
 const styledShot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'speech-bubble-styled.png'),Buffer.from(styledShot.data,'base64'));
 if(errors.length)throw Error(errors.join('\n'));
 const screenshot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'preview.png'),Buffer.from(screenshot.data,'base64'));
 const brainPage=path.join(out,'brain.html');fs.writeFileSync(brainPage,renderBrainWebview(nonce).replace('<body>','<body>'+mock));
 await command('Page.navigate',{url:pathToFileURL(brainPage).href});
 for(let i=0;i<40;i++){if(await evaluate(`!!document.getElementById('decision')&&window.__naviMessages?.some(message=>message.type==='ready')`))break;await delay(100);}
 const liveBrain=new Brain();
 liveBrain.decide({action:'makeSpace',reason:'Editoränderungen · <img src=x onerror=alert(1)>',suppressed:null,at:1},['navi.showProblems']);
 const liveData=brainDisplayData(liveBrain.snapshot(),controller.snapshot(),[],[{id:'test',kind:'next',text:'<script>unsafe</script>',source:'user',confirmedAt:'2026-10-18T00:00:00Z'}],'Nicht verfügbar');
 await evaluate(`window.postMessage({type:'snapshot',data:${JSON.stringify(liveData)}},'*')`);await delay(100);
 if(!await evaluate(`document.getElementById('decision').textContent.includes('Platz machen')&&document.getElementById('data').textContent.includes('<script>unsafe</script>')&&!document.querySelector('img')`))throw Error('Live brain failed safe actual-state rendering');
 await evaluate(`document.querySelector('[data-command="navi.stopListening"]').click()`);
 if(!await evaluate(`window.__naviMessages.some(message=>message.type==='command'&&message.command==='navi.stopListening')`))throw Error('Live brain stop action missing');
 const brainShot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'live-brain.png'),Buffer.from(brainShot.data,'base64'));
 report.liveBrainSafeRenderingAndActions=true;
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();});
