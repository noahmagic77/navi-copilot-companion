export type CompanionAction='wait'|'makeSpace'|'returnHome'|'attention'|'offerHelp';
export interface CompanionDecision {
  action:CompanionAction;
  reason:string;
  suppressed:CompanionAction|null;
  at:number;
}
export interface DecisionInput {
  at:number;
  enabled:boolean;
  focused:boolean;
  paused:boolean;
  occupied:boolean;
  problem:string|null;
  problemIds?:readonly string[];
}

/** Explicit times make replay independent of timers, randomness and VS Code. */
export class DecisionEngine {
  private changes:number[]=[];
  private lastChange:number|null=null;
  private away=false;
  private problem:string|null=null;
  private pendingAttention=false;
  private offered=new Set<string>();
  private offers:number[]=[];
  private lastAt=0;
  private since:number|null=null;
  private seenProblems=new Set<string>();

  changed(at:number):void {
    if(!Number.isFinite(at)||at<this.lastAt||this.lastChange!==null&&at<this.lastChange)return;
    this.changes=this.changes.filter(time=>at-time<=5000).slice(-2);
    this.changes.push(at);this.lastChange=at;
  }
  resetEditor():void {
    this.changes=[];this.lastChange=null;this.problem=null;this.pendingAttention=false;this.since=null;
  }
  resetPosition():void{this.away=false;}
  evaluate(input:DecisionInput):CompanionDecision {
    const {at}=input;
    if(!Number.isFinite(at)||at<this.lastAt)return {action:'wait',reason:'Veraltete Zeitangabe ignoriert.',suppressed:null,at:this.lastAt};
    this.lastAt=at;
    if(this.since===null)this.since=at;
    if(input.problem!==this.problem){
      this.problem=input.problem;
      const ids=input.problemIds??(input.problem?[input.problem]:[]);
      this.pendingAttention=ids.some(id=>!this.seenProblems.has(id));
      for(const id of ids){
        this.seenProblems.add(id);
        if(this.seenProblems.size>256)this.seenProblems.delete(this.seenProblems.values().next().value!);
      }
    }
    this.changes=this.changes.filter(time=>at-time<=5000);
    this.offers=this.offers.filter(time=>at-time<3600000);
    const quiet=at-(this.lastChange??this.since);
    const candidate:CompanionAction=this.changes.length>=3&&!this.away?'makeSpace':this.away&&quiet>=10000?'returnHome':
      this.pendingAttention?'attention':input.problem&&quiet>=8000&&!this.offered.has(input.problem)&&this.offers.length<3&&
      (!this.offers.length||at-this.offers[this.offers.length-1]>=300000)?'offerHelp':'wait';
    const blocked=!input.enabled?'Eigeninitiative ist ausgeschaltet.':!input.focused?'Das Fenster hat keinen Fokus.':input.paused?'Die Animation ist pausiert.':input.occupied?'Eine direkte Aktion, ein Spiel oder eine Anfrage hat Vorrang.':null;
    if(blocked)return {action:'wait',reason:blocked,suppressed:candidate==='wait'?null:candidate,at};
    if(candidate==='makeSpace')this.away=true;
    if(candidate==='returnHome')this.away=false;
    if(candidate==='attention')this.pendingAttention=false;
    if(candidate==='offerHelp'&&input.problem){
      this.offered.add(input.problem);this.offers.push(at);
      // A bounded session-local suppression set; never persisted as memory.
      if(this.offered.size>256)this.offered.delete(this.offered.values().next().value!);
    }
    const reasons:Record<CompanionAction,string>={
      wait:this.away?'Ich halte Abstand, weil im Editor gerade Änderungen stattfinden.':'Ich warte auf ein passendes Ereignis.',
      makeSpace:'Mindestens drei Editoränderungen in fünf Sekunden: Ich mache Platz.',
      returnHome:'Seit zehn Sekunden keine Editoränderung: Ich kehre zurück.',
      attention:'Eine neue Fehlerdiagnose ist im aktiven Dokument vorhanden.',
      offerHelp:'Das Dokument enthält einen Fehler; nach acht Sekunden Ruhe biete ich Hilfe an.'
    };
    return {action:candidate,reason:reasons[candidate],suppressed:null,at};
  }
}
