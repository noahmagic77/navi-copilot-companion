'use strict';

(() => {
  const vscode = acquireVsCodeApi();
  const {motions, idleMotionIds, greetingMotionIds, createGreetingSelector, chooseIdleMotion, shouldScheduleIdle, sampleMotion, samplePreviewMotion, createRig, stepRig, frameRate} = window.NaviMotion;
  const scene = document.getElementById('fairy-scene');
  const field = document.getElementById('sparkles');
  const float = scene.querySelector('.fairy-float');
  const art = scene.querySelector('.fairy-art');
  const wings = ['upper-left', 'upper-right', 'lower-left', 'lower-right'].map(name => scene.querySelector('.wing--' + name));
  const core = scene.querySelector('.core-light');
  const halo = scene.querySelector('.core-halo');
  const glint = scene.querySelector('.core-glint');
  const shadow = scene.querySelector('.ground-glow');
  const toggle = document.getElementById('toggle-animation');
  const motionLabel = document.getElementById('motion-label');
  const powerToggle = document.getElementById('toggle-power');
  let powerMode = scene.dataset.powerMode === 'eco' ? 'eco' : 'balanced';
  const choice = document.getElementById('motion-choice');
  const previewAll = document.getElementById('preview-all');
  const caption = document.getElementById('motion-caption');
  const prompt = document.getElementById('prompt');
  const presence = document.getElementById('presence');
  const heading = document.getElementById('heading');
  const hint = document.getElementById('hint');
  const status = document.getElementById('status');
  const speechBubble=document.getElementById('speech-bubble');
  const bubbleTail=document.createElementNS('http://www.w3.org/2000/svg','svg');
  bubbleTail.classList.add('bubble-tail');bubbleTail.setAttribute('aria-hidden','true');
  const tailPath=document.createElementNS('http://www.w3.org/2000/svg','path');
  bubbleTail.append(tailPath);document.querySelector('.fairy-stage').prepend(bubbleTail);
  function positionBubble(){
    bubbleTail.toggleAttribute('hidden',speechBubble.hidden);
    if(speechBubble.hidden)return;
    const stage=document.querySelector('.fairy-stage').getBoundingClientRect();
    const area=scene.getBoundingClientRect();
    const x=area.left-stage.left+area.width*.5+pose.x*modelScale;
    const y=area.top-stage.top+area.height*.4844+(pose.y+3)*modelScale;
    speechBubble.style.top=Math.max(0,y-speechBubble.offsetHeight-30)+'px';
    const box=speechBubble.getBoundingClientRect();
    const baseX=clamp(x,box.left-stage.left+20,box.right-stage.left-20);
    const baseY=box.bottom-stage.top-1;
    tailPath.setAttribute('d',`M ${baseX-9} ${baseY} L ${x} ${y} L ${baseX+9} ${baseY} Z`);
    bubbleTail.setAttribute('viewBox',`0 0 ${stage.width} ${stage.height}`);
  }
  let bubbleEnabled=document.querySelector('.fairy-stage').dataset.bubbleEnabled==='true';
  let bubblePriority=0,bubbleUntil=0,bubbleTimer=0;
  function hideBubble(){clearTimeout(bubbleTimer);speechBubble.hidden=true;bubbleTail.setAttribute('hidden','');bubblePriority=0;bubbleUntil=0;}
  function showBubble(message,priority=1){
    if(!bubbleEnabled||!hostVisible||!hostFocused||document.hidden||typeof message!=='string')return;
    const text=Array.from(message.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/\s+/g,' ').trim()).slice(0,160).join('');
    if(!text){hideBubble();return;}
    const now=Date.now();
    if(!speechBubble.hidden && now < bubbleUntil && bubblePriority >= priority) return;
    if(!speechBubble.hidden && now < bubbleUntil && bubblePriority > priority) return;
    document.getElementById('bubble-text').textContent=text;speechBubble.hidden=false;
    positionBubble();
    bubblePriority=priority;const duration=Math.min(10000,4000+Array.from(text).length/30*1000);bubbleUntil=now+duration;
    clearTimeout(bubbleTimer);bubbleTimer=setTimeout(hideBubble,duration);
  }
  document.getElementById('close-bubble').addEventListener('click',()=>{bubbleEnabled=false;hideBubble();vscode.postMessage({type:'hideSpeech'});});
  document.getElementById('bubble-chat').addEventListener('click',()=>vscode.postMessage({type:'openChat'}));
  const soundControls=document.querySelector('.sound-controls');
  const soundToggle=document.getElementById('toggle-sound');
  const soundVolume=document.getElementById('sound-volume');
  const soundStatus=document.getElementById('sound-status');
  let soundEnabled=soundControls.dataset.soundEnabled==='true';
  let volume=Number(soundControls.dataset.soundVolume);
  const soundPlayer=window.NaviSound.createPlayer({baseUri:soundControls.dataset.soundBase,onBlocked:error=>{
    soundStatus.textContent=error?.name==='NotAllowedError'?'Klangwiedergabe noch gesperrt. Bitte direkt auf „Anhören“ klicken.':'Klang konnte nicht abgespielt werden. Prüfe die Audioausgabe von VS Code.';
  }});
  function syncSound(){
    soundToggle.textContent=soundEnabled?'Geräusche an':'Geräusche aus';
    soundToggle.setAttribute('aria-pressed',String(soundEnabled));
    soundVolume.value=String(volume);
    document.getElementById('sound-volume-value').textContent=volume+' %';
    document.getElementById('preview-sound').disabled=volume===0;
    soundStatus.textContent=volume===0?'Lautstärke 0 – stumm.':soundEnabled?'Automatische Feenklänge sind an.':'Automatische Feenklänge sind aus. „Anhören“ spielt einen Testton.';
    soundPlayer.configure({enabled:soundEnabled,volume});
  }
  soundToggle.addEventListener('click',()=>{
    soundEnabled=!soundEnabled;syncSound();vscode.postMessage({type:'setSound',enabled:soundEnabled});
    if(soundEnabled)void soundPlayer.play('greeting',{audition:true});
  });
  soundVolume.addEventListener('input',()=>{volume=Number(soundVolume.value);syncSound();});
  soundVolume.addEventListener('change',()=>vscode.postMessage({type:'setSoundVolume',volume}));
  document.getElementById('preview-sound').addEventListener('click',()=>{
    // Play inside the user gesture; do not lose autoplay permission to an IPC hop.
    void soundPlayer.play(document.getElementById('sound-choice').value,{audition:true}).then(started=>{
      if(started)soundStatus.textContent='Testton gestartet. Falls du nichts hörst, prüfe die VS-Code-Lautstärke im Windows-Lautstärkemixer.';
    });
  });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  let animationEnabled = scene.dataset.animationEnabled === 'true';
  let respectReducedMotion = scene.dataset.respectReducedMotion === 'true';
  let hostVisible = true;
  let hostFocused = true;
  let lastGreetingAt = Date.now();
  const selectGreeting = createGreetingSelector();
  let frame = 0;
  let lastFrame = null;
  let nextFrameAt = 0;
  let elapsed = 0;
  let wingPhase = 0;
  let orbitPhase = 0;
  let modelScale = 1;
  let lastInteraction = 0;
  let lastCuriosity = -10;
  let checking = false;
  let modelBusy = false;
  let mode = 'auto';
  let transitionPending = true;
  let previewQueue = [];
  let active = {id: 'greet', age: 0, source: 'auto', duration: 3.8};
  let pointer = {x: 0, y: 0};
  let pose = sampleMotion('hover', 0, 0);
  const rig = createRig(pose);
  const targetPose = sampleMotion('hover', 0, 0);
  let idleCooldownUntil = 0;
  let lastIdleMotion = 'hover';
  const centers = Array(7).fill(pose);
  let lastParticleCount = 0;
  const trail = Array.from({length: 90}, () => ({at: -1, x: 0, y: 0}));
  let trailIndex = 0;
  const idleSequence = Object.freeze([
    'drift','figure8','stretch','curious','twirl',
    'sway-breeze','arc-sunrise','bob-skip','orbit-halo','light-breathe',
    'sway-cloud','arc-return','orbit-wreath'
  ]);
  let idleIndex = Math.floor(Math.random() * idleSequence.length);

  const groups = new Map();
  for (const motion of motions) {
    if (!groups.has(motion.category)) {
      const group = document.createElement('optgroup');
      group.label = motion.category;
      groups.set(motion.category, group);
      choice.appendChild(group);
    }
    const option = document.createElement('option');
    option.value = motion.id;
    option.textContent = motion.label;
    groups.get(motion.category).appendChild(option);
  }

  // One fixed particle pool and one shared clock for the entire character.
  const particles = Array.from({length: 24}, (_, i) => {
    const element = document.createElement('span');
    element.className = i % 6 === 0 ? 'sparkle sparkle--star' : 'sparkle';
    field.appendChild(element);
    return {element, phase: i * 2.399963, radius: 72 + (i % 5) * 10, speed: .44 + (i % 4) * .045, front: null};
  });

  function updateCaption() {
    const name = motions.find(motion => motion.id === active.id).label;
    caption.textContent = (mode === 'auto' ? 'Gerade: ' : 'Vorschau: ') + name + '. ' +
      (mode === 'all' ? `Alle ${motions.length} Bewegungen laufen nacheinander (${motions.length - previewQueue.length}/${motions.length}).` : mode === 'single' ? 'Wird mit verstärkter Bewegung wiederholt, bis du die Vorschau beendest.' : 'NAVI reagiert auf Eingaben und ruht bei längeren Pausen.');
    previewAll.textContent = mode === 'auto' ? 'Alle ansehen' : 'Vorschau beenden';
  }

  function enterMotion(id, source = 'auto', duration) {
    const definition = motions.find(motion => motion.id === id);
    if (!definition) return;
    active = {id, age: 0, source, duration: duration || definition.duration};
    if(source!=='preview'&&source!=='integration'){
      if(id==='greet'||id.startsWith('greet-'))showBubble('Hallo! Ich bin da. Schreib mir mit @navi.');
      else if(id==='curious')showBubble('Was möchtest du als Nächstes ausprobieren?');
      else if(id==='hint')showBubble('Ich habe einen Tipp für deinen Prompt.');
      else if(id==='celebrate')showBubble('Dein Prompt sieht nach den lokalen Regeln gut aus.');
    }
    transitionPending = true;
    scene.dataset.animation = id;
    nextFrameAt = 0;
    vscode.postMessage({type: 'motion', motion: id, preview: source === 'preview'});
    if (source === 'preview') choice.value = id;
    updateCaption();
  }

  function resumeNaturalMotion() {
    mode = 'auto';
    previewQueue = [];
    choice.value = 'auto';
    if (checking || document.activeElement === prompt) {
      enterMotion(checking ? 'think' : 'listen', checking ? 'context' : 'context', 16 + Math.random() * 8);
      return;
    }
    const nextIdle = chooseIdleMotion(lastIdleMotion, idleSequence);
    lastIdleMotion = nextIdle;
    enterMotion(nextIdle, 'auto', 8 + Math.random() * 7);
  }

  function advanceMotion(dt) {
    active.age += dt;
    const quietFor = Math.max(0, elapsed - lastInteraction) * 1000;
    const bubbleWindowOpen = !speechBubble.hidden && Date.now() < bubbleUntil;
    const canResumeIdle = shouldScheduleIdle({
      checking,
      promptFocused: document.activeElement === prompt,
      bubbleVisible: bubbleWindowOpen,
      bubblePriority,
      hostVisible,
      hostFocused,
      lastInteractionAt: Math.max(0, lastInteraction * 1000),
      now: elapsed * 1000,
      minIdleGapMs: 5000
    });
    if (mode === 'auto' && !checking && !modelBusy && document.activeElement !== prompt && bubbleWindowOpen && bubblePriority >= 2) {
      // Keep a short recovery window when the bubble is active so that reactions remain visible.
      return;
    }
    if (mode === 'auto' && !checking && document.activeElement !== prompt && quietFor > 9000 && active.id !== 'rest' && bubbleWindowOpen && bubblePriority >= 2) {
      return;
    }
    if (mode === 'auto' && !checking && document.activeElement !== prompt && quietFor > 9000 && active.id !== 'rest') {
      enterMotion('rest', 'context');
    }
    if (active.age < active.duration) return;
    if (active.source === 'preview') {
      if (mode === 'single') {enterMotion(active.id,'preview');return;}
      const next = previewQueue.shift();
      if (next) enterMotion(next, 'preview');
      else resumeNaturalMotion();
    } else if (active.source === 'context') {
      // These poses are driven by the continuous clock, so looping is seamless.
      active.age = active.duration;
    } else if (active.source === 'feedback' || active.id !== 'hover') {
      if (canResumeIdle && !speechBubble.hidden && bubblePriority >= 2) {
        resumeNaturalMotion();
        return;
      }
      if (canResumeIdle && !checking && !modelBusy && document.activeElement !== prompt) {
        const nextIdle = chooseIdleMotion(lastIdleMotion, idleSequence);
        lastIdleMotion = nextIdle;
        idleCooldownUntil = elapsed * 1000 + 8000;
        enterMotion(nextIdle, 'auto', 9 + Math.random() * 8);
      } else {
        resumeNaturalMotion();
      }
    } else {
      if (canResumeIdle && !checking && !modelBusy && document.activeElement !== prompt && elapsed * 1000 >= idleCooldownUntil) {
        const nextIdle = chooseIdleMotion(lastIdleMotion, idleSequence);
        lastIdleMotion = nextIdle;
        idleCooldownUntil = elapsed * 1000 + 8000;
        enterMotion(nextIdle, 'auto', 7 + Math.random() * 7);
      } else {
        active.age = 0;
      }
    }
  }

  function delayedCenter(delay) {
    const target = elapsed - delay;
    for (let i = 0; i < trail.length; i++) {
      const point = trail[(trailIndex - 1 - i + trail.length * 2) % trail.length];
      if (point.at >= 0 && point.at <= target) return point;
    }
    return pose;
  }

  function render() {
    positionBubble();
    const recoil = Math.sin(wingPhase * 2) * .25 * pose.wingAmplitude;
    float.style.transform = `translate(${pose.x * modelScale}px, ${(pose.y + recoil) * modelScale}px) rotate(${pose.roll}deg) scale(${pose.scale})`;
    art.style.transform = `perspective(600px) rotateY(${pose.yaw}deg)`;
    const stroke = phase => (.5 + (Math.sin(phase) + .14 * Math.sin(phase * 2)) / 2.15);
    const left = stroke(wingPhase);
    const right = stroke(wingPhase + Math.sin(elapsed * .7) * .065);
    const lower = stroke(wingPhase - .55);
    const fold = pose.wingFold * 40;
    const spread = pose.wingSpread;
    const amplitude = pose.wingAmplitude;
    wings[0].style.transform = `perspective(450px) rotateY(${12 + left * 50 * amplitude + fold - spread * 8}deg) rotate(${-3 + left * 9 - spread * 15}deg)`;
    wings[1].style.transform = `perspective(450px) rotateY(${-12 - right * 50 * amplitude - fold + spread * 8}deg) rotate(${3 - right * 9 + spread * 15}deg)`;
    wings[2].style.transform = `perspective(450px) rotateY(${7 + lower * 40 * amplitude + fold}deg) rotate(${-lower * 10 + spread * 18}deg)`;
    wings[3].style.transform = `perspective(450px) rotateY(${-7 - lower * 40 * amplitude - fold}deg) rotate(${lower * 10 - spread * 18}deg)`;
    core.style.transform = `scale(${.985 + (pose.glow - 1) * .35})`;
    core.style.opacity = String(clamp(pose.glow, .65, 1));
    halo.style.transform = `scale(${pose.glow})`;
    halo.style.opacity = String(clamp(.7 + (pose.glow - 1), .35, 1));
    glint.style.transform = `translate(${pose.gazeX}px, ${pose.gazeY}px) rotate(-35deg)`;
    shadow.style.transform = `translateX(${pose.x * modelScale * .5}px) scale(${clamp(.85 + pose.y * .012, .65, 1.1)})`;
    shadow.style.opacity = String(clamp(.65 + pose.y * .015, .3, .95));
    for (let i = 0; i < centers.length; i++) centers[i] = delayedCenter(.055 * i);
    const count = powerMode === 'eco' ? 6 : pose.scatter > .35 ? 24 : 12;
    if (count !== lastParticleCount) {particles.forEach((particle, i) => {particle.element.hidden = i >= count;}); lastParticleCount = count;}
    for (let i = 0; i < count; i++) {
      const particle = particles[i];
      const angle = particle.phase + orbitPhase * particle.speed;
      const depth = Math.cos(angle);
      const center = centers[i % 7];
      const radius = particle.radius * pose.orbitRadius + pose.scatter * (12 + i % 5 * 4);
      const x = Math.sin(angle) * radius;
      const y = depth * radius * .36 - x * .25 + Math.sin(angle * 1.6 + i) * 8;
      const twinkle = .56 + Math.sin(elapsed * 1.5 + particle.phase) * .24;
      particle.element.style.transform = `translate(${(x + center.x) * modelScale}px, ${(y + center.y) * modelScale}px) scale(${(.65 + (depth + 1) * .22) * modelScale})`;
      particle.element.style.opacity = String(twinkle * (.58 + (depth + 1) * .21) * clamp(pose.glow, .6, 1.1));
      const front = depth > 0;
      if (particle.front !== front) {particle.element.style.zIndex = front ? '3' : '1'; particle.front = front;}
    }
  }

  function tick(timestamp) {
    const interval = 1000 / frameRate(active.id, powerMode === 'eco', active.age);
    if (lastFrame !== null && timestamp + .2 < nextFrameAt) {frame = requestAnimationFrame(tick); return;}
    if (lastFrame !== null) {
      const dt = clamp((timestamp - lastFrame) / 1000, 0, .1);
      elapsed += dt;
      advanceMotion(dt);
      const sample=active.source==='preview'?samplePreviewMotion:sampleMotion;
      sample(active.id, active.age, elapsed, pointer, targetPose);
      document.getElementById('motion-progress').value=active.source==='preview'?active.age/active.duration:0;
      if (active.id === 'hover' || active.id === 'listen') targetPose.wingSpeed *= .65;
      pose = stepRig(rig, targetPose, transitionPending ? 0 : dt);
      transitionPending = false;
      // Phases never reset when changing clips: the wings never snap backwards.
      wingPhase = (wingPhase + dt * TAU * 2.05 * pose.wingSpeed) % TAU;
      orbitPhase += dt * pose.orbitSpeed;
      const point = trail[trailIndex]; point.at = elapsed; point.x = pose.x; point.y = pose.y;
      trailIndex = (trailIndex + 1) % trail.length;
      render();
    }
    lastFrame = timestamp;
    nextFrameAt = timestamp + interval - Math.max(0, (timestamp - nextFrameAt) % interval);
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    if(!hostVisible||document.hidden)hideBubble();
    soundPlayer.configure({visible:hostVisible && !document.hidden});
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = null;
    nextFrameAt = 0;
    powerToggle.textContent = powerMode === 'eco' ? 'Sparmodus an' : 'Sparmodus aus';
    powerToggle.setAttribute('aria-pressed', String(powerMode === 'eco'));
    const reduced = respectReducedMotion && reducedMotion.matches;
    const enabled = animationEnabled && !reduced;
    const visible = hostVisible && !document.hidden;
    scene.dataset.motion = !visible ? 'hidden' : enabled ? 'running' : 'paused';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.disabled = reduced;
    choice.disabled = !enabled || modelBusy;
    previewAll.disabled = !enabled || modelBusy;
    motionLabel.textContent = reduced ? 'Bewegung reduziert' : enabled ? 'Animation an' : 'Animation aus';
    toggle.title = reduced ? 'Die Systemeinstellung für reduzierte Bewegung wird berücksichtigt.' : enabled ? 'Animation pausieren' : 'Animation einschalten';
    if (enabled && visible) frame = requestAnimationFrame(tick);
  }

  function noteInteraction() {
    lastInteraction = elapsed;
    if (mode === 'auto' && active.id === 'rest') enterMotion('greet');
  }

  toggle.addEventListener('click', () => {
    animationEnabled = !animationEnabled;
    syncMotion();
    vscode.postMessage({type: 'setAnimation', enabled: animationEnabled});
  });
  powerToggle.addEventListener('click', () => {
    powerMode = powerMode === 'eco' ? 'balanced' : 'eco';
    syncMotion(); render();
    vscode.postMessage({type: 'setPowerMode', eco: powerMode === 'eco'});
  });
  document.getElementById('show-overlay').addEventListener('click', () => vscode.postMessage({type:'showOverlay'}));
  document.getElementById('hide-overlay').addEventListener('click', () => vscode.postMessage({type:'hideOverlay'}));
  choice.addEventListener('change', () => {
    noteInteraction();
    if (choice.value === 'auto') return resumeNaturalMotion();
    mode = 'single';
    previewQueue = [];
    enterMotion(choice.value, 'preview');
  });
  previewAll.addEventListener('click', () => {
    noteInteraction();
    if (mode !== 'auto') return resumeNaturalMotion();
    mode = 'all';
    previewQueue = motions.map(motion => motion.id);
    enterMotion(previewQueue.shift(), 'preview');
  });
  prompt.addEventListener('focus', () => {
    noteInteraction();
    if (mode === 'auto' && !checking) enterMotion('listen', 'context');
  });
  prompt.addEventListener('blur', () => {
    if (mode === 'auto' && active.id === 'listen' && !checking) resumeNaturalMotion();
  });
  scene.addEventListener('pointermove', event => {
    const bounds = scene.getBoundingClientRect();
    pointer = {x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: (event.clientY - bounds.top) / bounds.height * 2 - 1};
    noteInteraction();
    if (mode === 'auto' && ['hover', 'rest'].includes(active.id) && elapsed - lastCuriosity > 8) {
      lastCuriosity = elapsed;
      enterMotion('curious');
    }
  });
  scene.addEventListener('pointerleave', () => { pointer = {x: 0, y: 0}; });
  document.addEventListener('keydown', noteInteraction);
  document.addEventListener('pointerdown', noteInteraction, {passive: true});
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  new ResizeObserver(() => {
    modelScale = Math.min(scene.clientWidth, scene.clientHeight) / 320;
    render();
  }).observe(scene);

  document.getElementById('check').addEventListener('submit', event => {
    event.preventDefault();
    const input = prompt.value;
    if (!input.trim()) return;
    mode = 'auto';
    previewQueue = [];
    choice.value = 'auto';
    checking = true;
    enterMotion('think', 'context');
    vscode.postMessage({type: 'check', text: input});
  });

  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if(data.type==='activity'&&['busy','completed','cancelled','error','message'].includes(data.state)&&typeof data.message==='string'){
      modelBusy=data.state==='busy';checking=modelBusy;mode='auto';previewQueue=[];choice.value='auto';lastInteraction=elapsed;
      enterMotion(checking?'think':data.state==='completed'?'celebrate':data.state==='error'?'hint':'hover',checking?'context':'integration');
      presence.textContent=checking?(data.source==='codex'?'Codex arbeitet …':'NAVI arbeitet …'):data.state==='error'?'Anfrage fehlgeschlagen':data.state==='cancelled'?'Anfrage beendet':'Ich bin da';
      showBubble(data.message,2);syncMotion();return;
    }
    if(data.type==='speech'){showBubble(data.message,2);return;}
    if(data.type==='sound'){void soundPlayer.play(data.cue);return;}
    if(data.type==='audioFocus'){soundPlayer.configure({focused:data.focused});if(typeof data.focused==='boolean')hostFocused=data.focused;if(!hostFocused)hideBubble();return;}
    if (data.type === 'greeting' && greetingMotionIds.includes(data.motion)) {
      if (mode === 'auto' && !checking && document.activeElement !== prompt) {
        lastGreetingAt = Date.now();
        lastInteraction = elapsed;
        enterMotion(data.motion, 'feedback');
      }
      return;
    }
    if (data.type === 'settings' && typeof data.animationEnabled === 'boolean') {
      if(typeof data.bubbleEnabled==='boolean'){bubbleEnabled=data.bubbleEnabled;if(!bubbleEnabled)hideBubble();}
      if(typeof data.windowFocused==='boolean'){hostFocused=data.windowFocused;if(!hostFocused)hideBubble();}
      if(typeof data.soundEnabled==='boolean')soundEnabled=data.soundEnabled;
      if(Number.isFinite(data.soundVolume))volume=Math.max(0,Math.min(100,data.soundVolume));
      soundPlayer.configure({focused:data.windowFocused});syncSound();
      animationEnabled = data.animationEnabled;
      if (typeof data.respectReducedMotion === 'boolean') respectReducedMotion = data.respectReducedMotion;
      if (data.powerMode === 'eco' || data.powerMode === 'balanced') powerMode = data.powerMode;
      syncMotion(); render();
      return;
    }
    if (data.type === 'visibility' && typeof data.visible === 'boolean') {
      const returning = !hostVisible && data.visible;
      hostVisible = data.visible;
      if (returning && Date.now() - lastGreetingAt >= 15000 && mode === 'auto' && !checking && document.activeElement !== prompt) {
        lastGreetingAt = Date.now();
        lastInteraction = elapsed;
        enterMotion(selectGreeting(), 'feedback');
      }
      syncMotion();
      return;
    }
    if (data.type !== 'analysis' || !Array.isArray(data.hints)) return;
    checking = modelBusy;
    const hints = data.hints.filter(h => h && typeof h.text === 'string').slice(0, 5);
    scene.dataset.mood = hints.length ? 'hint' : 'idle';
    mode = 'auto';
    previewQueue = [];
    choice.value = 'auto';
    lastInteraction = elapsed;
    enterMotion(modelBusy ? 'think' : hints.length ? 'hint' : 'celebrate', modelBusy ? 'context' : 'feedback');
    if(!modelBusy)presence.textContent = hints.length ? 'Ein Tipp für dich' : 'Ich bin da';
    heading.textContent = hints.length ? 'Ein kleiner Hinweis …' : 'Sieht gut aus.';
    hint.replaceChildren();
    if (!hints.length) hint.textContent = 'Dein Prompt ist nach den aktivierten Heuristiken unauffällig.';
    else {
      const list = document.createElement('ul');
      for (const h of hints) {
        const item = document.createElement('li');
        item.textContent = h.text;
        list.appendChild(item);
      }
      hint.appendChild(list);
    }
    status.textContent = 'Lokale Analyse · ' + (Number.isSafeInteger(data.characterCount) && data.characterCount >= 0 ? data.characterCount : 0) + ' Zeichen';
  });

  enterMotion(selectGreeting());
  render();
  syncSound();
  syncMotion();
  vscode.postMessage({type: 'ready'});
})();
