import {randomBytes} from 'node:crypto';
import * as vscode from 'vscode';
import {renderBrainWebview} from './brainContent';
export class BrainView implements vscode.Disposable {
  private panel:vscode.WebviewPanel|undefined;
  private last='';
  private readonly timer:ReturnType<typeof setInterval>;
  constructor(private readonly data:()=>unknown){this.timer=setInterval(()=>this.refresh(),250);this.timer.unref();}
  open():void {
    if(this.panel){this.panel.reveal();return;}
    const panel=vscode.window.createWebviewPanel('navi.brain','NAVIs Gehirn',vscode.ViewColumn.Beside,{enableScripts:true,localResourceRoots:[]});
    this.panel=panel;this.last='';
    panel.onDidDispose(()=>{if(this.panel===panel)this.panel=undefined;});
    panel.webview.onDidReceiveMessage(message=>{
      if(message?.type==='ready'){this.last='';this.refresh();}
      if(message?.type==='command'&&['navi.showProblems','navi.manageMemories','navi.stopListening','navi.toggleInitiative'].includes(message.command))void vscode.commands.executeCommand(message.command);
    });
    const nonce=randomBytes(16).toString('base64');
    panel.webview.html=renderBrainWebview(nonce);
  }
  private refresh():void{
    if(!this.panel?.visible)return;
    const data=this.data(),serialized=JSON.stringify(data);
    if(serialized===this.last)return;
    this.last=serialized;void this.panel.webview.postMessage({type:'snapshot',data});
  }
  dispose():void{clearInterval(this.timer);this.panel?.dispose();}
}
