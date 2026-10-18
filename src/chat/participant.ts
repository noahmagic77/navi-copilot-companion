import * as vscode from 'vscode';
import { LocalHistoryStore } from '../storage/localHistoryStore';
import {randomUUID} from 'node:crypto';
import {runModelTurn} from './modelTurn';
import type {ActivityState} from '../integration/activity';
function config():vscode.WorkspaceConfiguration {return vscode.workspace.getConfiguration('navi');}
export function registerNaviParticipant(context:vscode.ExtensionContext,store:LocalHistoryStore,onState?:(id:string,state:ActivityState,message?:string)=>void):vscode.Disposable {
 const handler:vscode.ChatRequestHandler=async(request,_chatContext,stream,token)=>{
  const text=request.prompt.trim();
  if(!text){stream.markdown('Please enter a question for NAVI.');return;}
  const prefix=request.command==='explain'?'Explain the following clearly and accurately:\n\n':request.command==='summarize'?'Summarize the following concisely:\n\n':'Respond accurately to the following request:\n\n';
  const messages=[vscode.LanguageModelChatMessage.User(prefix+text)];
  const id=randomUUID();
  try{
   const answer=await runModelTurn({
    request:async()=>(await request.model.sendRequest(messages,{},token)).text,
    cancelled:()=>token.isCancellationRequested,
    fragment:text=>stream.markdown(text),
    state:(state,message)=>{try{onState?.(id,state,message);}catch{console.error('NAVI activity update failed.');}}
   });
   if(answer===undefined)return;
   if(!token.isCancellationRequested && config().get<boolean>('history.enabled',false)){
    try{await store.add(text,answer,request.command,config().get<number>('history.maxEntries',200));}
    catch(error){console.error('NAVI history persistence failed',error);void vscode.window.showWarningMessage('NAVI could not save optional local history.');}
   }
  }catch(error){if(token.isCancellationRequested)return;console.error('NAVI model request failed',error);stream.markdown('NAVI could not complete this request. Verify that a chat model is available.');}
 };
 const participant=vscode.chat.createChatParticipant('navi.chat',handler);
 participant.iconPath=new vscode.ThemeIcon('sparkle');context.subscriptions.push(participant);return participant;
}
