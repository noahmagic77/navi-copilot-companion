'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {TelemetrySettingsManager}=require('../src/integrations/TelemetrySettingsManager.cjs');
function mock(initial={}) {
  const vals={...initial},state=new Map();
  const configuration={
    inspect:key=>({globalValue:vals[key]}),
    get:(key, fallback)=>vals[key]??fallback,
    update:async(key,value)=>{if(value===undefined)delete vals[key];else vals[key]=value;}
  };
  const vscode={workspace:{getConfiguration:()=>configuration},ConfigurationTarget:{Global:1}};
  const globalState={get:key=>state.get(key),update:async(key,value)=>{if(value===undefined)state.delete(key);else state.set(key,value);}};
  return {manager:new TelemetrySettingsManager(vscode,globalState,'/navi/otel.jsonl'),vals,state};
}
test('OTel manager snapshots and restores explicit global settings', async()=>{
  const {manager,vals,state}=mock({enabled:false,exporterType:'otlp-http',captureContent:true});
  await manager.enable();
  assert.equal(vals.enabled,true);assert.equal(vals.captureContent,false);assert.equal(vals.outfile,'/navi/otel.jsonl');
  assert.equal(manager.status(),true);
  await manager.disable();
  assert.equal(vals.enabled,false);assert.equal(vals.exporterType,'otlp-http');assert.equal(vals.captureContent,true);
  assert.equal('outfile' in vals,false);assert.equal(state.has('navi.otel.backup'),false);
});
test('OTel manager does not overwrite user edits after opt-in',async()=>{
  const {manager,vals}=mock({enabled:false});await manager.enable();
  vals.exporterType='console';
  await manager.disable();
  assert.equal(vals.exporterType,'console');
  assert.equal(vals.enabled,false);
});
test('OTel cannot be enabled twice without backup cleanup',async()=>{
  const {manager}=mock();await manager.enable();
  await assert.rejects(manager.enable(),/bereits/);
});
