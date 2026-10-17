import * as vscode from 'vscode';
import { registerNaviParticipant } from './chat/participant';
import { LocalHistoryStore } from './storage/localHistoryStore';
import { SessionJournal } from './storage/sessionJournal';
import { NaviView } from './ui/naviView';
import { analyzePrompt, potentialTopicChange } from './core/promptAnalyzer';
import { parseTokenMetrics } from './core/otelParser';
import { OverlayController } from './overlay/overlayController';
import { GreetingCycle } from './core/greetingCycle';
import {ActivityController,type ActivityEvent} from './integration/activity';
import {NaviBridge} from './integration/bridge';
import {join} from 'node:path';
import {Brain} from './brain/brain';

let journal:SessionJournal|undefined;

export async function activate(context:vscode.ExtensionContext):Promise<void> {
  const history=new LocalHistoryStore(context);
  journal=new SessionJournal(context.globalStorageUri.fsPath);
  await journal.initialize();
  // Reconstruct any stale SQLite cache from sanitized local journals on startup.
  await journal.rebuild();
  const overlay=new OverlayController(context.extensionUri);
  const view=new NaviView(context.extensionUri,()=>overlay.audioActive,cue=>overlay.playSound(cue));
  const brain=new Brain(vscode.window.state.focused);
  let currentActivity:ActivityEvent|undefined;
  const activity=new ActivityController(event=>{
    brain.observe(event);
    currentActivity=event.state==='busy'?event:undefined;
    const label=event.source==='codex'?'Codex':'NAVI';
    const text=event.state==='busy'?`${label}: Ich bearbeite deine Anfrage.`:
      event.state==='error'?`${label}: Die Anfrage konnte nicht abgeschlossen werden.`:
      event.state==='cancelled'?`${label}: Anfrage beendet oder abgebrochen.`:
      `${label}: ${event.message || 'Anfrage abgeschlossen.'}`;
    overlay.motion(event.state==='busy'?'think':event.state==='error'?'hint':event.state==='completed'?'celebrate':'hover');
    overlay.say(text);
    void view.showActivity({...event,message:text});
  });
  const activityTimer=setInterval(()=>{activity.expire();if(currentActivity)overlay.motion('think');},4000);
  activityTimer.unref();context.subscriptions.push({dispose:()=>clearInterval(activityTimer)});
  let codexBridge:NaviBridge|undefined;
  let codexConnection:Promise<NaviBridge>|undefined;
  let integrationDisposed=false;
  const connectCodex=async()=>{
    if(codexBridge)return codexBridge;
    if(!codexConnection)codexConnection=(async()=>{
      const bridge=new NaviBridge(context.globalStorageUri.fsPath,activity);
      await bridge.start();
      if(integrationDisposed){await bridge.dispose();throw new Error('NAVI was closed.');}
      codexBridge=bridge;return bridge;
    })().catch(error=>{codexConnection=undefined;throw error;});
    return codexConnection;
  };
  context.subscriptions.push({dispose:()=>{integrationDisposed=true;void codexBridge?.dispose();}});
  context.subscriptions.push(overlay.onSoundFailure(cue=>void view.playSound(cue)));
  const greetings=new GreetingCycle();
  const greet=()=>{
    if (currentActivity || !vscode.window.state.focused || !vscode.workspace.getConfiguration('navi').get<boolean>('fairy.animationEnabled',true)) return;
    const id=greetings.next(Date.now());
    if(id){overlay.motion(id);void view.showGreeting(id);}
  };
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState(state=>{brain.focus(state.focused);if(state.focused) greet();}),
    vscode.window.onDidChangeActiveTextEditor(editor=>{if(editor) greet();})
  );
  context.subscriptions.push(overlay,view.onMotion(({id,preview})=>{if(!currentActivity||id==='think')overlay.motion(id,preview);}),view.onAnalysis(result=>{if(!currentActivity)overlay.motion(result.hints.length?'hint':'celebrate');}));
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(NaviView.viewId,view),view);
  const session=journal.newSessionId();
  const workspaceId=journal.workspaceKey(vscode.workspace.workspaceFolders?.[0]?.uri.toString()??'no-workspace');
  let lastPrompt='';
  // Only NAVI's own Chat Participant requests are observed. Not the private Copilot history.
  registerNaviParticipant(context,history,async prompt=>{
    const analysis=analyzePrompt(prompt,{topicChanged:!!lastPrompt&&potentialTopicChange(lastPrompt,prompt)});
    lastPrompt=prompt; // in-memory only, discarded at deactivation
    await view.showAnalysis(analysis);
    overlay.motion(analysis.hints.length?'hint':'celebrate');
    if(vscode.workspace.getConfiguration('navi').get<boolean>('analytics.enabled',false)){
      for(const hint of analysis.hints){
        try{await journal?.record({workspaceId,sessionId:session,type:'hint',code:hint.code});}
        catch(err){console.error('NAVI sanitized event persistence failed',err);}
      }
    }
  },(id,state,message)=>{activity.update('vscode',id,state,message);});

  context.subscriptions.push(
    vscode.commands.registerCommand('navi.explainState',async()=>{
      const document=await vscode.workspace.openTextDocument({language:'markdown',content:brain.describe()});
      await vscode.window.showTextDocument(document,{preview:true,preserveFocus:true});
    }),
    vscode.commands.registerCommand('navi.configureCodex',async()=>{
      try{
        const bridge=await connectCodex();
        const quote=(value:string)=>JSON.stringify(value.replace(/\\/g,'/'));
        const configuration=`# Add this block to your Codex MCP configuration, then restart Codex.\n# This connection targets this NAVI window; regenerate it after reloading NAVI.\n[mcp_servers.navi]\ncommand = ${quote(process.execPath)}\nargs = [${quote(join(context.extensionUri.fsPath,'dist','src','integration','naviMcp.js'))}]\nenv = { ELECTRON_RUN_AS_NODE = "1", NAVI_CONNECTION_FILE = ${quote(bridge.descriptor)} }\n`;
        const document=await vscode.workspace.openTextDocument({language:'toml',content:configuration});
        await vscode.window.showTextDocument(document);
        void vscode.window.showInformationMessage('NAVI-Verbindung bereit. Diesen Block in die MCP-Konfiguration deines Codex-Clients übernehmen und Codex neu starten. Kein neues KI-Modell erforderlich.');
      }catch{void vscode.window.showErrorMessage('NAVI konnte die lokale Codex-Verbindung nicht starten.');}
    }),
    vscode.commands.registerCommand('navi.shareText',async()=>{
      const editor=vscode.window.activeTextEditor;
      const selected=editor&&!editor.selection.isEmpty?editor.document.getText(editor.selection):undefined;
      const message=selected??await vscode.window.showInputBox({title:'NAVI: Ausgewählten Text übergeben',prompt:'Nur diesen Text in der NAVI-Sprechblase anzeigen.',ignoreFocusOut:true});
      if(message?.trim()&&!activity.message('manual',message))void vscode.window.showInformationMessage('NAVI bearbeitet gerade eine Anfrage. Bitte die Meldung danach erneut übergeben.');
    }),
    vscode.commands.registerCommand('navi.talkToFairy',async()=>{await vscode.commands.executeCommand('workbench.action.chat.open',{query:'@navi ',isPartialQuery:true});}),
    vscode.commands.registerCommand('navi.showSpeech',async()=>{
      await vscode.workspace.getConfiguration('navi').update('bubble.enabled',true,vscode.ConfigurationTarget.Global);
      await overlay.show();overlay.say('Ich bin da. Schreib mir im Chat mit @navi.');void view.showSpeech('Ich bin da. Schreib mir im Chat mit @navi.');
    }),
    vscode.commands.registerCommand('navi.hideSpeech',async()=>{
      overlay.say('');await vscode.workspace.getConfiguration('navi').update('bubble.enabled',false,vscode.ConfigurationTarget.Global);
    }),
    vscode.commands.registerCommand('navi.showFairy',()=>overlay.show()),
    vscode.commands.registerCommand('navi.showOverlay',()=>overlay.show()),
    vscode.commands.registerCommand('navi.hideOverlay',()=>overlay.hide()),
    vscode.commands.registerCommand('navi.flyToPosition',async()=>{
      const target=await vscode.window.showQuickPick([
        {label:'Oben links',x:0,y:0}, {label:'Oben rechts',x:1,y:0},
        {label:'Mitte',x:.5,y:.5}, {label:'Unten links',x:0,y:1}, {label:'Unten rechts',x:1,y:1}
      ],{title:'NAVI: Flugziel im VS-Code-Fenster',placeHolder:'Die Fee hält Abstand zur Maus und wartet, wenn das Ziel blockiert ist.'});
      if(target) await overlay.flyTo(target.x,target.y);
    }),
    vscode.commands.registerCommand('navi.cancelFlight',()=>overlay.cancelTarget()),
    vscode.commands.registerCommand('navi.openCompanion',async()=>{await vscode.commands.executeCommand('navi.companion.focus');}),
    vscode.commands.registerCommand('navi.showStatus',async()=>{
      const enabled=vscode.workspace.getConfiguration('navi').get<boolean>('analytics.enabled',false);
      await vscode.window.showInformationMessage(`NAVI TypeScript companion active. Sanitized analytics: ${enabled?'enabled':'disabled'}. External Copilot chat history is not accessed.`);
    }),
    vscode.commands.registerCommand('navi.openDataFolder',async()=>{
      await vscode.workspace.fs.createDirectory(history.folder);
      await vscode.env.openExternal(history.folder);
    }),
    vscode.commands.registerCommand('navi.clearHistory',async()=>{
      if(await vscode.window.showWarningMessage('Permanently delete NAVI’s saved chat history (does not affect Copilot)?',{modal:true},'Delete history')!=='Delete history')return;
      await history.clear();void vscode.window.showInformationMessage('NAVI chat history deleted.');
    }),
    vscode.commands.registerCommand('navi.clearAnalytics',async()=>{
      if(await vscode.window.showWarningMessage('Permanently delete sanitized NAVI analytics for this VS Code profile?',{modal:true},'Delete analytics')!=='Delete analytics')return;
      await journal?.clear();void vscode.window.showInformationMessage('NAVI analytics deleted.');
    }),
    vscode.commands.registerCommand('navi.exportAnalytics',async()=>{
      const target=await vscode.window.showSaveDialog({saveLabel:'Export sanitized NAVI events',filters:{JSONL:['jsonl']}});
      if(!target)return;
      const result=await journal!.exportJsonl();
      await vscode.workspace.fs.writeFile(target,new TextEncoder().encode(result));
      void vscode.window.showInformationMessage('Sanitized NAVI event export complete.');
    }),
    vscode.commands.registerCommand('navi.rebuildIndex',async()=>{
      const status=await journal!.rebuild();
      void vscode.window.showInformationMessage(`NAVI: ${status.eventCount} events, ${status.sessionCount} sessions (${status.mode}).`);
    }),
    vscode.commands.registerCommand('navi.checkPrompt',async()=>{
      const text=await vscode.window.showInputBox({title:'NAVI: Check Prompt',prompt:'Local analysis; no model request; text not stored.',ignoreFocusOut:true});
      if(!text)return;
      const a=analyzePrompt(text);await view.showAnalysis(a);
      overlay.motion(a.hints.length?'hint':'celebrate');
      const msg=a.hints.map(h=>h.text).join(' · ') || 'No obvious issues detected.';
      void vscode.window.showInformationMessage(msg);
    }),
    vscode.commands.registerCommand('navi.importOtel',async()=>{
      const chosen=await vscode.window.showOpenDialog({canSelectMany:false,filters:{JSONL:['jsonl']},openLabel:'Import explicit local metrics'});
      if(!chosen?.length)return;
      const file=chosen[0];
      const metadata=await vscode.workspace.fs.stat(file);
      if(metadata.size>5_000_000){void vscode.window.showWarningMessage('NAVI only accepts metric files up to 5 MB.');return;}
      const input=new TextDecoder().decode(await vscode.workspace.fs.readFile(file));
      let added=0;
      for(const line of input.split(/\r?\n/).slice(0,5000)){
        if(!line.trim())continue;
        try{
          const parsed=parseTokenMetrics(JSON.parse(line));
          if(parsed){await journal!.record({workspaceId,sessionId:session,type:'token_metrics',inputTokens:parsed.inputTokens,outputTokens:parsed.outputTokens,cachedInputTokens:parsed.cachedInputTokens});added++;}
        }catch{ /* skip malformed or unsupported spans */ }
      }
      void vscode.window.showInformationMessage(`Imported ${added} sanitized metric records. Reimporting the same file creates duplicates.`);
    })
  );
  await overlay.update();
  greet();
}
export function deactivate():void{journal?.close();}
