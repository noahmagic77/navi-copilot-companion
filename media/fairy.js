'use strict';

(() => {
  const vscode = acquireVsCodeApi();
  const {motions, sampleMotion, createRig, stepRig, frameRate} = window.NaviMotion;
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
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  let animationEnabled = scene.dataset.animationEnabled === 'true';
  let hostVisible = true;
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
  let mode = 'auto';
  let transitionPending = true;
  let previewQueue = [];
  let active = {id: 'greet', age: 0, source: 'auto', duration: 3.8};
  let pointer = {x: 0, y: 0};
  let pose = sampleMotion('hover', 0, 0);
  const rig = createRig(pose);
  const targetPose = sampleMotion('hover', 0, 0);
  const centers = Array(7).fill(pose);
  let lastParticleCount = 0;
  const trail = Array.from({length: 90}, () => ({at: -1, x: 0, y: 0}));
  let trailIndex = 0;
  const idleSequence = ['drift', 'curious', 'stretch', 'drift', 'figure8', 'curious', 'twirl'];
  let idleIndex = Math.floor(Math.random() * idleSequence.length);

  for (const motion of motions) {
    const option = document.createElement('option');
    option.value = motion.id;
    option.textContent = motion.label;
    choice.appendChild(option);
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
      (mode === 'all' ? 'Die zwölf Bewegungen laufen nacheinander.' : mode === 'single' ? 'Danach bewegt sich NAVI wieder von selbst.' : 'NAVI reagiert auf Eingaben und ruht bei längeren Pausen.');
    previewAll.textContent = mode === 'auto' ? 'Alle ansehen' : 'Vorschau beenden';
  }

  function enterMotion(id, source = 'auto', duration) {
    const definition = motions.find(motion => motion.id === id);
    if (!definition) return;
    active = {id, age: 0, source, duration: duration || definition.duration};
    transitionPending = true;
    scene.dataset.animation = id;
    nextFrameAt = 0;
    vscode.postMessage({type: 'motion', motion: id});
    if (source === 'preview') choice.value = id;
    updateCaption();
  }

  function resumeNaturalMotion() {
    mode = 'auto';
    previewQueue = [];
    choice.value = 'auto';
    enterMotion(checking ? 'think' : document.activeElement === prompt ? 'listen' : 'hover', checking || document.activeElement === prompt ? 'context' : 'auto', 16 + Math.random() * 8);
  }

  function advanceMotion(dt) {
    active.age += dt;
    if (mode === 'auto' && !checking && document.activeElement !== prompt && elapsed - lastInteraction > 90 && active.id !== 'rest') {
      enterMotion('rest', 'context');
    }
    if (active.age < active.duration) return;
    if (active.source === 'preview') {
      const next = previewQueue.shift();
      if (next) enterMotion(next, 'preview');
      else resumeNaturalMotion();
    } else if (active.source === 'context') {
      // These poses are driven by the continuous clock, so looping is seamless.
      active.age = active.duration;
    } else if (active.source === 'feedback' || active.id !== 'hover') {
      resumeNaturalMotion();
    } else {
      enterMotion(idleSequence[idleIndex++ % idleSequence.length]);
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
    core.style.transform = `scale(${.985 + (pose.glow - 1) * .13})`;
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
      sampleMotion(active.id, active.age, elapsed, pointer, targetPose);
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
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = null;
    nextFrameAt = 0;
    powerToggle.textContent = powerMode === 'eco' ? 'Sparmodus an' : 'Sparmodus aus';
    powerToggle.setAttribute('aria-pressed', String(powerMode === 'eco'));
    const enabled = animationEnabled && !reducedMotion.matches;
    const visible = hostVisible && !document.hidden;
    scene.dataset.motion = !visible ? 'hidden' : enabled ? 'running' : 'paused';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.disabled = reducedMotion.matches;
    choice.disabled = !enabled;
    previewAll.disabled = !enabled;
    motionLabel.textContent = reducedMotion.matches ? 'Bewegung reduziert' : enabled ? 'Animation an' : 'Animation aus';
    toggle.title = reducedMotion.matches ? 'Die Systemeinstellung für reduzierte Bewegung ist aktiv.' : enabled ? 'Animation pausieren' : 'Animation einschalten';
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
    if (data.type === 'settings' && typeof data.animationEnabled === 'boolean') {
      animationEnabled = data.animationEnabled;
      if (data.powerMode === 'eco' || data.powerMode === 'balanced') powerMode = data.powerMode;
      syncMotion(); render();
      return;
    }
    if (data.type === 'visibility' && typeof data.visible === 'boolean') {
      hostVisible = data.visible;
      syncMotion();
      return;
    }
    if (data.type !== 'analysis' || !Array.isArray(data.hints)) return;
    checking = false;
    const hints = data.hints.filter(h => h && typeof h.text === 'string').slice(0, 5);
    scene.dataset.mood = hints.length ? 'hint' : 'idle';
    mode = 'auto';
    previewQueue = [];
    choice.value = 'auto';
    lastInteraction = elapsed;
    enterMotion(hints.length ? 'hint' : 'celebrate', 'feedback');
    presence.textContent = hints.length ? 'Ein Tipp für dich' : 'Ich bin da';
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

  enterMotion('greet');
  render();
  syncMotion();
  vscode.postMessage({type: 'ready'});
})();
