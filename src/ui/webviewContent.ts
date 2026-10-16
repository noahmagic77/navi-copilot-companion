import {fairyMarkup} from './fairyMarkup';

export interface WebviewResources {
  cspSource: string;
  nonce: string;
  styleUri: string;
  scriptUri: string;
  animationEnabled: boolean;
}

/** Only extension-owned URIs and markup enter this template; no prompt contents. */
export function renderNaviWebview(resources: WebviewResources): string {
  const attr = (value: string): string => value.replace(/[&"<>]/g, char => ({'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'}[char]!));
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${attr(resources.cspSource)}; script-src 'nonce-${attr(resources.nonce)}'; img-src ${attr(resources.cspSource)}; base-uri 'none'; form-action 'none';">
  <title>NAVI Companion</title>
  <link rel="stylesheet" href="${attr(resources.styleUri)}">
</head>
<body>
  <main>
    <section class="companion" aria-label="NAVI Fee">
      <div class="fairy-scene" id="fairy-scene" role="img" aria-label="Weiße leuchtende Fee mit vier Flügeln und kreisendem Sternenstaub" data-mood="idle" data-motion="paused" data-animation-enabled="${resources.animationEnabled}">
        <div class="aura" aria-hidden="true"></div>
        <div class="ground-glow" aria-hidden="true"></div>
        <div class="sparkle-field" id="sparkles" aria-hidden="true"></div>
        <div class="fairy-float" aria-hidden="true">${fairyMarkup}</div>
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
      </div>
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
  <script nonce="${attr(resources.nonce)}" src="${attr(resources.scriptUri)}"></script>
</body>
</html>`;
}
