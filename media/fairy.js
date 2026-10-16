'use strict';

(() => {
  const vscode = acquireVsCodeApi();
  const scene = document.getElementById('fairy-scene');
  const field = document.getElementById('sparkles');
  const toggle = document.getElementById('toggle-animation');
  const motionLabel = document.getElementById('motion-label');
  const presence = document.getElementById('presence');
  const heading = document.getElementById('heading');
  const hint = document.getElementById('hint');
  const status = document.getElementById('status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animationEnabled = scene.dataset.animationEnabled === 'true';
  let hostVisible = true;
  let frame = 0;
  let lastFrame = 0;
  let elapsed = 0;

  // A fixed pool; no continuously created particles, timers or network requests.
  const particles = Array.from({length: 28}, (_, i) => {
    const element = document.createElement('span');
    element.className = i % 6 === 0 ? 'sparkle sparkle--star' : 'sparkle';
    field.appendChild(element);
    return {element, phase: i * 2.399963, radius: 72 + (i % 5) * 11, speed: .23 + (i % 4) * .035};
  });

  function drawParticles(time) {
    const scale = scene.clientWidth / 320;
    particles.forEach((particle, i) => {
      const angle = particle.phase + time * particle.speed;
      const depth = Math.cos(angle);
      const x = Math.sin(angle) * particle.radius;
      const y = depth * particle.radius * .36 - x * .25 + Math.sin(angle * 1.6 + i) * 9;
      const twinkle = .56 + Math.sin(time * 1.5 + particle.phase) * .25;
      particle.element.style.transform = `translate(${x * scale}px, ${y * scale}px) scale(${(.65 + (depth + 1) * .22) * scale})`;
      particle.element.style.opacity = String(twinkle * (.58 + (depth + 1) * .21));
      particle.element.style.zIndex = depth > 0 ? '3' : '1';
    });
  }

  function tick(timestamp) {
    // Render at most 30 times per second and freeze elapsed time while hidden.
    if (!lastFrame) lastFrame = timestamp;
    const delta = timestamp - lastFrame;
    if (delta >= 1000 / 30) {
      elapsed += Math.min(delta, 80) / 1000;
      lastFrame = timestamp;
      drawParticles(elapsed);
    }
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    const enabled = animationEnabled && !reducedMotion.matches;
    const visible = hostVisible && !document.hidden;
    scene.dataset.motion = !visible ? 'hidden' : enabled ? 'running' : 'paused';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.disabled = reducedMotion.matches;
    motionLabel.textContent = reducedMotion.matches ? 'Bewegung reduziert' : enabled ? 'Animation an' : 'Animation aus';
    toggle.title = reducedMotion.matches
      ? 'Die Systemeinstellung für reduzierte Bewegung ist aktiv.'
      : enabled ? 'Animation pausieren' : 'Animation einschalten';
    if (enabled && visible) frame = requestAnimationFrame(tick);
  }

  toggle.addEventListener('click', () => {
    animationEnabled = !animationEnabled;
    syncMotion();
    vscode.postMessage({type: 'setAnimation', enabled: animationEnabled});
  });
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  new ResizeObserver(() => drawParticles(elapsed)).observe(scene);

  document.getElementById('check').addEventListener('submit', event => {
    event.preventDefault();
    const input = document.getElementById('prompt').value;
    if (input.trim()) vscode.postMessage({type: 'check', text: input});
  });

  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'settings' && typeof data.animationEnabled === 'boolean') {
      animationEnabled = data.animationEnabled;
      syncMotion();
      return;
    }
    if (data.type === 'visibility' && typeof data.visible === 'boolean') {
      hostVisible = data.visible;
      syncMotion();
      return;
    }
    if (data.type !== 'analysis' || !Array.isArray(data.hints)) return;
    const hints = data.hints.filter(h => h && typeof h.text === 'string').slice(0, 5);
    scene.dataset.mood = hints.length ? 'hint' : 'idle';
    presence.textContent = hints.length ? 'Ein Tipp für dich' : 'Ich bin da';
    heading.textContent = hints.length ? 'Ein kleiner Hinweis …' : 'Sieht gut aus.';
    hint.replaceChildren();
    if (!hints.length) {
      hint.textContent = 'Dein Prompt ist nach den aktivierten Heuristiken unauffällig.';
    } else {
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

  drawParticles(0);
  syncMotion();
  vscode.postMessage({type: 'ready'});
})();
