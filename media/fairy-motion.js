'use strict';

// Shared by the webview and deterministic Node tests; no browser dependencies.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NaviMotion = api;
})(globalThis, () => {
  const TAU = Math.PI * 2;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const motions = Object.freeze([
    {id: 'greet', label: 'Begrüßen', duration: 3.8},
    {id: 'hover', label: 'Ruhig schweben', duration: 10},
    {id: 'drift', label: 'Seitlich gleiten', duration: 8},
    {id: 'curious', label: 'Neugierig umsehen', duration: 5.4},
    {id: 'figure8', label: 'Eine kleine Acht fliegen', duration: 9},
    {id: 'stretch', label: 'Flügel strecken', duration: 5.2},
    {id: 'twirl', label: 'Sanft drehen', duration: 5.6},
    {id: 'listen', label: 'Aufmerksam zuhören', duration: 6},
    {id: 'think', label: 'Nachdenken', duration: 6},
    {id: 'hint', label: 'Einen Hinweis geben', duration: 4.8},
    {id: 'celebrate', label: 'Sich freuen', duration: 4.2},
    {id: 'rest', label: 'Ausruhen', duration: 9}
  ].map(Object.freeze));

  function sampleMotion(id, age, elapsed, pointer = {x: 0, y: 0}) {
    const definition = motions.find(motion => motion.id === id) || motions[1];
    const t = clamp(age / definition.duration, 0, 1);
    const envelope = Math.sin(Math.PI * t) ** 2;
    const angle = t * TAU;
    const pose = {
      x: Math.sin(elapsed * .63) * 1.8,
      y: Math.sin(elapsed * 1.25) * 3,
      roll: Math.sin(elapsed * .72) * 1.5,
      yaw: Math.sin(elapsed * .48) * 2,
      scale: 1,
      glow: 1 + Math.sin(elapsed * 1.4) * .06,
      wingSpeed: 1, wingAmplitude: 1, wingFold: 0, wingSpread: 0,
      orbitRadius: 1, orbitSpeed: 1, scatter: 0,
      gazeX: 0, gazeY: 0
    };
    switch (definition.id) {
      case 'greet': {
        const wave = Math.sin(age * 5) * Math.exp(-age * .7);
        pose.y += 13 * (1 - t) ** 3 - wave * 8;
        pose.roll += wave * 7;
        pose.wingSpeed = 1.15;
        pose.glow += envelope * .16;
        pose.scatter = envelope * .25;
        break;
      }
      case 'drift':
        pose.x += Math.sin(angle) * 17;
        pose.y -= envelope * 4;
        pose.roll -= Math.sin(angle) * 6;
        pose.yaw += Math.cos(angle) * envelope * 9;
        break;
      case 'curious': {
        const direction = Math.sin(angle) * 9 + clamp(pointer.x, -1, 1) * 9;
        pose.yaw += direction;
        pose.roll += direction * .35;
        pose.x += direction * .22;
        pose.gazeX = direction * .18;
        pose.gazeY = clamp(pointer.y, -1, 1) * 2;
        pose.wingSpeed = .88;
        break;
      }
      case 'figure8':
        pose.x += Math.sin(angle) * 21;
        pose.y += Math.sin(angle * 2) * 8;
        pose.roll -= Math.sin(angle * 2) * 8;
        pose.wingSpeed = 1.12;
        pose.orbitRadius = .88;
        break;
      case 'stretch':
        pose.wingSpread = envelope;
        pose.wingAmplitude = 1 - envelope * .8;
        pose.wingSpeed = 1 - envelope * .55;
        pose.y -= envelope * 4;
        pose.glow += envelope * .08;
        break;
      case 'twirl':
        // A full roll keeps the spherical core round; the rig unwraps angles.
        pose.roll += 360 * (t * t * (3 - 2 * t));
        pose.y -= envelope * 9;
        pose.wingAmplitude = .75;
        pose.wingSpeed = 1.2;
        pose.orbitSpeed = 1.35;
        break;
      case 'listen':
        pose.x += 5;
        pose.y += 6;
        pose.roll += 7;
        pose.gazeY = 3;
        pose.wingSpeed = .8;
        pose.orbitSpeed = .7;
        pose.orbitRadius = .9;
        break;
      case 'think':
        pose.y -= 5;
        pose.roll += Math.sin(elapsed * 1.9) * 4;
        pose.yaw += Math.sin(elapsed * 1.4) * 7;
        pose.wingSpeed = 1.08;
        pose.orbitRadius = .72;
        pose.orbitSpeed = 1.8;
        pose.glow += Math.sin(elapsed * 3.1) * .08;
        break;
      case 'hint':
        pose.y -= envelope * 11;
        pose.scale += envelope * .05;
        pose.glow += envelope * .25;
        pose.orbitRadius = 1 + envelope * .15;
        pose.wingSpeed = 1.12;
        pose.gazeY = 2;
        break;
      case 'celebrate':
        pose.y -= envelope * 14 + Math.sin(angle * 2) * envelope * 3;
        pose.roll += Math.sin(angle) * 11;
        pose.wingSpeed = 1.35;
        pose.scatter = envelope * .85;
        pose.glow += envelope * .22;
        break;
      case 'rest':
        pose.y += 12;
        pose.scale = .94;
        pose.glow = .76 + Math.sin(elapsed * .8) * .05;
        pose.wingSpeed = .38;
        pose.wingAmplitude = .22;
        pose.wingFold = .72;
        pose.orbitSpeed = .35;
        pose.orbitRadius = .82;
        break;
    }
    return pose;
  }

  function createRig(pose = sampleMotion('hover', 0, 0)) {
    return Object.fromEntries(Object.entries(pose).map(([key, value]) => [key, {value, velocity: 0}]));
  }

  function nearestAngle(current, target) {
    return current + ((target - current + 180) % 360 + 360) % 360 - 180;
  }

  function stepRig(rig, target, delta) {
    const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, .05);
    const result = {};
    for (const [key, state] of Object.entries(rig)) {
      const goal = key === 'roll' || key === 'yaw' ? nearestAngle(state.value, target[key]) : target[key];
      const omega = key === 'x' || key === 'y' ? 11 : 13;
      const offset = state.value - goal;
      const decay = Math.exp(-omega * dt);
      const temporary = (state.velocity + omega * offset) * dt;
      state.value = goal + (offset + temporary) * decay;
      state.velocity = (state.velocity - omega * temporary) * decay;
      result[key] = state.value;
    }
    return result;
  }

  return Object.freeze({motions, sampleMotion, createRig, stepRig, nearestAngle});
});
