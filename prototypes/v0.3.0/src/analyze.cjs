'use strict';

// Deterministic offline rules. No network, no SDK calls, no prompts persisted.
const TOPICS = [
  ['auth', /\b(auth|oauth|oauth2|sso|login|signin|anmeld|token\s*valid|jwt|passwort|password)\b/i],
  ['database', /\b(sql|datenbank|database|postgres|schema|migration|mongodb|db\b)\b/i],
  ['testing', /\b(tests?|unit.?test|jest|vitest|pytest|testfall|unittest)\b/i],
  ['ui', /\b(ui|ux|frontend|react|webview|css|html|button|komponente|layout)\b/i],
  ['devops', /\b(ci\/cd|deployment|deploy|docker|kubernetes|pipeline|github.actions)\b/i],
  ['performance', /\b(performance|latenz|speicherverbrauch|profiling|memory.leak|optimier)\b/i],
  ['documentation', /\b(readme|dokumentation|documentation|docs|changelog)\b/i]
];

const ADVICE = Object.freeze({
  'clarify': 'Das Ziel wirkt unpräzise. Nenne das konkrete Problem und das gewünschte Verhalten.',
  'scope': '„Alles“ kann den Suchraum vergrößern. Grenze Dateien oder Module ein.',
  'relevant-files': 'Verweise auf relevante Dateien oder Symbole, falls bekannt (z. B. #file).',
  'define-acceptance': 'Nenne ein überprüfbares Ergebnis oder einen Test für „fertig“.',
  'structure': 'Der Prompt ist lang. Gliedere ihn nach Ziel, Kontext und Akzeptanzkriterien.',
  'fresh-chat': 'Neues unabhängiges Thema erkannt. Ein neuer Chat könnte Kontext sparen.'
});

function topicOf(raw) {
  const text = String(raw || '');
  for (const [name, regex] of TOPICS) if (regex.test(text)) return name;
  return 'unclassified';
}

function analyzePrompt(raw) {
  const prompt = String(raw || '').slice(0, 100000);
  const words = (prompt.trim().match(/\S+/g) || []).length;
  if (!words) return { words: 0, category: 'unclassified', flags: [] };
  const flags = [];
  const vague = /\b(mach(?:e)?|make|fix|verbesser|improve|optimiere|better|besser|geht nicht)\b/i.test(prompt);
  if (words < 16 && vague) flags.push('clarify');
  if (/\b(alles|everything|komplett|gesamte(?:n|s)?|ganze\s+codebase)\b/i.test(prompt)) flags.push('scope');
  if (!/(?:\b[\w.-]+\.(?:tsx?|jsx?|py|java|json|go|cs|rs|vue|html|css|md)\b|#\w+|\bdatei(?:en)?\b|\bfile(?:s)?\b|\bmodul\b|\bfunktion\b|\bclass\b)/i.test(prompt)) flags.push('relevant-files');
  if (!/\b(?:test(?:s|en|fälle?)?|erwartet|akzeptanz|fertig|ergebnis|should|verify|ensure|acceptance|expected|prüf(?:e|en)|muss|ohne)\b/i.test(prompt)) flags.push('define-acceptance');
  if (words > 160) flags.push('structure');
  return { words, category: topicOf(prompt), flags: flags.slice(0, 4) };
}

function promptTemplate(raw) {
  const original = String(raw || '').trim().slice(0, 20000);
  return `Ziel:\n${original}\n\nBetroffene Dateien/Module: [angeben, falls bekannt]\nErwartetes Ergebnis / Akzeptanzkriterien: [konkretisieren]\nRahmenbedingungen / Nicht ändern: [angeben]`;
}

function adviceFor(ids) {
  return (Array.isArray(ids) ? ids : []).filter(id => Object.hasOwn(ADVICE, id)).map(id => ({ id, message: ADVICE[id] }));
}

module.exports = { analyzePrompt, topicOf, promptTemplate, adviceFor, ADVICE };
