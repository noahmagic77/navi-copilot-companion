import * as vscode from 'vscode';
import { registerNaviParticipant } from './chat/participant';
import { LocalHistoryStore } from './storage/localHistoryStore';
import { NaviView } from './ui/naviView';
import { OverlayController } from './overlay/overlayController';
import { GreetingCycle } from './core/greetingCycle';
import {ActivityController,type ActivityEvent} from './integration/activity';
import {NaviBridge} from './integration/bridge';
import {join} from 'node:path';
import {Brain,type EditorObservation} from './brain/brain';
import {ExpressionController,isActiveActivity,describeExpression} from './brain/expression';
import {Companion} from './companion/companion';
import type {VoiceProvider} from './integration/voice';

let activeCompanion:Companion|undefined;

export async function activate(context:vscode.ExtensionContext):Promise<{registerVoiceProvider(provider:VoiceProvider):vscode.Disposable;getCompanionState():ReturnType<Companion['snapshot']>;getEditorAnchorState():OverlayController['editorAnchorState']}> {
  const history=new LocalHistoryStore(context);
  const overlay=new OverlayController(context.extensionUri);
  const view=new NaviView(context.extensionUri,()=>overlay.audioActive,cue=>overlay.playSound(cue));
  const brain=new Brain(vscode.window.state.focused);
  const expression=new ExpressionController(frame=>{
    overlay.express(frame);
    if(frame.state==='acknowledge')overlay.say('');
    if(frame.message)overlay.say(frame.message);
    view.showExpression(frame);
    const cue=frame.state==='acknowledge'?'discover':frame.state==='error'||frame.state==='offer'?'hint':undefined;
    if(cue&&!overlay.playSound(cue))void view.playSound(cue);
  });
  const expressionTimer=setInterval(()=>expression.tick(),80);expressionTimer.unref();
  context.subscriptions.push({dispose:()=>clearInterval(expressionTimer)});
  const syncEditorPerception=(editor:vscode.TextEditor|undefined):void=>{
    if(!editor){brain.editor(null);return;}
    const selection=editor.selection;
    const contextKind=selection.isEmpty?'line':'selection';
    const document=editor.document;
    const startOffset=selection.isEmpty
      ? Math.max(document.offsetAt(new vscode.Position(selection.active.line,0)),document.offsetAt(selection.active)-1000)
      : document.offsetAt(selection.start);
    const requestedEnd=selection.isEmpty
      ? document.offsetAt(new vscode.Position(selection.active.line,selection.active.character+1000))
      : document.offsetAt(selection.end);
    const endOffset=Math.max(startOffset,Math.min(requestedEnd,startOffset+2000));
    const boundedRange=new vscode.Range(document.positionAt(startOffset),document.positionAt(endOffset));
    const text=document.getText(boundedRange);
    const position=(value:vscode.Position)=>({line:value.line,character:value.character});
    const diagnostics:EditorObservation['diagnostics']=vscode.languages.getDiagnostics(document.uri).slice(0,25).map(diagnostic=>({
      severity:diagnostic.severity===vscode.DiagnosticSeverity.Error?'error':diagnostic.severity===vscode.DiagnosticSeverity.Warning?'warning':diagnostic.severity===vscode.DiagnosticSeverity.Information?'information':'hint',
      source:diagnostic.source??null,
      code:diagnostic.code===undefined?null:typeof diagnostic.code==='object'?String(diagnostic.code.value):String(diagnostic.code),
      message:diagnostic.message.slice(0,500),
      start:position(diagnostic.range.start),end:position(diagnostic.range.end)
    }));
    brain.editor({
      languageId:document.languageId,version:document.version,
      selection:{start:position(selection.start),end:position(selection.end)},
      contextKind,contextText:text,diagnostics
    });
  };
  let editorRefreshTimer:ReturnType<typeof setTimeout>|undefined;
  const queueEditorPerception=():void=>{
    if(editorRefreshTimer)clearTimeout(editorRefreshTimer);
    editorRefreshTimer=setTimeout(()=>syncEditorPerception(vscode.window.activeTextEditor),100);
  };
  syncEditorPerception(vscode.window.activeTextEditor);
  let currentActivity:ActivityEvent|undefined;
  const activity=new ActivityController(event=>{
    brain.observe(event);
    currentActivity=isActiveActivity(event)?event:undefined;
    expression.observe(brain.snapshot(),event);
  });
  const companion=new Companion(context,brain,expression,overlay,view,()=>!!currentActivity);
  activeCompanion=companion;
  context.subscriptions.push(companion);
  const activityTimer=setInterval(()=>activity.expire(),4000);
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
  context.subscriptions.push(
    overlay.onSoundFailure(cue=>void view.playSound(cue)),
    overlay.onPointer(point=>brain.pointer(point)),
    {dispose:()=>{if(editorRefreshTimer)clearTimeout(editorRefreshTimer);}},
    vscode.window.onDidChangeTextEditorSelection(event=>{if(event.textEditor===vscode.window.activeTextEditor)queueEditorPerception();}),
    vscode.workspace.onDidChangeTextDocument(event=>{if(event.document===vscode.window.activeTextEditor?.document)queueEditorPerception();}),
    vscode.languages.onDidChangeDiagnostics(event=>{
      const document=vscode.window.activeTextEditor?.document;
      if(document&&event.uris.some(uri=>uri.toString()===document.uri.toString()))queueEditorPerception();
    })
  );
  const greetings=new GreetingCycle();
  const greet=()=>{
    if (companion.occupied || expression.snapshot().state!=='idle' || !vscode.window.state.focused || !vscode.workspace.getConfiguration('navi').get<boolean>('fairy.animationEnabled',true)) return;
    const id=greetings.next(Date.now());
    if(id){overlay.motion(id);void view.showGreeting(id);}
  };
  const useLegacyGreetings=()=>{const config=vscode.workspace.getConfiguration('navi');return !config.get<boolean>('companion.enabled',true)||!config.get<boolean>('companion.lifelike',true);};
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState(state=>{brain.focus(state.focused);if(state.focused&&useLegacyGreetings())greet();}),
    vscode.window.onDidChangeActiveTextEditor(editor=>{syncEditorPerception(editor);if(editor&&useLegacyGreetings())greet();})
  );
  context.subscriptions.push(overlay,view.onMotion(({id,preview})=>{if(expression.snapshot().state==='idle')overlay.motion(id,preview);}),view.onGameAction(action=>{if(action.type==='start'&&!currentActivity)void overlay.startGame(action.mode);else if(action.type==='stop')overlay.stopGame();}));
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(NaviView.viewId,view),view);
  // Only NAVI's own requests drive activity; no prompt scoring or analysis.
  registerNaviParticipant(context,history,(id,state,message)=>{activity.update('vscode',id,state,message);});

  context.subscriptions.push(
    vscode.commands.registerCommand('navi.explainState',async()=>{
      const document=await vscode.workspace.openTextDocument({language:'markdown',content:brain.describe()+describeExpression(expression.snapshot())});
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
    vscode.commands.registerCommand('navi.playGame',()=>overlay.playGame()),
    vscode.commands.registerCommand('navi.stopGame',()=>overlay.stopGame()),
    vscode.commands.registerCommand('navi.openCompanion',async()=>{await vscode.commands.executeCommand('navi.companion.focus');}),
    vscode.commands.registerCommand('navi.showStatus',async()=>{
      await vscode.window.showInformationMessage('NAVI ist aktiv. Die Fee begleitet dich mit Wahrnehmung, Reaktionen und ausdrücklicher Problemhilfe.');
    }),
    vscode.commands.registerCommand('navi.openDataFolder',async()=>{
      await vscode.workspace.fs.createDirectory(history.folder);
      await vscode.env.openExternal(history.folder);
    }),
    vscode.commands.registerCommand('navi.clearHistory',async()=>{
      if(await vscode.window.showWarningMessage('Permanently delete NAVI’s saved chat history (does not affect Copilot)?',{modal:true},'Delete history')!=='Delete history')return;
      await history.clear();void vscode.window.showInformationMessage('NAVI chat history deleted.');
    })
  );
  await overlay.update();
  greet();
  return {registerVoiceProvider:provider=>companion.registerVoiceProvider(provider),getCompanionState:()=>companion.snapshot(),getEditorAnchorState:()=>overlay.editorAnchorState};
}
export async function deactivate():Promise<void>{await activeCompanion?.stopListening();}
