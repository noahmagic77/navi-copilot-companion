'use strict';
// Runs inside the real VS Code Extension Host, using an isolated test profile.
const vscode=require('vscode');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,timeout=15000){const started=Date.now();while(Date.now()-started<timeout){if(predicate())return;await delay(100);}throw Error('Timed out waiting for companion state');}
async function editorProbe(){
  const pages=await(await fetch('http://127.0.0.1:19389/json/list')).json();
  const page=pages.find(item=>item.type==='page'&&item.url.includes('workbench'));
  assert(page,'No isolated workbench debugger target');
  const socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map();
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const request=pending.get(message.id);if(!request)return;pending.delete(message.id);if(message.error)request.reject(Error(JSON.stringify(message.error)));else request.resolve(message.result);}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});socket.send(JSON.stringify({id:request,method,params}));});
  await call('Page.bringToFront');
  const rendering=async()=>(await call('Runtime.evaluate',{expression:`[...document.querySelectorAll('[class*="ced-"]')].map(element=>{const style=getComputedStyle(element,'::before');const box=element.getBoundingClientRect();return {background:style.backgroundColor,border:style.borderColor,display:style.display,width:style.width,height:style.height,x:box.x,y:box.y}}).filter(item=>item.border==='rgb(179, 234, 255)')`,returnByValue:true})).result.value;
  return {call,rendering,close:()=>socket.close()};
}
exports.run=async()=>{
  const report={host:process.versions,focused:vscode.window.state.focused,checks:[],limitations:[]};
  const reportName=process.env.NAVI_TEST_PIXEL_ANCHORS==='1'?(process.env.NAVI_TEST_EDITOR_ANCHOR_RENDER_ONLY==='1'?'companion-editor-host-report.json':'companion-pixel-host-report.json'):'companion-host-report.json';
  const output=path.join(__dirname,'..','build',reportName);
  let api,probe;
  try{
    const extension=vscode.extensions.getExtension('navi-labs.navi-copilot-companion');assert(extension);
    api=await extension.activate();assert.equal(typeof api.getCompanionState,'function');
    const commands=await vscode.commands.getCommands(true);
    for(const action of ['navi.actions','navi.showWorkspaceProblems','navi.quickFix','navi.fixProblem','navi.explainSelection','navi.showOfferedProblem'])assert(commands.includes(action),action);
    for(const retired of ['navi.checkPrompt','navi.importOtel','navi.exportAnalytics','navi.clearAnalytics','navi.rebuildIndex'])assert(!commands.includes(retired),retired);
    assert(!Object.keys(require.cache).some(file=>/[/\\](sessionJournal|otelParser|promptAnalyzer)\.js$/.test(file)));
    report.checks.push('retired analysis/metrics commands and journal/index modules are absent');
    const config=vscode.workspace.getConfiguration('navi');
    await config.update('overlay.enabled',false,vscode.ConfigurationTarget.Global);
    await config.update('fairy.animationEnabled',true,vscode.ConfigurationTarget.Global);
    await config.update('companion.enabled',true,vscode.ConfigurationTarget.Global);
    const document=await vscode.workspace.openTextDocument({language:'typescript',content:'const sample = 1;\nconst other = 2;\n'});
    const editor=await vscode.window.showTextDocument(document);
    await delay(2500);
    const collection=vscode.languages.createDiagnosticCollection('navi-host-test');
    collection.set(document.uri,[new vscode.Diagnostic(new vscode.Range(1,6,1,11),'TEST_DIAGNOSTIC_SECRET',vscode.DiagnosticSeverity.Error)]);
    await until(()=>api.getCompanionState().perception.editor?.diagnostics===1);
    assert(!JSON.stringify(api.getCompanionState()).includes('TEST_DIAGNOSTIC_SECRET'));
    report.checks.push('real VS Code diagnostic adapter and sanitized live projection');
    assert.equal(api.getCompanionState().capabilities.editorTargets.implemented,true);
    assert.equal(api.getCompanionState().capabilities.memory.availability,'unknown');
    assert.deepEqual(api.getCompanionState().memories,[]);
    report.checks.push('implemented navigation and opt-in memory capabilities');
    if(vscode.window.state.focused&&process.env.NAVI_TEST_FOCUS_TIMINGS!=='0'){
      await until(()=>api.getCompanionState().expression.state==='idle');
      for(let i=0;i<3;i++){await editor.edit(edit=>edit.insert(new vscode.Position(0,0),' '));await delay(180);}
      await until(()=>api.getCompanionState().decisions.some(item=>item.action==='makeSpace'));
      await until(()=>api.getCompanionState().decisions.some(item=>item.action==='returnHome'),18000);
      report.checks.push('real editor changes → makeSpace → ten-second return');
      await config.update('companion.enabled',false,vscode.ConfigurationTarget.Global);
      await until(()=>api.getCompanionState().decision?.reason.includes('ausgeschaltet'));
      report.checks.push('configuration disables initiative');
      await config.update('companion.enabled',true,vscode.ConfigurationTarget.Global);
      await config.update('companion.lifelike',true,vscode.ConfigurationTarget.Global);
      const lifeUri=vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri,'living-fixture.ts');
      await vscode.workspace.fs.writeFile(lifeUri,new TextEncoder().encode('const life = 1;\n'));
      const lifeDocument=await vscode.workspace.openTextDocument(lifeUri),lifeEditor=await vscode.window.showTextDocument(lifeDocument);
      await delay(5500);
      await lifeEditor.edit(edit=>edit.insert(new vscode.Position(0,0),' '));
      await lifeDocument.save();
      await until(()=>api.getCompanionState().expression.state==='pleased'&&api.getCompanionState().expression.reason.includes('gespeichert'),12000);
      report.checks.push('real saved-document event → pleased reaction with accurate evidence');
      await delay(4000);
      if(process.env.NAVI_TEST_NODE){
        const task=new vscode.Task({type:'navi-presence-fixture'},vscode.TaskScope.Workspace,'NAVI presence fixture','NAVI tests',new vscode.ProcessExecution(process.env.NAVI_TEST_NODE,['-e','process.exit(0)']));
        await vscode.tasks.executeTask(task);
        await until(()=>api.getCompanionState().expression.state==='pleased'&&api.getCompanionState().expression.reason.includes('Exit-Code 0'),15000);
        report.checks.push('actual VS Code task process exit → bounded result reaction');
      }
      await config.update('companion.lifelike',false,vscode.ConfigurationTarget.Global);
      await until(()=>api.getCompanionState().presence?.enabled===false);
      report.checks.push('lifelike behavior can be disabled independently');
      await config.update('companion.enabled',false,vscode.ConfigurationTarget.Global);
      await vscode.window.showTextDocument(document);
    }else report.limitations.push(process.env.NAVI_TEST_FOCUS_TIMINGS==='0'?'Focus-dependent timings intentionally omitted for this targeted quick-fix run.':'Window was not focused: visual flight and foreground timings need manual live acceptance.');
    const registration=api.registerVoiceProvider({metadata:{name:'Host fixture',device:'No physical microphone',processing:'unknown',dataPath:'Test fixture, no audio',continuous:true},async start(){},async stop(){}});
    assert.match(api.getCompanionState().voice,/registriert/);registration.dispose();
    assert.match(api.getCompanionState().voice,/getrennt/);
    report.checks.push('extension API registers/removes an existing voice provider without recording');
    await vscode.commands.executeCommand('navi.openBrain');
    await vscode.commands.executeCommand('navi.openCompanion');
    await delay(500);
    // No model request or automatic notification choice is made by this test.
    void vscode.commands.executeCommand('navi.nextProblem');
    await until(()=>vscode.window.activeTextEditor?.document===document&&vscode.window.activeTextEditor.selection.start.line===1);
    assert.equal(vscode.window.activeTextEditor.selection.start.character,6);
    assert.equal(vscode.window.activeTextEditor.selection.end.character,11);
    report.checks.push('explicit next-problem command marks the actual diagnostic range');
    collection.set(document.uri,[
      new vscode.Diagnostic(new vscode.Range(1,6,1,11),'TEST_DIAGNOSTIC_SECRET',vscode.DiagnosticSeverity.Error),
      new vscode.Diagnostic(new vscode.Range(0,6,0,12),'TEST_WARNING',vscode.DiagnosticSeverity.Warning)
    ]);
    await vscode.commands.executeCommand('navi.nextProblem');
    assert.equal(vscode.window.activeTextEditor.selection.start.line,0);
    await vscode.commands.executeCommand('navi.nextProblem');
    assert.equal(vscode.window.activeTextEditor.selection.start.line,1);
    report.checks.push('repeated next-problem commands advance and wrap while follow-up notifications remain open');
    const projectUri=vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri,'workspace-problem-fixture.ts');
    await vscode.workspace.fs.writeFile(projectUri,new TextEncoder().encode('const issue = 1;\n'));
    collection.set(projectUri,[new vscode.Diagnostic(new vscode.Range(0,6,0,11),'PROJECT_DIAGNOSTIC',vscode.DiagnosticSeverity.Error)]);
    const projectPick=vscode.commands.executeCommand('navi.showWorkspaceProblems');
    await delay(500);
    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
    await Promise.race([projectPick,delay(10000).then(()=>{throw Error('Workspace problem picker did not complete');})]);
    assert.equal(vscode.window.activeTextEditor.document.uri.toString(),projectUri.toString());
    assert.equal(vscode.window.activeTextEditor.selection.start.character,6);
    assert.equal(vscode.window.activeTextEditor.selection.end.character,11);
    report.checks.push('workspace problem picker opens and marks a known diagnostic outside the active document');
    if(process.env.NAVI_TEST_PIXEL_ANCHORS==='1'){
      const anchorUri=vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri,'pixel-anchor-fixture.ts');
      const lines=Array.from({length:70},(_,i)=>`const line${i} = ${i};`);lines[30]='// '+ 'wrapped fixture '.repeat(100);
      await vscode.workspace.fs.writeFile(anchorUri,new TextEncoder().encode(lines.join('\n')));
      const anchorDocument=await vscode.workspace.openTextDocument(anchorUri);
      await vscode.workspace.getConfiguration('editor',anchorUri).update('wordWrap','on',vscode.ConfigurationTarget.Global);
      await vscode.window.showTextDocument(anchorDocument);await until(()=>vscode.window.activeTextEditor?.document===anchorDocument);
      collection.set(anchorUri,[new vscode.Diagnostic(new vscode.Range(35,6,35,11),'PIXEL_ANCHOR_FIXTURE',vscode.DiagnosticSeverity.Error)]);
      await delay(500);
      probe=await editorProbe();
      const renderOnly=process.env.NAVI_TEST_EDITOR_ANCHOR_RENDER_ONLY==='1';
      if(!renderOnly){const activated=require('node:child_process').spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'activate-companion-test-window.ps1')],{windowsHide:true,encoding:'utf8'});assert.equal(activated.status,0,activated.stderr);}
      if(!renderOnly)await until(()=>vscode.window.state.focused);
      const arrivals=[];
      const visit=async()=>{
        const prior=api.getEditorAnchorState()?.id;
        await vscode.commands.executeCommand('navi.nextProblem');
        if(renderOnly){
          let rendered=[];for(let attempt=0;attempt<40;attempt++){rendered=await probe.rendering();if(rendered.length===1)break;await delay(100);}assert.equal(rendered.length,1,'Exactly one selected editor beacon must be rendered');
          const imagePath=path.join(__dirname,'..','build',`companion-editor-anchor-${arrivals.length}.png`);
          const shot=await probe.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(imagePath,Buffer.from(shot.data,'base64'));
          arrivals.push({...rendered[0],imagePath});return;
        }
        await until(()=>{const state=api.getEditorAnchorState();return state&&state.id!==prior&&state.status==='arrived';},12000);
        const state=api.getEditorAnchorState();
        assert(Math.hypot(state.x-state.coreX,state.y-state.coreY)<=1);
        arrivals.push(state);
      };
      await visit();
      const originalColumn=vscode.window.activeTextEditor.viewColumn;
      await vscode.commands.executeCommand('workbench.action.zoomIn');
      try{await delay(600);await visit();}finally{await vscode.commands.executeCommand('workbench.action.zoomOut');await delay(600);}
      await vscode.commands.executeCommand('workbench.action.splitEditorRight');await delay(500);
      assert.notEqual(vscode.window.activeTextEditor.viewColumn,originalColumn);
      await visit();
      if(renderOnly){report.editorAnchorRendering=arrivals;report.limitations.push('Renderer-only anchor run: native VS Code-to-overlay arrival is not accepted; Windows foreground activation was denied in the full run.');report.checks.push('actual editor beacon rendering remains unique through zoom, word wrapping and duplicate-document split editors');}
      else {report.pixelAnchorArrivals=arrivals;report.checks.push('actual VS Code decoration → screen detection → native arrival, including zoom, wrapped lines and duplicate-document split editors');}
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }
    // A controlled existing-provider fixture exercises the actual VS Code code-action
    // pipeline and undo; it does not claim every language server repairs this syntax.
    const broken='const value = (1 + 2;\n',fixed='const value = (1 + 2);\n';
    const syntaxDocument=await vscode.workspace.openTextDocument({language:'plaintext',content:broken});
    await vscode.window.showTextDocument(syntaxDocument);
    await until(()=>vscode.window.activeTextEditor?.document===syntaxDocument);
    const insertAt=new vscode.Position(0,broken.indexOf(';'));
    const syntaxDiagnostic=new vscode.Diagnostic(new vscode.Range(insertAt,insertAt),"')' expected",vscode.DiagnosticSeverity.Error);
    let fixMode='single',providerCalls=0,delayedEntered=false,releaseFix;
    const delayedFix=new Promise(resolve=>{releaseFix=resolve;});
    const updateSyntaxDiagnostics=()=>collection.set(syntaxDocument.uri,syntaxDocument.getText()===broken?[syntaxDiagnostic]:[]);
    const syntaxWatcher=vscode.workspace.onDidChangeTextDocument(event=>{if(event.document===syntaxDocument)updateSyntaxDiagnostics();});
    const fixes=vscode.languages.registerCodeActionsProvider({language:'plaintext',scheme:'untitled'},{
      async provideCodeActions(doc,_range,context){
        if(doc!==syntaxDocument||doc.getText()!==broken)return [];
        providerCalls++;
        // VS Code also asks automatically for its light bulb, with no kind filter.
        if(context.only)assert(context.only.contains(vscode.CodeActionKind.QuickFix));
        if(fixMode==='none')return [];
        if(fixMode==='delayed'){delayedEntered=true;await delayedFix;}
        const makeFix=title=>{const fix=new vscode.CodeAction(title,vscode.CodeActionKind.QuickFix);fix.isPreferred=true;fix.diagnostics=[syntaxDiagnostic];fix.edit=new vscode.WorkspaceEdit();fix.edit.insert(doc.uri,insertAt,')');return fix;};
        const action=makeFix('Insert missing closing parenthesis');
        return fixMode==='ambiguous'?[action,makeFix('Alternative explicit fix')]:[action];
      }
    },{providedCodeActionKinds:[vscode.CodeActionKind.QuickFix]});
    try{
      updateSyntaxDiagnostics();
      const offeredFixes=await vscode.commands.executeCommand('vscode.executeCodeActionProvider',syntaxDocument.uri,syntaxDiagnostic.range,'quickfix',10);
      report.offeredFixes=offeredFixes.map(action=>({title:action.title,kind:action.kind?.value,preferred:!!action.isPreferred,hasEdit:!!action.edit,command:action.command?.command}));
      await vscode.commands.executeCommand('navi.fixProblem');
      await until(()=>syntaxDocument.getText()===fixed);
      assert(providerCalls>0);
      await vscode.commands.executeCommand('undo');
      await until(()=>syntaxDocument.getText()===broken);
      report.checks.push('explicit preferred fix inserts a missing parenthesis through a real provider and VS Code undo restores the original');
      fixMode='ambiguous';
      await vscode.commands.executeCommand('navi.fixProblem');await delay(300);
      assert.equal(syntaxDocument.getText(),broken);
      if(commands.includes('hideCodeActionWidget'))await vscode.commands.executeCommand('hideCodeActionWidget');
      report.checks.push('multiple quick fixes leave code unchanged until a choice is made');
      fixMode='none';
      await vscode.commands.executeCommand('navi.fixProblem');await delay(200);
      assert.equal(syntaxDocument.getText(),broken);
      report.checks.push('a missing provider fix leaves the syntax error unchanged');
      if(commands.includes('hideCodeActionWidget'))await vscode.commands.executeCommand('hideCodeActionWidget');
      fixMode='delayed';
      const staleFix=vscode.commands.executeCommand('navi.fixProblem');
      await until(()=>delayedEntered);
      await vscode.window.activeTextEditor.edit(edit=>edit.insert(new vscode.Position(0,0),' '));
      releaseFix();await staleFix;await delay(200);
      assert.equal(syntaxDocument.getText(),' '+broken);
      await vscode.commands.executeCommand('undo');
      await until(()=>syntaxDocument.getText()===broken);
      report.checks.push('editing during provider resolution cancels the stale fix without applying its old range');
    }finally{report.fixFixture={providerCalls,documentChanged:syntaxDocument.getText()!==broken};fixes.dispose();syntaxWatcher.dispose();}
    collection.dispose();
    report.limitations.push('No real model/voice provider, microphone recording or human visual acceptance exercised. Syntax fixes use a controlled registered code-action provider.');
    report.success=true;
  }catch(error){report.success=false;report.error=String(error.stack||error);report.lastState=api?.getCompanionState();report.lastAnchor=api?.getEditorAnchorState();if(probe){try{report.anchorRendering=(await probe.call('Runtime.evaluate',{expression:`[...document.querySelectorAll('[class*="ced-"]')].map(element=>{const style=getComputedStyle(element,'::before');const box=element.getBoundingClientRect();return {background:style.backgroundColor,border:style.borderColor,display:style.display,width:style.width,height:style.height,x:box.x,y:box.y}}).filter(item=>item.border==='rgb(179, 234, 255)')`,returnByValue:true})).result.value;const shot=await probe.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(__dirname,'..','build','companion-anchor-test.png'),Buffer.from(shot.data,'base64'));}catch(probeError){report.probeError=String(probeError);}}throw error;}
  finally{probe?.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));}
};
