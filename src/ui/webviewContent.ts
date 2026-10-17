import {fairyMarkup} from './fairyMarkup';
import {motionCatalog} from '../core/motionCatalog';

export interface WebviewResources {
  cspSource: string;
  nonce: string;
  styleUri: string;
  motionUri: string;
  scriptUri: string;
  animationEnabled: boolean;
  respectReducedMotion?: boolean;
  powerMode?: string;
  overlaySupported?: boolean;
  soundBaseUri?:string;
  soundScriptUri?:string;
  soundEnabled?:boolean;
  soundVolume?:number;
  bubbleEnabled?:boolean;
}

/** Only extension-owned URIs and markup enter this template; no prompt contents. */
export function renderNaviWebview(resources: WebviewResources): string {
  const attr = (value: string): string => value.replace(/[&"<>]/g, char => ({'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'}[char]!));
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${attr(resources.cspSource)}; script-src 'nonce-${attr(resources.nonce)}'; img-src ${attr(resources.cspSource)}; media-src ${attr(resources.cspSource)}; base-uri 'none'; form-action 'none';">
  <title>NAVI Companion</title>
  <link rel="stylesheet" href="${attr(resources.styleUri)}">
</head>
<body>
  <main>
    <section class="companion" aria-label="NAVI Fee">
      <div class="fairy-stage" data-bubble-enabled="${resources.bubbleEnabled!==false}">
      <div class="fairy-scene" id="fairy-scene" role="img" aria-label="Weiße leuchtende Fee mit vier Flügeln und kreisendem Sternenstaub" data-mood="idle" data-motion="paused" data-animation-enabled="${resources.animationEnabled}" data-respect-reduced-motion="${resources.respectReducedMotion===true}" data-power-mode="${resources.powerMode==='eco'?'eco':'balanced'}">
        <div class="aura" aria-hidden="true"></div>
        <div class="ground-glow" aria-hidden="true"></div>
        <div class="sparkle-field" id="sparkles" aria-hidden="true"></div>
        <div class="fairy-float" aria-hidden="true">${fairyMarkup}</div>
      </div>
      <aside class="fairy-bubble" id="speech-bubble" hidden aria-label="NAVI sagt">
        <button id="close-bubble" class="bubble-close" type="button" aria-label="Sprechblase ausschalten">×</button>
        <strong>NAVI</strong>
        <p id="bubble-text" role="status" aria-live="polite" aria-atomic="true"></p>
        <button id="bubble-chat" class="motion-toggle" type="button">Mit @navi sprechen</button>
      </aside>
      </div>
      <header class="brand">
        <h1>NAVI</h1>
        <p class="eyebrow">Ein kleines Licht an deiner Seite.</p>
      </header>
      <div class="companion-toolbar">
        <span class="presence" id="presence">Ich bin da</span>
        <button class="motion-toggle" id="toggle-animation" type="button" aria-pressed="false">
          <svg viewBox="0 0 12 12" aria-hidden="true"><path class="pause-symbol" d="M3 2h2v8H3zm4 0h2v8H7z"/><path class="play-symbol" d="M3 1.5 10 6 3 10.5z"/></svg>
          <span id="motion-label">Animation aus</span>
        </button>
        <button class="motion-toggle" id="toggle-power" type="button" aria-pressed="false">Sparmodus aus</button>
      </div>
      <div class="overlay-actions" ${resources.overlaySupported?'':'hidden'}>
        <button class="motion-toggle" id="show-overlay" type="button">Fee im Vordergrund anzeigen</button>
        <button class="motion-toggle" id="hide-overlay" type="button">Ausblenden</button>
      </div>
      <details class="sound-controls" data-sound-base="${attr(resources.soundBaseUri??'')}" data-sound-enabled="${resources.soundEnabled===true}" data-sound-volume="${Math.max(0,Math.min(100,resources.soundVolume??30))}">
        <summary>Feenklänge</summary>
        <button class="motion-toggle" id="toggle-sound" type="button" aria-pressed="false">Geräusche aus</button>
        <label for="sound-volume">Lautstärke <output id="sound-volume-value">30 %</output></label>
        <input id="sound-volume" type="range" min="0" max="100" step="1" value="30">
        <label for="sound-choice">Klang ausprobieren</label>
        <select id="sound-choice"><option value="greeting">Begrüßung</option><option value="discover">Neugier</option><option value="hint">Hinweis</option><option value="celebrate">Freude</option></select>
        <button class="motion-toggle" id="preview-sound" type="button">Anhören</button>
        <p id="sound-status" role="status">Eigene synthetische Feenlaute, lokal und ohne Mikrofon.</p>
      </details>
      <details class="motion-gallery">
        <summary>${motionCatalog.length} Bewegungen entdecken</summary>
        <label for="motion-choice">Bewegung ansehen</label>
        <select id="motion-choice"><option value="auto">Natürlich bewegen</option></select>
        <button class="motion-toggle" id="preview-all" type="button">Alle ansehen</button>
        <progress id="motion-progress" max="1" value="0" aria-label="Fortschritt der aktuellen Bewegung"></progress>
        <p id="motion-caption" role="status">NAVI bewegt sich von selbst und reagiert auf dich.</p>
      </details>
    </section>
    <section class="speech" aria-live="polite" aria-atomic="true">
      <strong id="heading">Hey, ich bin NAVI.</strong>
      <div id="hint"><p>Ich begleite dich beim Entwickeln. Wenn du möchtest, schaue ich mir deinen nächsten Prompt an.</p></div>
    </section>
    <details class="prompt-check" open>
      <summary>Prompt lokal prüfen</summary>
      <form id="check">
        <label for="prompt">Was möchtest du Copilot fragen?</label>
        <textarea id="prompt" rows="3" maxlength="100000" placeholder="Beschreibe dein nächstes Vorhaben …"></textarea>
        <button class="analyze-button" type="submit">Prompt analysieren</button>
      </form>
    </details>
    <p class="status" id="status" role="status">Lokale Analyse · Kein Versand</p>
  </main>
  <script nonce="${attr(resources.nonce)}" src="${attr(resources.motionUri)}"></script>
  <script nonce="${attr(resources.nonce)}" src="${attr(resources.soundScriptUri??'')}"></script>
  <script nonce="${attr(resources.nonce)}" src="${attr(resources.scriptUri)}"></script>
</body>
</html>`;
}
