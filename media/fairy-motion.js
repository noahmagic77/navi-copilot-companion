'use strict';

// Shared by the webview and deterministic Node tests; no browser dependencies.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NaviMotion = api;
})(globalThis, () => {
  const TAU = Math.PI * 2;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  // Eight choreographic families, each with eleven named path/gesture variants.
  // These parameters are also used to generate the native catalogue.
  const families = [
    ['Gleiten', [
      ['sway-breeze','In einer Brise wiegen'], ['sway-leaf','Wie ein Blatt gleiten'],
      ['sway-feather','Federleicht pendeln'], ['sway-ribbon','Ein Band nachzeichnen'],
      ['sway-cloud','Auf einer Wolke wiegen'], ['sway-reed','Wie Schilf schwingen'],
      ['sway-sail','Mit dem Wind segeln'], ['sway-petal','Wie ein Blütenblatt schweben'],
      ['sway-cradle','Sich sanft wiegen'], ['sway-tide','Mit der Flut treiben'],
      ['sway-lullaby','Im Wiegenlied schweben']
    ]],
    ['Bögen', [
      ['arc-sunrise','Einen Sonnenbogen fliegen'], ['arc-moon','Einen Mondbogen fliegen'],
      ['arc-rainbow','Einen Regenbogen ziehen'], ['arc-bridge','Eine Luftbrücke zeichnen'],
      ['arc-vault','Unter einem Lichtbogen gleiten'], ['arc-comet','Wie ein Komet vorbeiziehen'],
      ['arc-dawn','Im Morgenbogen aufsteigen'], ['arc-dusk','Im Abendbogen sinken'],
      ['arc-leap','Einen weiten Sprung wagen'], ['arc-return','In einem Bogen zurückkehren'],
      ['arc-crescent','Eine Sichel nachzeichnen']
    ]],
    ['Hüpfen', [
      ['bob-dewdrop','Wie ein Tautropfen hüpfen'], ['bob-pebble','Über Luftsteine hüpfen'],
      ['bob-skip','Fröhlich springen'], ['bob-spring','Federnd aufsteigen'],
      ['bob-bubble','Wie eine Blase steigen'], ['bob-dance','Im Takt hüpfen'],
      ['bob-step','Kleine Luftschritte machen'], ['bob-rain','Regentropfen nachtanzen'],
      ['bob-heart','Im Herzschlag schweben'], ['bob-jump','Einen Freudensprung machen'],
      ['bob-tip','Auf Zehenspitzen hüpfen']
    ]],
    ['Kreisen', [
      ['orbit-halo','Einen Halo umrunden'], ['orbit-clock','Im Uhrzeigersinn kreisen'],
      ['orbit-back','Gegen den Uhrzeigersinn kreisen'], ['orbit-ellipse','Eine Ellipse fliegen'],
      ['orbit-satellite','Wie ein Satellit kreisen'], ['orbit-pool','Einen Teich umrunden'],
      ['orbit-wreath','Einen Kranz zeichnen'], ['orbit-wheel','Ein Lichtrad drehen'],
      ['orbit-pearl','Eine Perle umkreisen'], ['orbit-loop','Eine Luftschlaufe ziehen'],
      ['orbit-compass','Den Kompass umrunden']
    ]],
    ['Spuren', [
      ['trace-wave','Eine Welle zeichnen'], ['trace-zigzag','Einen weichen Zickzack fliegen'],
      ['trace-stitch','Eine Lichtnaht ziehen'], ['trace-stream','Einem Bachlauf folgen'],
      ['trace-lightning','Einen sanften Blitz zeichnen'], ['trace-stairs','Luftstufen nachzeichnen'],
      ['trace-meander','Durch die Luft mäandern'], ['trace-thread','Einen Faden spinnen'],
      ['trace-snake','Eine Schlangenlinie fliegen'], ['trace-ripple','Kleine Wellen schlagen'],
      ['trace-weave','Ein Lichtgewebe weben']
    ]],
    ['Spiralen', [
      ['spiral-shell','Eine Muschelspirale fliegen'], ['spiral-whirl','Einen Wirbel zeichnen'],
      ['spiral-bloom','Wie eine Blüte aufgehen'], ['spiral-galaxy','Eine Galaxie umtanzen'],
      ['spiral-vortex','In einem Lichtwirbel kreisen'], ['spiral-unfurl','Sich spiralförmig entfalten'],
      ['spiral-coil','Eine Feder nachzeichnen'], ['spiral-wisp','Wie ein Irrlicht wirbeln'],
      ['spiral-rose','Eine Lichtrose zeichnen'], ['spiral-fountain','Eine Lichtfontäne tanzen'],
      ['spiral-home','Im Wirbel heimkehren']
    ]],
    ['Leuchten', [
      ['light-breathe','Ruhig aufleuchten'], ['light-beacon','Wie ein Leuchtfeuer strahlen'],
      ['light-firefly','Wie ein Glühwürmchen blinken'], ['light-star','Wie ein Stern funkeln'],
      ['light-lantern','Wie eine Laterne schwingen'], ['light-heart','Im Herzschlag leuchten'],
      ['light-shimmer','Sanft schimmern'], ['light-dawn','Wie Morgenlicht erwachen'],
      ['light-signal','Ein Lichtsignal geben'], ['light-aura','Die Aura ausbreiten'],
      ['light-goodnight','Zum Abschied glimmen']
    ]],
    ['Gesten', [
      ['gesture-nod','Zustimmend nicken'], ['gesture-bow','Sich verbeugen'],
      ['gesture-peek','Vorsichtig hervorschauen'], ['gesture-lean','Sich zur Seite neigen'],
      ['gesture-shake','Den Kopf schütteln'], ['gesture-welcome','Einladend schwingen'],
      ['gesture-proud','Sich stolz aufrichten'], ['gesture-shy','Schüchtern zurückweichen'],
      ['gesture-wonder','Staunend aufblicken'], ['gesture-thanks','Sich dankbar verneigen'],
      ['gesture-wave','Zum Abschied winken']
    ]]
  ];
  const additional = families.flatMap(([category, entries], kind) => entries.map(([id, label], index) => ({
    id, label, category, duration: 4.4 + (index % 5) * .6 + kind * .15,
    profile: Object.freeze({kind, ax: 8 + index * 1.35, ay: 6 + (index * 3 % 11),
      cycles: 1 + index % 3, phase: index * Math.PI / 7,
      tilt: (index % 2 ? -1 : 1) * (5 + index)})
  })));
  const greetings = [
    ['greet-wave','Mit den Flügeln winken',7], ['greet-bow','Zur Begrüßung verbeugen',7],
    ['greet-hop','Freudig heranhüpfen',2], ['greet-circle','Einen Willkommenskreis fliegen',3],
    ['greet-sun','Mit einem Sonnenbogen begrüßen',1], ['greet-spark','Zur Begrüßung funkeln',6],
    ['greet-spiral','Im Willkommenswirbel erscheinen',5], ['greet-sway','Sanft zur Begrüßung wiegen',0],
    ['greet-dance','Einen Willkommenstanz machen',4], ['greet-peek','Neugierig zur Begrüßung hervorschauen',7]
  ].map(([id,label,kind],index)=>({id,label,category:'Begrüßungen',duration:3.4+index*.18,
    profile:Object.freeze({kind,ax:10+index,ay:8+index*.6,cycles:1+index%3,phase:index*Math.PI/6,tilt:(index%2?-1:1)*(8+index)})}));
  const greetingMotionIds = Object.freeze(greetings.map(m=>m.id));
  function createGreetingSelector(random = Math.random) {
    let bag = greetingMotionIds.slice(0, 0);
    let previous = '';
    return () => {
      if (!bag.length) {
        bag = greetingMotionIds.slice();
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        if (bag[bag.length - 1] === previous) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
      previous = bag.pop();
      return previous;
    };
  }
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
  ].map(motion => ({...motion, category: 'Grundbewegungen'})).concat(additional,greetings).map(Object.freeze));

  const byId = new Map(motions.map(motion => [motion.id, motion]));
  const idleMotionIds = Object.freeze(['drift','curious','stretch','figure8','twirl',
    ...additional.filter(motion => ['Gleiten','Bögen','Kreisen'].includes(motion.category)).map(motion => motion.id)]);
  const neutralPointer = Object.freeze({x: 0, y: 0});
  const rigCache = new WeakMap();

  function sampleMotion(id, age, elapsed, pointer = neutralPointer, output = {}) {
    const definition = byId.get(id) || motions[1];
    const t = clamp(age / definition.duration, 0, 1);
    const envelope = Math.sin(Math.PI * t) ** 2;
    const angle = t * TAU;
    const pose = Object.assign(output, {
      x: Math.sin(elapsed * .63) * 1.8,
      y: Math.sin(elapsed * 1.25) * 3,
      roll: Math.sin(elapsed * .72) * 1.5,
      yaw: Math.sin(elapsed * .48) * 2,
      scale: 1,
      glow: 1 + Math.sin(elapsed * 1.4) * .06,
      wingSpeed: 1, wingAmplitude: 1, wingFold: 0, wingSpread: 0,
      orbitRadius: 1, orbitSpeed: 1, scatter: 0,
      gazeX: 0, gazeY: 0
    });
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
      default: {
        const p = definition.profile;
        if (!p) break;
        const a = angle * p.cycles, wave = Math.sin(a + p.phase), cross = Math.cos(a + p.phase);
        const breathe = (1 - Math.cos(a)) * .5;
        switch (p.kind) {
          case 0: pose.x += p.ax * wave * envelope; pose.y += p.ay * Math.sin(a * 2) * envelope * .4; break;
          case 1: pose.x += p.ax * (2 * t - 1) * envelope; pose.y -= p.ay * envelope; break;
          case 2: pose.x += p.ax * Math.sin(angle) * envelope * .5; pose.y -= p.ay * breathe * envelope; break;
          case 3: pose.x += p.ax * cross * envelope; pose.y += p.ay * wave * envelope; break;
          case 4: pose.x += p.ax * Math.sin(a) * envelope; pose.y += p.ay * Math.sin(a * 2 + p.phase) * envelope; break;
          case 5: pose.x += p.ax * cross * envelope * t; pose.y += p.ay * wave * envelope * t; break;
          case 6: pose.x += p.ax * wave * envelope * .15; pose.y -= p.ay * breathe * envelope * .3; pose.glow += breathe * envelope * .4; pose.scatter = breathe * envelope * .65; break;
          case 7: pose.x += p.ax * wave * envelope * .25; pose.y += p.ay * cross * envelope * .5; pose.gazeX = wave * 2; pose.gazeY = cross * 2; pose.wingSpread = breathe * envelope * .5; break;
        }
        pose.roll += p.tilt * wave * envelope;
        pose.yaw += p.tilt * cross * envelope * .5;
        pose.scale += .025 * breathe * envelope;
        pose.wingSpeed = 1 + .18 * wave * envelope;
        pose.wingAmplitude = 1 - .25 * breathe * envelope;
        pose.orbitSpeed = 1 + .35 * breathe * envelope;
        break;
      }
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
    const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, .1);
    let cache = rigCache.get(rig);
    if (!cache) {cache = {keys: Object.keys(rig), result: {}}; rigCache.set(rig, cache);}
    const result = cache.result;
    const positionDecay = Math.exp(-11 * dt), otherDecay = Math.exp(-13 * dt);
    for (const key of cache.keys) {
      const state = rig[key];
      const goal = key === 'roll' || key === 'yaw' ? nearestAngle(state.value, target[key]) : target[key];
      const omega = key === 'x' || key === 'y' ? 11 : 13;
      const offset = state.value - goal;
      const decay = key === 'x' || key === 'y' ? positionDecay : otherDecay;
      const temporary = (state.velocity + omega * offset) * dt;
      state.value = goal + (offset + temporary) * decay;
      state.velocity = (state.velocity - omega * temporary) * decay;
      result[key] = state.value;
    }
    return result;
  }

  function frameRate(id, eco = false, age = Infinity) {
    if (age < .7) return eco ? 24 : 30;
    if (id === 'rest') return 10;
    if (id === 'hover' || id === 'listen') return eco ? 12 : 15;
    return eco ? 24 : 30;
  }
  return Object.freeze({motions, idleMotionIds, greetingMotionIds, createGreetingSelector, sampleMotion, createRig, stepRig, nearestAngle, frameRate});
});
