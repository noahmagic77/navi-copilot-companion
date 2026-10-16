'use strict';
(function () {
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const formatNum = (n) => typeof n === 'number' && Number.isFinite(n) ? new Intl.NumberFormat('de-DE').format(n) : '—';
  $('check').addEventListener('click', () => vscode.postMessage({ type: 'check', prompt: $('prompt').value }));
  $('copy').addEventListener('click', () => vscode.postMessage({ type: 'copyTemplate', prompt: $('prompt').value }));
  $('install-hooks').addEventListener('click', () => vscode.postMessage({ type: 'command', command: 'navi.installHooks' }));
  $('enable-otel').addEventListener('click', () => vscode.postMessage({ type: 'command', command: 'navi.enableTelemetry' }));
  $('remove-hooks').addEventListener('click', () => vscode.postMessage({ type: 'command', command: 'navi.removeHooks' }));
  $('disable-otel').addEventListener('click', () => vscode.postMessage({ type: 'command', command: 'navi.disableTelemetry' }));
  $('clear-data').addEventListener('click', () => vscode.postMessage({ type: 'command', command: 'navi.clearData' }));
  $('reindex').addEventListener('click', () => vscode.postMessage({ type: 'command', command: 'navi.reindex' }));
  $('export-data').addEventListener('click', () => vscode.postMessage({ type: 'command', command: 'navi.exportData' }));
  $('demo').addEventListener('click', () => vscode.postMessage({ type: 'command', command: 'navi.demo' }));
  // Do not persist draft prompts in webview state or workspace storage.
  function showManual(result, advice) {
    const container = $('manual-result');
    container.replaceChildren();
    const title = document.createElement('h3');
    title.textContent = `${result.words || 0} Wörter · ${advice.length} mögliche Verbesserung(en)`;
    container.append(title);
    if (!advice.length) {
      const p = document.createElement('p'); p.className = 'result-item';
      p.textContent = result.words ? 'Keine Auffälligkeit mit den vorhandenen Heuristiken. Qualität nicht garantiert.' : 'Bitte gib zuerst einen Prompt ein.';
      container.append(p);
    }
    for (const entry of advice) {
      const p = document.createElement('p'); p.className = 'result-item'; p.textContent = entry.message;
      container.append(p);
    }
    container.classList.add('visible');
  }
  function showEvents(events) {
    const list = $('event-list');
    list.replaceChildren();
    $('advice-count').textContent = String(events.length);
    if (!events.length) {
      const placeholder = document.createElement('div'); placeholder.className = 'empty-state';
      placeholder.textContent = 'Noch keine Hinweise. Nutze „Demo-Ereignis“ oder verbinde Copilot-Hooks.';
      list.append(placeholder); return;
    }
    for (const entry of events.slice(0, 8)) {
      const card = document.createElement('article'); card.className = 'event-item';
      const head = document.createElement('div'); head.className = 'event-top';
      const source = document.createElement('span'); source.textContent = entry.source || 'NAVI';
      const at = document.createElement('span'); at.textContent = entry.at ? new Date(entry.at).toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) : ''; 
      head.append(source, at); card.append(head);
      for (const advice of (entry.advice || []).slice(0, 3)) {
        const p = document.createElement('p'); p.textContent = advice.message || ''; card.append(p);
      }
      list.append(card);
    }
    const newest = events[0]?.advice?.[0]?.message;
    if (newest) $('fairy-message').textContent = newest;
  }
  function renderState(state) {
    const tokens = state.tokens || {};
    $('token-total').textContent = (tokens.calls || 0) > 0 ? formatNum((tokens.input || 0) + (tokens.output || 0)) : '—';
    $('call-count').textContent = formatNum(tokens.calls || 0);
    $('prompt-count').textContent = formatNum(state.hookCount || 0);
    $('connection-label').textContent = state.hookStatus || state.telemetryStatus ? 'LIVE SIGNALS' : 'DEMO MODE';
    $('storage-state').textContent = state.storage?.sqlite ? 'SQLite + JSONL' : 'JSONL (SQLite nicht verfügbar)';
    $('storage-state').title = state.storage?.indexError || 'Index auf dem lokalen Rechner verfügbar';
    $('session-count').textContent = formatNum(state.storage?.sessions || 0);
    $('hook-state').textContent = state.hookStatus ? 'BEREIT' : 'AUS';
    $('hook-state').classList.toggle('active', Boolean(state.hookStatus));
    $('otel-state').textContent = state.telemetryStatus ? 'AKTIV' : 'AUS';
    $('otel-state').classList.toggle('active', Boolean(state.telemetryStatus));
    $('install-hooks').textContent = state.hookStatus ? 'Hooks eingerichtet' : 'Hooks einrichten';
    $('remove-hooks').disabled = !state.hookStatus;
    $('enable-otel').textContent = state.telemetryStatus ? 'OTel aktiviert' : 'OTel aktivieren';
    $('disable-otel').disabled = !state.telemetryStatus;
    document.body.classList.toggle('no-animation', state.animated === false);
    showEvents(Array.isArray(state.events) ? state.events : []);
  }
  window.addEventListener('message', e => {
    const message = e.data;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'state') renderState(message);
    if (message.type === 'manualResult') showManual(message.result || {}, message.advice || []);
    if (message.type === 'copied') $('copy').textContent = '✓ Kopiert';
  });
  vscode.postMessage({ type: 'ready' });
})();
