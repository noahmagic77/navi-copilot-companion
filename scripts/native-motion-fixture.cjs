'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {motions,sampleMotion}=require('../media/fairy-motion.js');
const samples=motions.flatMap(m=>[.15,.5,.85].map(fraction=>({id:m.id,age:m.duration*fraction,elapsed:2,pose:Object.values(sampleMotion(m.id,m.duration*fraction,2))})));
const target=path.join(__dirname,'../native/overlay/internal/motion/testdata/poses.json');
const data=JSON.stringify(samples,null,2)+'\n';
if(process.argv.includes('--check')){
 const expected=JSON.parse(fs.readFileSync(target,'utf8'));
 function equal(a,b){if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b)<1e-9;if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>equal(v,b[i]));if(a&&b&&typeof a==='object'&&typeof b==='object')return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>equal(a[key],b[key]));return a===b;}
 if(!equal(expected,samples))throw Error('Native motion fixture differs from the webview motion catalogue');
}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);}
