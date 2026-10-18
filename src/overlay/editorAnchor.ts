import {randomBytes} from 'node:crypto';

export interface EditorAnchorState {
  id:number;status:'searching'|'found'|'arrived'|'blocked'|'unavailable'|'stopped';
  x:number;y:number;coreX:number;coreY:number;
  reason?:string;
}
export function editorAnchorDescription(state:EditorAnchorState):string {
  const reason=state.reason?.split(/[;:]/,1)[0];
  const failures:Record<string,string>={
    'marker-not-found':'Die Zielmarkierung ist nicht sichtbar; nur die Fehlermarkierung bleibt.',
    'marker-ambiguous':'Die Zielmarkierung ist nicht eindeutig; nur die Fehlermarkierung bleibt.',
    'capture-self-exclusion-unavailable':'Windows kann NAVI nicht aus der Zielaufnahme ausnehmen; nur die Fehlermarkierung bleibt.',
    'target-outside-window':'Neben der Zielmarkierung ist zu wenig Platz; nur die Fehlermarkierung bleibt.',
    'target-expired':'Die kurze Zielverfolgung ist beendet.'
  };
  if(reason&&failures[reason]&&(state.status==='unavailable'||state.status==='stopped'))return failures[reason];
  if(state.status==='unavailable'&&reason?.startsWith('capture-'))return 'Windows konnte die Zielaufnahme nicht abschließen; nur die Fehlermarkierung bleibt.';
  if(state.status==='stopped'&&state.reason?.startsWith('request unavailable'))return 'Kein aktives sichtbares VS-Code-Fenster für den Flug verfügbar.';
  const descriptions={searching:'Pixelziel wird gesucht.',found:'Gerendertes Pixelziel erkannt.',arrived:'Am gemessenen Pixelziel angekommen.',blocked:'Maus-Ausweichen hat Vorrang.',unavailable:'Pixelziel nicht eindeutig sichtbar; nur die Fehlermarkierung bleibt.',stopped:'Pixelnavigation beendet.'};
  return descriptions[state.status];
}
export function editorAnchorToken():string {
  const bytes=randomBytes(3);
  return [32+bytes[0]%128,40+bytes[1]%96,120+bytes[2]%120].map(value=>value.toString(16).padStart(2,'0')).join('');
}
export function isEditorAnchorState(value:unknown):value is EditorAnchorState {
  if(!value||typeof value!=='object')return false;
  const state=value as Record<string,unknown>;
  return Number.isSafeInteger(state.id)&&Number(state.id)>0&&Number(state.id)<=2147483647&&
    typeof state.status==='string'&&['searching','found','arrived','blocked','unavailable','stopped'].includes(state.status)&&
    (state.reason===undefined||(typeof state.reason==='string'&&state.reason.length<=512))&&
    ['x','y','coreX','coreY'].every(key=>typeof state[key]==='number'&&Number.isFinite(state[key])&&Math.abs(Number(state[key]))<=65536);
}
