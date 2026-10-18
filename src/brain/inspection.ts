import type {BrainSnapshot} from './brain';
import type {CompanionDecision} from './decisions';
import type {ExpressionFrame} from './expression';
import type {Memory} from './memories';
import type {PresenceSnapshot} from './presence';

/** Project actual state without editor contents, diagnostic text or chat responses. */
export function brainDisplayData(brain:BrainSnapshot,expression:ExpressionFrame,decisions:CompanionDecision[],memories:Memory[],voice:string,presence?:PresenceSnapshot) {
  return {
    perception:{focused:brain.focused,editor:brain.editor?{language:brain.editor.languageId,version:brain.editor.version,contextCharacters:brain.editor.contextText.length,diagnostics:brain.editor.diagnostics.length}:null,pointer:brain.pointer},
    state:{phase:brain.phase,source:brain.source,requestId:brain.requestId,reason:brain.reason},
    decision:brain.decision,actions:brain.availableActions,presence:presence?{...presence,simulation:true}:null,
    expression:{state:expression.state,reason:expression.reason},capabilities:brain.capabilities,
    memories:memories.map(item=>({...item,label:'Zuletzt ausdrücklich bestätigt'})),voice,decisions:decisions.slice(-50).map(item=>({...item}))
  };
}
