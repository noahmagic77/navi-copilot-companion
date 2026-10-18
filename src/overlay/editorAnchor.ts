import {randomBytes} from 'node:crypto';

export interface EditorAnchorState {
  id:number;status:'searching'|'found'|'arrived'|'blocked'|'unavailable'|'stopped';
  x:number;y:number;coreX:number;coreY:number;
  reason?:string;
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
    ['x','y','coreX','coreY'].every(key=>typeof state[key]==='number'&&Number.isFinite(state[key])&&Math.abs(Number(state[key]))<=65536);
}
