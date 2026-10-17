import {performance} from 'node:perf_hooks';
import type {ActivityEvent, ActivitySource} from '../integration/activity';

export type BrainPhase = 'idle' | 'working' | 'completed' | 'cancelled' | 'error';
export interface Capability {
  implemented: boolean;
  availability: 'unknown' | 'available';
  evidence: string;
  confirmedAt: number | null;
}
export interface BrainSnapshot {
  revision: number;
  updatedAt: number;
  focused: boolean;
  phase: BrainPhase;
  source: ActivitySource | null;
  reason: string;
  capabilities: Record<'chat' | 'codex' | 'editorTargets' | 'memory', Capability>;
}
export type BrainEvent =
  | {type: 'focus'; focused: boolean; at: number}
  | {type: 'activity'; source: ActivitySource; state: ActivityEvent['state']; at: number};

export function initialBrain(focused = true): BrainSnapshot {
  const unknown = (implemented: boolean, evidence: string): Capability => ({implemented, availability:'unknown', evidence, confirmedAt:null});
  return {
    revision:0, updatedAt:0, focused, phase:'idle', source:null,
    reason:'Noch kein ausgewähltes Aktivitätsereignis beobachtet.',
    capabilities:{
      chat:unknown(true,'Der ausgewählte VS-Code-Modellweg ist implementiert, in dieser Sitzung noch nicht erfolgreich bestätigt.'),
      codex:unknown(true,'Die Übergabebrücke ist implementiert; eine Übergabe wurde in dieser Sitzung noch nicht beobachtet.'),
      editorTargets:unknown(false,'Gezielte Diagnose-Navigation ist geplant; vorhandene Fenster-Zielflüge sind davon getrennt.'),
      memory:unknown(false,'Dauerhafte Companion-Erinnerungen sind geplant. Optionale Chat-Historie ist kein solches Gedächtnis.')
    }
  };
}

/** Pure state transition: input order breaks equal-time ties; stale events have no effect. */
export function reduceBrain(previous: BrainSnapshot, event: BrainEvent): BrainSnapshot {
  if (!Number.isFinite(event.at) || event.at < previous.updatedAt) return previous;
  const state: BrainSnapshot = {...previous, revision:previous.revision+1, updatedAt:event.at};
  if (event.type === 'focus') return {...state, focused:event.focused};
  state.source=event.source;
  const reasons:Record<ActivityEvent['state'],string>={
    busy:'Die bestehende Aktivitätssteuerung meldet eine aktive Anfrage. Das ist kein Nachweis einer fertigen Antwort.',
    completed:'Die ausgewählte Anfrage wurde als abgeschlossen gemeldet. Richtigkeit oder Testerfolg sind damit nicht geprüft.',
    cancelled:'Die Aktivitätssteuerung meldet Abbruch oder Ablauf. Diese beiden Ursachen unterscheidet der Adapter noch nicht.',
    error:'Die ausgewählte Anfrage meldet einen Fehler. Die konkrete Ursache ist hier nicht bekannt.',
    message:'Eine ausdrücklich übergebene Meldung wurde zur Anzeige freigegeben.'
  };
  state.reason=reasons[event.state];
  state.phase=event.state==='busy'?'working':event.state==='message'?'idle':event.state;
  state.capabilities={...previous.capabilities};
  if (event.source==='codex') state.capabilities.codex={
    implemented:true,availability:'available',confirmedAt:event.at,
    evidence:'Eine Übergabe über die Codex-Quelle wurde empfangen; dies ist ein vergangener Kanalbeleg, keine dauerhafte Verbindungsgarantie.'
  };
  if (event.source==='vscode' && event.state==='completed') state.capabilities.chat={
    implemented:true,availability:'available',confirmedAt:event.at,
    evidence:'Ein Abschluss des vorhandenen VS-Code-Modellwegs wurde empfangen; fachliche Richtigkeit ist ungeprüft.'
  };
  if (event.source==='vscode' && event.state==='error') state.capabilities.chat={
    ...previous.capabilities.chat,availability:'unknown',
    evidence:'Die jüngste Anfrage meldet einen Fehler. Die aktuelle Modellverfügbarkeit ist unbekannt; frühere Bestätigung bleibt nur historisch.'
  };
  return state;
}

export function describeBrain(state: BrainSnapshot): string {
  const names:Record<BrainPhase,string>={idle:'Bereit, ohne aktive ausgewählte Anfrage',working:'Eine ausgewählte Anfrage läuft',completed:'Anfrage abgeschlossen – Ergebnis nicht fachlich verifiziert',cancelled:'Aktivität abgebrochen oder abgelaufen',error:'Anfrage fehlgeschlagen'};
  const capabilityNames:Record<keyof BrainSnapshot['capabilities'],string>={chat:'VS-Code-Modell',codex:'Codex-Übergabe',editorTargets:'Diagnose-Navigation',memory:'Dauerhaftes Companion-Gedächtnis'};
  const capabilities=Object.entries(state.capabilities).map(([key,value])=>
    `- ${capabilityNames[key as keyof typeof capabilityNames]}: ${value.implemented?'implementiert':'noch nicht implementiert'}; ${value.availability==='available'?'zuletzt bestätigt, aktuell nicht garantiert':'aktuell unbekannt / nicht bestätigt'}. ${value.evidence}`
  ).join('\n');
  return `# NAVI über ihren Zustand\n\nLokale regelbasierte Momentaufnahme, kein zusätzlicher Modellaufruf. Zum Aktualisieren den Befehl erneut ausführen.\n\n`+
    `Zustand: ${names[state.phase]}.\nQuelle: ${state.source??'noch keine'}.\nDarstellung: ${state.focused?'Fenster fokussiert; weitere Sichtbarkeits- und Nutzereinstellungen gelten':'ruhig wegen fehlendem Fensterfokus; eine Anfrage kann weiterlaufen'}.\n\n`+
    `Grund: ${state.reason}\n\n## Fähigkeiten und Belege\n\n${capabilities}\n\n`+
    `## Beobachtungsgrenzen\n\nDieses erste Selbstmodell beobachtet nur die bereits ausgewählten Aktivitätsereignisse und den Fensterfokus. Es kennt keine internen Modellgedanken, keine vollständige Aktionshistorie und keine allgemeine Bildschirmwahrnehmung. Die lokale Revision ist keine Modell-Anfrage-ID. Geplante Funktionen sind nicht automatisch verfügbar.\n\n`+
    `Revision: ${state.revision}. Aktualisierung: ${Math.round(state.updatedAt)} ms monotone Prozesszeit. Daten bleiben im RAM; Prompts und Antworten werden hier nicht gespeichert.\n`;
}

export class Brain {
  private state: BrainSnapshot;
  constructor(focused = true, private readonly now:()=>number=()=>performance.now()) { this.state=initialBrain(focused); }
  observe(activity: ActivityEvent): void {
    this.state=reduceBrain(this.state,{type:'activity',source:activity.source,state:activity.state,at:this.now()});
  }
  focus(focused: boolean): void { this.state=reduceBrain(this.state,{type:'focus',focused,at:this.now()}); }
  snapshot(): BrainSnapshot { return structuredClone(this.state); }
  describe(): string { return describeBrain(this.snapshot()); }
}
