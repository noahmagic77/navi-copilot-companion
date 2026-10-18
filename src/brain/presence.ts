export type PresenceEvent='file'|'edit'|'selection'|'scroll'|'save'|'errorsCleared'|'taskStart'|'taskSuccess'|'taskFailure'|'taskEnd'|'debugStart'|'debugStop'|'return'|'touch'|'pointer';
export type PresenceReaction='curious'|'pleased'|'startled'|'sleepy'|'welcoming'|'attentive';
export interface PresenceValues {energy:number;attention:number;curiosity:number}
export interface PresenceSnapshot extends PresenceValues {
  enabled:boolean;
  mode:'engaged'|'watchful'|'settling'|'resting';
  lastEvent:PresenceEvent|null;
  reason:string;
  reaction:PresenceReaction|null;
  observed:number;
}
export interface PresenceResponse {state:PresenceReaction;reason:string;message:string}
const definitions:Record<Exclude<PresenceEvent,'edit'>,{state:PresenceReaction;reason:string;priority:number;cooldown:number;message?:string}>={
  file:{state:'curious',reason:'Ein anderes Textdokument ist aktiv.',priority:2,cooldown:3500},
  selection:{state:'attentive',reason:'Eine Auswahl im aktiven Editor wurde verändert.',priority:1,cooldown:6000},
  scroll:{state:'curious',reason:'Der sichtbare Bereich des aktiven Editors hat sich verändert.',priority:1,cooldown:10000},
  save:{state:'pleased',reason:'Das aktive Dokument wurde gespeichert; dies bestätigt keine fachliche Richtigkeit.',priority:3,cooldown:8000},
  errorsCleared:{state:'pleased',reason:'Zuvor beobachtete Fehlerdiagnosen dieses Dokuments sind verschwunden; kein Testnachweis.',priority:4,cooldown:10000},
  taskStart:{state:'attentive',reason:'VS Code hat den Start eines Tasks gemeldet.',priority:3,cooldown:4000},
  taskSuccess:{state:'pleased',reason:'Ein Task-Prozess hat Exit-Code 0 gemeldet; keine allgemeine Codeprüfung.',priority:5,cooldown:3500,message:'Der Task-Prozess ist mit Exit-Code 0 beendet.'},
  taskFailure:{state:'startled',reason:'Ein Task-Prozess hat einen Exit-Code ungleich 0 gemeldet.',priority:6,cooldown:3500,message:'Der Task-Prozess meldet einen Fehler.'},
  taskEnd:{state:'attentive',reason:'Ein Task ist beendet; ein Prozess-Ergebnis ist nicht bekannt.',priority:3,cooldown:4000},
  debugStart:{state:'attentive',reason:'Eine Debug-Sitzung wurde gestartet.',priority:3,cooldown:4000},
  debugStop:{state:'attentive',reason:'Eine Debug-Sitzung wurde beendet; dies ist kein Erfolgsnachweis.',priority:3,cooldown:4000},
  return:{state:'welcoming',reason:'Das VS-Code-Fenster ist nach einer Abwesenheit wieder fokussiert.',priority:4,cooldown:15000,message:'Da bist du wieder.'},
  touch:{state:'startled',reason:'Eine direkte Berührung der Fee wurde gemeldet.',priority:7,cooldown:2500,message:'Huch! Da bin ich.'},
  pointer:{state:'curious',reason:'Der Mauszeiger bewegt sich im beobachteten Fenster.',priority:1,cooldown:12000}
};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const lifetime=(kind:Exclude<PresenceEvent,'edit'>)=>definitions[kind].priority>=5?6000:2500;

/** Simulated animation dynamics, not human feelings. No contents, paths or persistence. */
export class PresenceController {
  private values:PresenceValues={energy:.72,attention:.25,curiosity:.4};
  private at:number;
  private readonly started:number;
  private lastStimulus:number;
  private lastEdit=-Infinity;
  private lastEvent:PresenceEvent|null=null;
  private observed=0;
  private reason='Ruhige Ausgangsdynamik; noch kein Ereignis.';
  private pending:{kind:Exclude<PresenceEvent,'edit'>;at:number}|undefined;
  private cooldowns=new Map<PresenceEvent,number>();
  private nextReaction=0;
  private reactionPriority=0;
  private nextSpeech=0;
  private nextRest=0;
  private active=false;
  private enabled=false;
  private reaction:PresenceReaction|null=null;
  constructor(at=0){this.at=at;this.started=at;this.lastStimulus=at;}
  private advance(at:number):boolean {
    if(!Number.isFinite(at)||at<this.at)return false;
    const restAt=this.lastStimulus+90000;
    const integrate=(from:number,to:number,resting:boolean)=>{
      const dt=Math.max(0,(to-from)/1000);
      const targets={energy:resting ? .28 : .72,attention:this.active ? .7 : .16,curiosity:resting ? .12 : .35};
      for(const key of ['energy','attention','curiosity'] as const)this.values[key]=clamp(targets[key]+(this.values[key]-targets[key])*Math.exp(-dt/(key==='energy'?35:8)));
    };
    if(this.at<restAt)integrate(this.at,Math.min(at,restAt),false);
    if(at>restAt)integrate(Math.max(this.at,restAt),at,true);
    this.at=at;
    return true;
  }
  observe(kind:PresenceEvent,at:number):void {
    if(!this.advance(at))return;
    this.lastStimulus=at;this.lastEvent=kind;this.observed=Math.min(Number.MAX_SAFE_INTEGER,this.observed+1);
    this.values.attention=clamp(this.values.attention+(kind==='edit' ? .025 : .12));
    this.values.curiosity=clamp(this.values.curiosity+((kind==='file'||kind==='pointer') ? .12 : .035));
    if(kind==='edit'){this.lastEdit=at;this.reason='Editoränderungen wurden beobachtet; die Fee hält sich zurück.';return;}
    const definition=definitions[kind];this.reason=definition.reason;
    if(at<(this.cooldowns.get(kind)??0))return;
    this.cooldowns.set(kind,at+definition.cooldown);
    if(!this.pending||at-this.pending.at>lifetime(this.pending.kind)||definition.priority>=definitions[this.pending.kind].priority)this.pending={kind,at};
  }
  evaluate(at:number,options:{enabled:boolean;focused:boolean;occupied:boolean;expressionIdle:boolean}):PresenceResponse|null {
    if(!this.advance(at))return null;
    this.enabled=options.enabled;this.active=options.occupied&&options.enabled&&options.focused;this.reaction=null;
    if(!options.enabled||!options.focused||options.occupied){this.pending=undefined;return null;}
    if(this.pending&&at-this.pending.at>lifetime(this.pending.kind))this.pending=undefined;
    if(!options.expressionIdle||(at-this.started<3000&&this.pending?.kind!=='touch'))return null;
    if(at<this.nextReaction&&(!this.pending||definitions[this.pending.kind].priority<=this.reactionPriority))return null;
    const pending=this.pending;this.pending=undefined;
    if(pending){
      // Keep low-priority gaze/scroll responses from interrupting an editing burst.
      if(definitions[pending.kind].priority<=2&&at-this.lastEdit<1200)return null;
      const response=definitions[pending.kind];
      this.reactionPriority=response.priority;
      this.nextReaction=at+(pending.kind==='touch'?2500:3500);this.reaction=response.state;
      const speak=!!response.message&&at>=this.nextSpeech;
      if(speak)this.nextSpeech=at+30000;
      return {state:response.state,reason:response.reason,message:speak?response.message!:''};
    }
    if(at-this.lastStimulus>=90000&&at>=this.nextRest){
      this.nextRest=at+60000;this.nextReaction=at+3500;this.reaction='sleepy';
      this.reactionPriority=0;
      return {state:'sleepy',reason:'Seit mindestens 90 Sekunden kein beobachteter Reiz; die Fee ruht.',message:''};
    }
    return null;
  }
  snapshot():PresenceSnapshot {
    return {...this.values,enabled:this.enabled,mode:this.active?'engaged':this.at-this.lastStimulus>=90000?'resting':this.values.attention>.4?'watchful':'settling',lastEvent:this.lastEvent,reason:this.reason,reaction:this.reaction,observed:this.observed};
  }
}
