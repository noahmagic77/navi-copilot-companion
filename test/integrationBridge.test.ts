import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createConnection} from 'node:net';
import {spawn} from 'node:child_process';
import {ActivityController,type ActivityEvent} from '../src/integration/activity';
import {NaviBridge,sendToBridge} from '../src/integration/bridge';
import {handleMcp} from '../src/integration/naviMcp';

test('authenticated local pipe delivers only valid messages and cleans up the connection',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'navi-test-'));
  const events:ActivityEvent[]=[];
  const bridge=new NaviBridge(folder,new ActivityController(event=>events.push(event)));
  try {
    await bridge.start();
    assert.equal((await sendToBridge(bridge.descriptor,{type:'message',message:'Hallo aus Codex'})).displayed,true);
    assert.equal(events.at(-1)?.source,'codex');
    assert.equal(events.at(-1)?.message,'Hallo aus Codex');
    await assert.rejects(sendToBridge(bridge.descriptor,{type:'status',requestId:'bad id',state:'completed'}));
    await assert.rejects(sendToBridge(bridge.descriptor,{type:'message',message:'x'.repeat(9000)}));
    const response=await new Promise<string>((resolve,reject)=>{
      const socket=createConnection(bridge.connection.endpoint);let result='';
      socket.on('connect',()=>socket.write(JSON.stringify({token:'wrong',type:'message',message:'Unauthorized'})+'\n'));
      socket.on('data',chunk=>result+=chunk.toString());socket.on('end',()=>resolve(result));socket.on('error',reject);
    });
    assert(JSON.parse(response).error);assert.equal(events.length,1);
    await bridge.dispose();await assert.rejects(access(bridge.descriptor));
    await assert.rejects(sendToBridge(bridge.descriptor,{type:'message',message:'Closed'}));
  } finally {await bridge.dispose();await rm(folder,{recursive:true,force:true});}
});

test('real MCP stdio client negotiates, lists tools and hands status and text to the live pipe',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'navi-mcp-'));
  const events:ActivityEvent[]=[];const bridge=new NaviBridge(folder,new ActivityController(event=>events.push(event)));
  await bridge.start();
  const child=spawn(process.env.NAVI_MCP_EXECUTABLE??process.execPath,[process.env.NAVI_MCP_SCRIPT??join(__dirname,'../src/integration/naviMcp.js')],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1',NAVI_CONNECTION_FILE:bridge.descriptor},windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='';let stderr='';let counter=0;
  const waiting=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
  child.stdout.on('data',chunk=>{output+=chunk.toString();let end:number;while((end=output.indexOf('\n'))>=0){const data=JSON.parse(output.slice(0,end));output=output.slice(end+1);waiting.get(data.id)?.resolve(data);waiting.delete(data.id);}});
  child.stderr.on('data',chunk=>stderr+=chunk.toString());
  child.on('error',error=>{for(const pending of waiting.values())pending.reject(error);});
  const call=(method:string,params?:unknown)=>new Promise<any>((resolve,reject)=>{const id=++counter;const timer=setTimeout(()=>{waiting.delete(id);reject(Error('MCP response timeout'));},5000);waiting.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
  try {
    const initialized=await call('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'navi-test',version:'1'}});
    assert.equal(initialized.result.protocolVersion,'2025-06-18');
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
    assert.equal((await call('tools/list')).result.tools.length,2);
    for(const state of ['received','waiting','busy','completed']) {
      const reply=await call('tools/call',{name:'navi_set_status',arguments:{requestId:'test-turn',state,message:state==='completed'?'Fertig aus Codex':undefined}});
      assert.equal(reply.result.isError,undefined);
      assert.equal(JSON.parse(reply.result.content[0].text).displayed,true);
    }
    await call('tools/call',{name:'navi_show_message',arguments:{message:'Gezielte Übergabe'}});
    assert.deepEqual(events.map(event=>event.state),['received','waiting','busy','completed','message']);
    assert.deepEqual(events.slice(0,2).map(event=>event.requestId),['test-turn','test-turn']);
    assert.equal(events.at(-1)?.message,'Gezielte Übergabe');assert.equal(stderr,'');
    const bad=await call('tools/call',{name:'navi_set_status',arguments:{requestId:'test',state:'invented'}});
    assert.equal(bad.result.isError,true);
    assert.equal((await call('unknown')).error.code,-32601);
    assert.equal(await handleMcp({jsonrpc:'2.0',method:'notifications/initialized'},bridge.descriptor),undefined);
    await bridge.dispose();
    const disconnected=await call('tools/call',{name:'navi_show_message',arguments:{message:'Cannot deliver'}});
    assert.equal(disconnected.result.isError,true);
  } finally {child.kill();await bridge.dispose();await rm(folder,{recursive:true,force:true});}
});
