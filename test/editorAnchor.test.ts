import test from 'node:test';
import assert from 'node:assert/strict';
import {editorAnchorToken,isEditorAnchorState,editorAnchorDescription} from '../src/overlay/editorAnchor';

test('editor beacons use bounded opaque colours distinct from the border',()=>{
  for(let i=0;i<50;i++){const token=editorAnchorToken();assert.match(token,/^[0-9a-f]{6}$/);assert.notEqual(token,'b3eaff');}
});
test('anchor reports accept only typed bounded geometry and explicit states',()=>{
  const state={id:1,status:'arrived',x:234.5,y:68,coreX:234.5,coreY:68};
  assert(isEditorAnchorState(state));
  for(const invalid of [null,{}, {...state,id:0},{...state,id:1.2},{...state,status:'anything'}, {...state,x:Infinity},{...state,y:'68'},{...state,coreX:NaN},{...state,coreY:1e9},{...state,reason:42},{...state,reason:'x'.repeat(513)}])assert(!isEditorAnchorState(invalid));
});
test('anchor failures explain the actual unavailable stage without exposing diagnostics',()=>{
  const state={id:1,status:'unavailable' as const,x:0,y:0,coreX:0,coreY:0};
  assert.match(editorAnchorDescription({...state,reason:'marker-not-found; fill=0 border=16'}),/nicht sichtbar/);
  assert.match(editorAnchorDescription({...state,reason:'marker-ambiguous'}),/nicht eindeutig/);
  assert.match(editorAnchorDescription({...state,reason:'capture-flush-failed'}),/nicht abschließen/);
  assert.match(editorAnchorDescription({...state,status:'stopped',reason:'capture-self-exclusion-unavailable'}),/NAVI nicht aus/);
  assert.match(editorAnchorDescription({...state,status:'stopped',reason:'target-expired'}),/Zielverfolgung ist beendet/);
  assert(!editorAnchorDescription({...state,reason:'untrusted-debug-text'}).includes('untrusted'));
});
