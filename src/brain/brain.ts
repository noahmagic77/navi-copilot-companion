import {performance} from 'node:perf_hooks';
import type {ActivityEvent, ActivitySource, ActivityState} from '../integration/activity';
import type {CompanionDecision} from './decisions';

export type BrainPhase = 'idle' | 'acknowledging' | 'waiting' | 'working' | 'completed' | 'cancelled' | 'error';
export interface Capability {
  implemented: boolean;
  availability: 'unknown' | 'available';
  evidence: string;
  confirmedAt: number | null;
}
export interface EditorPosition {line:number; character:number}
export interface EditorDiagnostic {
  severity:'error'|'warning'|'information'|'hint';
  source:string|null;
  code:string|null;
  message:string;
  start:EditorPosition;
  end:EditorPosition;
}
export interface EditorObservation {
  languageId:string;
  version:number;
  selection:{start:EditorPosition;end:EditorPosition};
  contextKind:'selection'|'line';
  contextText:string;
  diagnostics:EditorDiagnostic[];
}
export interface BrainSnapshot {
  revision: number;
  updatedAt: number;
  focused: boolean;
  phase: BrainPhase;
  source: ActivitySource | null;
  requestId: string | null;
  pointer:{x:number;y:number}|null;
  editor:EditorObservation|null;
  reason: string;
  decision:CompanionDecision|null;
  availableActions:string[];
  capabilities: Record<'chat' | 'codex' | 'editorTargets' | 'memory', Capability>;
}
export type BrainEvent =
  | {type: 'focus'; focused: boolean; at: number}
  | {type: 'pointer'; point:{x:number;y:number}|null; at:number}
  | {type: 'editor'; observation:EditorObservation|null; at:number}
  | {type: 'activity'; source: ActivitySource; state: ActivityState; at: number; requestId: string}
  | {type: 'activity'; source: ActivitySource; state: 'message'; at: number; requestId?: never};

function boundedEditorObservation(observation:EditorObservation):EditorObservation {
  const position=(value:EditorPosition)=>({line:value.line,character:value.character});
  return {
    languageId:observation.languageId.slice(0,80),version:observation.version,
    selection:{start:position(observation.selection.start),end:position(observation.selection.end)},
    contextKind:observation.contextKind,contextText:Array.from(observation.contextText).slice(0,2000).join(''),
    diagnostics:observation.diagnostics.slice(0,25).map(item=>({
      severity:item.severity,source:item.source?.slice(0,120)??null,code:item.code?.slice(0,80)??null,
      message:Array.from(item.message).slice(0,500).join(''),start:position(item.start),end:position(item.end)
    }))
  };
}

export function initialBrain(focused = true): BrainSnapshot {
  const unknown = (implemented: boolean, evidence: string): Capability => ({implemented, availability:'unknown', evidence, confirmedAt:null});
  return {
    revision:0, updatedAt:0, focused, phase:'idle', source:null, requestId:null, pointer:null, editor:null,
    reason:'Noch kein ausgewähltes Aktivitätsereignis beobachtet.',decision:null,availableActions:[],
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
  if (event.type === 'activity' && !['busy','received','waiting','message'].includes(event.state) && previous.requestId && (event.requestId !== previous.requestId || event.source !== previous.source)) return previous;
  const state: BrainSnapshot = {...previous, revision:previous.revision+1, updatedAt:event.at};
  if (event.type === 'focus') return {...state, focused:event.focused, pointer:event.focused?previous.pointer:null};
  if (event.type === 'pointer') return {...state, pointer:event.point?{...event.point}:null};
  if (event.type === 'editor') return {...state, editor:event.observation?boundedEditorObservation(event.observation):null};
  state.source=event.source;
  if (event.state === 'busy'||event.state==='received'||event.state==='waiting') state.requestId=event.requestId ?? null;
  else if (event.state !== 'message') state.requestId=event.requestId ?? previous.requestId;
  const reasons:Record<ActivityEvent['state'],string>={
    received:'Eine eigene Anfrage ist empfangen; eine Antwort liegt noch nicht vor.',
    waiting:'Die Anfrage wartet auf den Modellzugang oder dessen erstes Textfragment.',
    busy:'Die bestehende Aktivitätssteuerung meldet eine aktive Anfrage. Das ist kein Nachweis einer fertigen Antwort.',
    completed:'Die ausgewählte Anfrage wurde als abgeschlossen gemeldet. Richtigkeit oder Testerfolg sind damit nicht geprüft.',
    cancelled:'Die Aktivitätssteuerung meldet Abbruch oder Ablauf. Diese beiden Ursachen unterscheidet der Adapter noch nicht.',
    error:'Die ausgewählte Anfrage meldet einen Fehler. Die konkrete Ursache ist hier nicht bekannt.',
    message:'Eine ausdrücklich übergebene Meldung wurde zur Anzeige freigegeben.'
  };
  state.reason=reasons[event.state];
  state.phase=event.state==='busy'?'working':event.state==='received'?'acknowledging':event.state==='message'?'idle':event.state;
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
  const names:Record<BrainPhase,string>={idle:'Bereit, ohne aktive ausgewählte Anfrage',acknowledging:'Anfrage empfangen',waiting:'Warten auf Modellantwort',working:'Eine ausgewählte Anfrage läuft',completed:'Anfrage abgeschlossen – Ergebnis nicht fachlich verifiziert',cancelled:'Aktivität abgebrochen oder abgelaufen',error:'Anfrage fehlgeschlagen'};
  const capabilityNames:Record<keyof BrainSnapshot['capabilities'],string>={chat:'VS-Code-Modell',codex:'Codex-Übergabe',editorTargets:'Diagnose-Navigation',memory:'Dauerhaftes Companion-Gedächtnis'};
  const requestLabel=state.phase==='working'?'Aktuelle Aufgaben-ID':'Letzte Aufgaben-ID';
  const pointer=state.pointer?`${state.pointer.x.toFixed(1)}, ${state.pointer.y.toFixed(1)} DIP im aktiven VS-Code-Fenster`:'nicht verfügbar';
  const editor=state.editor?`${state.editor.languageId}, Version ${state.editor.version}; ${state.editor.contextKind==='selection'?'Auswahl':'Cursorzeilen-Ausschnitt'} mit ${state.editor.contextText.length} Zeichen; ${state.editor.diagnostics.length} Diagnosen`:'kein aktiver Editor';
  const capabilities=Object.entries(state.capabilities).map(([key,value])=>
    `- ${capabilityNames[key as keyof typeof capabilityNames]}: ${value.implemented?'implementiert':'noch nicht implementiert'}; ${value.availability==='available'?'zuletzt bestätigt, aktuell nicht garantiert':'aktuell unbekannt / nicht bestätigt'}. ${value.evidence}`
  ).join('\n');
  return `# NAVI über ihren Zustand\n\nLokale regelbasierte Momentaufnahme, kein zusätzlicher Modellaufruf. Zum Aktualisieren den Befehl erneut ausführen.\n\n`+
    `Zustand: ${names[state.phase]}.\nQuelle: ${state.source??'noch keine'}.\nDarstellung: ${state.focused?'Fenster fokussiert; weitere Sichtbarkeits- und Nutzereinstellungen gelten':'ruhig wegen fehlendem Fensterfokus; eine Anfrage kann weiterlaufen'}.\n\n`+
    `${requestLabel}: ${state.requestId??'keine bekannte Anfrage-ID'}.\n\n`+
    `## Wahrnehmung\n\nMaus: ${pointer}.\nEditor: ${editor}.\n\n`+
    `Grund: ${state.reason}\n\n## Fähigkeiten und Belege\n\n${capabilities}\n\n`+
    `## Beobachtungsgrenzen\n\nDieses lokale Modell sieht nur die Geometrie des Mauszeigers im aktiven Overlay-Fenster und den aktiven Editor: markierten Text oder, ohne Auswahl, die Cursorzeile sowie Diagnosen. Es speichert keine vollständige Datei, keine Aufgabenhistorie und keine Inhalte dauerhaft und sendet Editorinhalte nicht automatisch an ein Modell. Es kennt keine internen Modellgedanken oder allgemeine Bildschirmbilder. Die Aufgaben-ID ist eine Korrelationskennung von VS Code oder Codex, keine interne Modellanbieter-ID. Geplante Funktionen sind nicht automatisch verfügbar.\n\n`+
    `Revision: ${state.revision}. Aktualisierung: ${Math.round(state.updatedAt)} ms monotone Prozesszeit. Daten bleiben im RAM; Prompts und Antworten werden hier nicht gespeichert.\n`;
}

export class Brain {
  private state: BrainSnapshot;
  constructor(focused = true, private readonly now:()=>number=()=>performance.now()) { this.state=initialBrain(focused); }
  observe(activity: ActivityEvent): void {
    const event:BrainEvent=activity.state==='message'
      ? {type:'activity',source:activity.source,state:activity.state,at:this.now()}
      : {type:'activity',source:activity.source,state:activity.state,at:this.now(),requestId:activity.requestId};
    this.state=reduceBrain(this.state,event);
  }
  pointer(point:{x:number;y:number}|null):void {
    const valid=point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=0&&point.y>=0?point:null;
    this.state=reduceBrain(this.state,{type:'pointer',point:valid,at:this.now()});
  }
  editor(observation:EditorObservation|null):void {
    this.state=reduceBrain(this.state,{type:'editor',observation,at:this.now()});
  }
  focus(focused: boolean): void { this.state=reduceBrain(this.state,{type:'focus',focused,at:this.now()}); }
  decide(decision:CompanionDecision,availableActions:string[]):void {
    this.state={...this.state,revision:this.state.revision+1,updatedAt:this.now(),decision:{...decision},availableActions:[...availableActions]};
  }
  capability(name:'editorTargets'|'memory',available:boolean,evidence:string):void {
    this.state={...this.state,capabilities:{...this.state.capabilities,[name]:{implemented:true,availability:available?'available':'unknown',evidence,confirmedAt:available?this.now():null}}};
  }
  snapshot(): BrainSnapshot { return structuredClone(this.state); }
  describe(): string { return describeBrain(this.snapshot())+(this.state.decision?`\n## Begleiterentscheidung\n\n${this.state.decision.action}: ${this.state.decision.reason}\nUnterdrückt: ${this.state.decision.suppressed??'keine Alternative'}.\nVerfügbare Aktionen: ${this.state.availableActions.join(', ')||'keine'}.\n`:''); }
}
