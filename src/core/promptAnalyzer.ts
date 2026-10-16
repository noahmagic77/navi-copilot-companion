/** Deterministic, offline and side-effect-free NAVI prompt analysis. */
export type HintCode = 'UNCLEAR_GOAL' | 'MISSING_SCOPE' | 'MISSING_DONE_CRITERIA' | 'TOPIC_CHANGE' | 'OVERSIZED_PROMPT';
export type HintSeverity = 'info' | 'suggestion';
export interface Hint { code: HintCode; severity: HintSeverity; text: string; }
export interface Analysis { hints: Hint[]; characterCount: number; estimatedTokens?: never; }

const purpose = /\b(implement|implementier|erstelle|fix|reparier|refactor|optimi|prüf|test|erklär|explain|create|build|update|ändere|schreib|write|add|remove|entfern|bug|fehler|funktionier|konfigurier)\b/i;
const scope = /(?:\b(src|test|docs|datei|file|module|modul|class|klasse|function|funktion|method|methode|endpoint|komponente|component|repository)\b|[\w-]+\.(?:ts|tsx|js|jsx|py|json|md|java|cs|yaml|yml|css))\b/i;
const done = /\b(test|prüf|erwart|expected|acceptance|abnahme|kriter|criterion|ergebnis|result|fertig|done|pass|besteh|grenze|ohne weitere|only|nur)\b/i;
const clean = (x: string): string => x.replace(/\s+/g, ' ').trim();

export function analyzePrompt(input: string, options: { topicChanged?: boolean } = {}): Analysis {
  const prompt = clean(input).slice(0, 100_000);
  if (!prompt) return { hints: [], characterCount: 0 };
  const hints: Hint[] = [];
  if (prompt.length < 45 && !purpose.test(prompt)) hints.push({ code:'UNCLEAR_GOAL',severity:'suggestion',text:'Beschreibe das konkrete Ziel oder die gewünschte Änderung.' });
  if (prompt.length > 30 && !scope.test(prompt)) hints.push({ code:'MISSING_SCOPE',severity:'info',text:'Nenne bei Bedarf die betroffene Datei oder das Modul, um die Suche einzugrenzen.' });
  if (prompt.length > 55 && !done.test(prompt)) hints.push({ code:'MISSING_DONE_CRITERIA',severity:'info',text:'Ein prüfbares Ergebnis oder ein Test kann Nachfragen reduzieren.' });
  if (prompt.length > 5000) hints.push({ code:'OVERSIZED_PROMPT',severity:'info',text:'Prüfe, ob der lange Kontext relevant ist. Kürze nicht wichtige Anforderungen.' });
  if (options.topicChanged) hints.push({code:'TOPIC_CHANGE',severity:'suggestion',text:'Bei einem unabhängigen Feature kann ein neuer Chat den Kontext übersichtlicher halten.'});
  return { hints, characterCount:prompt.length };
}

/** Conservative lexical topic heuristic: never treats a change as a fact. */
export function potentialTopicChange(previous: string, current: string): boolean {
  function words(s: string): Set<string> {
    return new Set((s.toLocaleLowerCase().match(/[a-zäöüß0-9_-]{4,}/g) ?? [])
      .filter(w=> !/^(bitte|diese|einen|einem|einer|please|with|from|this|that|have|what|when|nicht|nochmal|machen|kannst|sollte|würde)$/.test(w)));
  }
  const a=words(previous),b=words(current);
  if(a.size < 3 || b.size < 3) return false;
  const overlap=[...a].filter(x=>b.has(x)).length;
  return overlap / Math.min(a.size,b.size) < 0.12;
}
