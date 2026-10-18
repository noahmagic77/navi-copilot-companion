import test from 'node:test';
import assert from 'node:assert/strict';
import {editorAnchorToken,isEditorAnchorState} from '../src/overlay/editorAnchor';

test('editor beacons use bounded opaque colours distinct from the border',()=>{
  for(let i=0;i<50;i++){const token=editorAnchorToken();assert.match(token,/^[0-9a-f]{6}$/);assert.notEqual(token,'b3eaff');}
});
test('anchor reports accept only typed bounded geometry and explicit states',()=>{
  const state={id:1,status:'arrived',x:234.5,y:68,coreX:234.5,coreY:68};
  assert(isEditorAnchorState(state));
  for(const invalid of [null,{}, {...state,id:0},{...state,id:1.2},{...state,status:'anything'}, {...state,x:Infinity},{...state,y:'68'},{...state,coreX:NaN},{...state,coreY:1e9}])assert(!isEditorAnchorState(invalid));
});
