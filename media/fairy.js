'use strict';
const vscode=acquireVsCodeApi();
const form=document.getElementById('check');
const heading=document.getElementById('heading');
const hint=document.getElementById('hint');
const status=document.getElementById('status');
form.addEventListener('submit',event=>{
  event.preventDefault();
  const input=document.getElementById('prompt').value;
  if(input.trim())vscode.postMessage({type:'check',text:input});
});
window.addEventListener('message',event=>{
  const data=event.data;
  if(!data || data.type!=='analysis'|| !Array.isArray(data.hints))return;
  heading.textContent=data.hints.length?'NAVIs Hinweise':'Keine offensichtlichen Probleme';
  hint.replaceChildren();
  if(!data.hints.length){hint.textContent='Dein Prompt ist nach den aktivierten Heuristiken unauffällig.';}
  else{
    const ul=document.createElement('ul');
    for(const h of data.hints.slice(0,5)){
      if(typeof h.text!=='string')continue;
      const li=document.createElement('li');li.textContent=h.text;ul.appendChild(li);
    }
    hint.appendChild(ul);
  }
  status.textContent='Lokale Analyse · '+data.characterCount+' Zeichen';
});
