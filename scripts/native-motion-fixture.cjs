'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {motions,sampleMotion}=require('../media/fairy-motion.js');
const samples=motions.flatMap(m=>[.15,.5,.85].map(fraction=>({id:m.id,age:m.duration*fraction,elapsed:2,pose:Object.values(sampleMotion(m.id,m.duration*fraction,2))})));
const target=path.join(__dirname,'../native/overlay/internal/motion/testdata/poses.json');
const data=JSON.stringify(samples,null,2)+'\n';
if(process.argv.includes('--check')){
 if(fs.readFileSync(target,'utf8')!==data)throw Error('Native motion fixture differs from the webview motion catalogue');
}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);}
