import * as vscode from 'vscode';
import { registerNaviParticipant } from './chat/participant';
import { LocalHistoryStore } from './storage/localHistoryStore';
import { SessionJournal } from './storage/sessionJournal';
import { NaviView } from './ui/naviView';
import { analyzePrompt, potentialTopicChange } from './core/promptAnalyzer';
import { parseTokenMetrics } from './core/otelParser';
import { OverlayController } from './overlay/overlayController';

let journal:SessionJournal|undefined;

export async function activate(context:vscode.ExtensionContext):Promise<void> {
  const history=new LocalHistoryStore(context);
  journal=new SessionJournal(context.globalStorageUri.fsPath);
  await journal.initialize();
  // Reconstruct any stale SQLite cache from sanitized local journals on startup.
  await journal.rebuild();
  const overlay=new OverlayController(context.extensionUri);
  const view=new NaviView(context.extensionUri);
  context.subscriptions.push(overlay,view.onMotion(id=>overlay.motion(id)),view.onAnalysis(result=>overlay.motion(result.hints.length?'hint':'celebrate')));
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
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('navi.showFairy',()=>overlay.show()),
    vscode.commands.registerCommand('navi.showOverlay',()=>overlay.show()),
    vscode.commands.registerCommand('navi.hideOverlay',()=>overlay.hide()),
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
}
export function deactivate():void{journal?.close();}
