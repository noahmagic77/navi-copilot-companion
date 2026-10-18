/** All runtime data enters through postMessage and textContent, never HTML. */
export function renderBrainWebview(nonce:string):string {
  return `<!doctype html>
<html lang="de"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'">
<style nonce="${nonce}">
body{font-family:var(--vscode-font-family,system-ui);color:var(--vscode-foreground,#e9efff);background:var(--vscode-editor-background,#151b29);padding:20px;max-width:1000px;margin:auto}
section,article{border:1px solid var(--vscode-panel-border,#34465d);border-radius:14px;padding:16px;margin:12px 0}
.flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;padding:0;border:0}.flow article{background:linear-gradient(135deg,#718cbb18,#8ce8dc10);border-top:3px solid #a6c9f0;margin:0}.flow p{line-height:1.6;overflow-wrap:anywhere}
pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}button{margin:5px;padding:9px 14px;background:var(--vscode-button-background,#365578);color:var(--vscode-button-foreground,#fff);border:1px solid transparent;border-radius:8px;cursor:pointer}button:focus-visible,summary:focus-visible{outline:2px solid var(--vscode-focusBorder,#9cb5ff)}h1{font-size:24px}h2{font-size:16px}summary{cursor:pointer}small{opacity:.8}
@media(prefers-reduced-motion:reduce){*{animation:none}}@media(forced-colors:active){.flow article{background:Canvas;border-color:CanvasText}}
</style></head><body>
<h1>NAVIs Gehirn <small>· Live</small></h1>
<p>Echte lokale Zustandsdaten. Keine internen Modellgedanken und keine Messung von Bewusstsein.</p>
<nav aria-label="Gehirnaktionen"><button data-command="navi.showProblems">Probleme zeigen</button><button data-command="navi.manageMemories">Erinnerungen</button><button data-command="navi.toggleInitiative">Eigeninitiative umschalten</button><button data-command="navi.stopListening">Mikrofon aus</button></nav>
<section class="flow" aria-label="Wahrnehmung zu Ausdruck">
<article><h2>1 · Wahrnehmen</h2><p id="perception">Noch unbekannt</p></article>
<article><h2>2 · Zustand</h2><p id="state">Noch unbekannt</p></article>
<article><h2>3 · Entscheiden</h2><p id="decision" role="status" aria-live="polite">Noch unbekannt</p></article>
<article><h2>4 · Ausdrücken</h2><p id="expression">Noch unbekannt</p></article>
</section>
<p>Gewählter Ausdruck bedeutet keine bestätigte Sichtbarkeit. Unbekannte Werte bleiben unbekannt.</p>
<main id="data"></main>
<script nonce="${nonce}">
const api=acquireVsCodeApi();
document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>api.postMessage({type:'command',command:button.dataset.command})));
const names={idle:'Bereit',acknowledging:'Anfrage empfangen',acknowledge:'Empfang bestätigen',waiting:'Auf Antwort warten',working:'Antwort bearbeiten',completed:'Antwort abgeschlossen · ungeprüft',cancelled:'Abgebrochen',error:'Fehler',offer:'Hilfe anbieten',uncertain:'Klärung anbieten',wait:'Abwarten',makeSpace:'Platz machen',returnHome:'Zurückkommen',attention:'Aufmerksamkeit',offerHelp:'Problemhilfe anbieten',curious:'Neugierig schauen',pleased:'Positive Rückmeldung',startled:'Überrascht reagieren',sleepy:'Zur Ruhe kommen',welcoming:'Wieder begrüßen',attentive:'Aufmerksam schauen'};
const labels={state:'Zustand und Quelle',decision:'Entscheidung mit Grund',actions:'Verfügbare Aktionen',presence:'Lebendige Dynamik · simulierte Animationsparameter',expression:'Gewählter Ausdruck',capabilities:'Fähigkeiten und Belege',memories:'Bestätigte Erinnerungen',voice:'Mikrofon und Datenweg',decisions:'Letzte 50 Entscheidungen · nur RAM'};
window.addEventListener('message',event=>{
  if(event.data?.type!=='snapshot')return;
  const data=event.data.data;
  document.getElementById('perception').textContent=(data.perception.editor?data.perception.editor.language+' · '+data.perception.editor.diagnostics+' Diagnosen':'Kein aktiver Texteditor')+' · '+(data.perception.focused?'Fenster fokussiert':'Fenster ohne Fokus');
  document.getElementById('state').textContent=(names[data.state.phase]||data.state.phase)+' · Quelle: '+(data.state.source||'noch keine');
  document.getElementById('decision').textContent=data.decision?(names[data.decision.action]||data.decision.action)+' — '+data.decision.reason:'Noch keine Entscheidung';
  document.getElementById('expression').textContent=names[data.expression.state]||data.expression.state;
  const root=document.getElementById('data'),historyOpen=root.querySelector('details')?.open===true;
  const historyFocused=root.contains(document.activeElement)&&document.activeElement.tagName==='SUMMARY';root.replaceChildren();
  for(const [key,label] of Object.entries(labels)){
    const section=document.createElement('section'),title=document.createElement('h2'),text=document.createElement('pre');
    title.textContent=label;text.textContent=JSON.stringify(data[key]??null,null,2);
    if(key==='decisions'){const details=document.createElement('details'),summary=document.createElement('summary');details.open=historyOpen;summary.textContent=label;details.append(summary,text);section.append(details);}
    else section.append(title,text);
    root.append(section);
  }
  if(historyFocused)root.querySelector('summary')?.focus({preventScroll:true});
});
api.postMessage({type:'ready'});
</script></body></html>`;
}
