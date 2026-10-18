import {performance} from 'node:perf_hooks';
import {speechText} from '../core/speechText';
import type {ActivityEvent, ActivitySource} from '../integration/activity';
import type {BrainSnapshot} from './brain';
import type {PresenceResponse,PresenceReaction} from './presence';

export type ExpressionState='idle'|'acknowledge'|'working'|'waiting'|'offer'|'uncertain'|'completed'|'cancelled'|'error'|PresenceReaction;
export interface ExpressionFrame {
  state:ExpressionState;
  source:ActivitySource;
  age:number;
  engaged:boolean;
  message:string;
  reason:string;
}
const activeStates=new Set(['received','waiting','busy']);
export const isActiveActivity=(event:ActivityEvent|undefined):boolean=>!!event&&activeStates.has(event.state);
export function describeExpression(frame:ExpressionFrame):string {
  const names:Record<ExpressionState,string>={idle:'Leerlauf',acknowledge:'Empfang bestätigen',waiting:'Auf Antwort warten',working:'Antwort bearbeiten',offer:'Hinweis anbieten',uncertain:'Zielklärung vorschlagen',completed:'Antwort abgeschlossen, ungeprüft',cancelled:'Abbruch oder Ablauf',error:'Fehlerreaktion',curious:'Neugier',pleased:'Positive Rückmeldung',startled:'Überraschte Reaktion',sleepy:'Zur Ruhe kommen',welcoming:'Wieder begrüßen',attentive:'Aufmerksam werden'};
  return `\n## Gewählter Ausdruck\n\n${names[frame.state]}. Quelle: ${frame.source}.\n\nGrund: ${frame.reason}\n\nDieser Ausdruck wird durch Fokus, Sichtbarkeit, Animation und reduzierte Bewegung begrenzt. Die Auswahl ist kein Nachweis, dass die Fee gerade sichtbar ist.\n`;
}
const recovery:Partial<Record<ExpressionState,number>>={completed:1.6,cancelled:1.3,error:2,offer:2.2,uncertain:2.4,curious:2.4,pleased:2,startled:1.5,sleepy:3.5,welcoming:2.6,attentive:2};

/** One semantic expression for both renderers. Flight/avoidance remains independent. */
export class ExpressionController {
  private desired:ExpressionFrame={state:'idle',source:'manual',age:0,engaged:false,message:'',reason:'Keine aktive Anfrage.'};
  private current=this.desired;
  private started=0;
  private task='';
  private acknowledgementUntil=0;
  constructor(private readonly emit:(frame:ExpressionFrame)=>void,private readonly now=()=>performance.now()){}

  observe(snapshot:BrainSnapshot,event:ActivityEvent):void {
    const at=this.now();
    const engaged=isActiveActivity(event);
    const state:ExpressionState=event.state==='received'?'acknowledge':event.state==='waiting'?'waiting':event.state==='busy'?'working':event.state==='message'?'idle':event.state;
    const prefix=event.source==='codex'?'Codex: ':'';
    const message=event.state==='error'?`${prefix}Die Anfrage ist fehlgeschlagen.`:event.state==='cancelled'?`${prefix}Anfrage beendet oder abgebrochen.`:
      event.state==='completed'?`${prefix}${event.message||'Antwort abgeschlossen. Inhalt noch nicht überprüft.'}`:event.state==='message'?`${prefix}${event.message}`:'';
    this.desired={state,source:event.source,age:0,engaged,message:speechText(message),reason:snapshot.reason};
    const task=engaged?event.source+':'+event.requestId:'';
    if(engaged&&task!==this.task){
      this.task=task;this.acknowledgementUntil=at+650;
      this.set({...this.desired,state:'acknowledge',message:''},at);return;
    }
    if(!engaged){this.task='';this.acknowledgementUntil=0;}
    if(engaged&&at<this.acknowledgementUntil)return;
    this.set(this.desired,at);
  }

  hint(uncertain=false,reason?:string):void {
    if(this.task)return;
    const frame:ExpressionFrame={state:uncertain?'uncertain':'offer',source:'manual',age:0,engaged:false,message:'',reason:reason??(uncertain?'Eine Rückfrage zur Klärung wird angeboten.':'Ein Hinweis wird angeboten.')};
    this.desired=frame;this.set(frame,this.now());
  }
  react(response:PresenceResponse):boolean {
    if(this.task||this.current.state!=='idle')return false;
    const frame:ExpressionFrame={...response,source:'manual',age:0,engaged:false,message:speechText(response.message)};
    this.desired=frame;this.set(frame,this.now());return true;
  }

  tick():void {
    const at=this.now();
    if(this.acknowledgementUntil&&at>=this.acknowledgementUntil){
      this.acknowledgementUntil=0;
      this.set({...this.desired,state:this.desired.state==='acknowledge'?'waiting':this.desired.state},at);
    }
    const duration=recovery[this.current.state];
    if(duration!==undefined&&at-this.started>=duration*1000){
      this.desired={state:'idle',source:this.current.source,age:0,engaged:false,message:'',reason:'Die kurze Ereignisreaktion ist beendet.'};
      this.set(this.desired,at);
    }
  }
  snapshot():ExpressionFrame{return {...this.current,age:Math.max(0,(this.now()-this.started)/1000)};}
  private set(frame:ExpressionFrame,at:number):void {
    this.current={...frame,age:0};this.started=at;this.emit({...this.current});
  }
}
