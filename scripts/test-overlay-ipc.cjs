'use strict';
const {spawn}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
const file=path.resolve(process.argv[2]||'bin/win32-x64/navi-overlay.exe');
const child=spawn(file,['--host-pid',String(process.pid)],{windowsHide:true,stdio:['pipe','pipe','pipe']});
let ready=false,buffer='',errors='';
const timeout=setTimeout(()=>{child.kill();console.error('Native pipe test timed out');process.exitCode=1;},5000);
child.stdout.on('data',chunk=>{
 buffer+=chunk.toString();
 if(!ready&&buffer.includes('"ready"')){
  ready=true;
  for(const command of [{type:'configure',enabled:true,eco:true},{type:'focus',focused:false},{type:'motion',motion:'greet'},{type:'stop'}])child.stdin.write(JSON.stringify(command)+'\n');
  child.stdin.end();
 }
});
child.stderr.on('data',chunk=>errors+=chunk.toString());
child.on('error',error=>{clearTimeout(timeout);console.error(error);process.exitCode=1;});
child.on('close',code=>{clearTimeout(timeout);try{assert(ready,'No native readiness response');assert.equal(code,0,errors);assert.equal(errors,'');console.log('Native GUI executable control pipes and clean shutdown verified.');}catch(error){console.error(error);process.exitCode=1;}});
