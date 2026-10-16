import * as vscode from 'vscode';
import {analyzePrompt, type Analysis} from '../core/promptAnalyzer';

export class NaviView implements vscode.WebviewViewProvider {
  public static readonly viewId = 'navi.companion';
  private view: vscode.WebviewView|undefined;
  private readonly emitter = new vscode.EventEmitter<Analysis>();
  readonly onAnalysis = this.emitter.event;
  constructor(private readonly extensionUri:vscode.Uri) {}
  resolveWebviewView(view:vscode.WebviewView):void {
    this.view=view;
    const webview=view.webview;
    webview.options={enableScripts:true,localResourceRoots:[vscode.Uri.joinPath(this.extensionUri,'media')]};
    const nonce=cryptoNonce();
    const style=webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri,'media','fairy.css'));
    const script=webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri,'media','fairy.js'));
    const logo=webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri,'media','logo.png'));
    webview.html=`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource};"><link rel="stylesheet" href="${style}"></head><body><main><div class="hero"><div class="fairy" aria-hidden="true"><span class="wing left"></span><span class="wing right"></span><span class="glow"></span></div><img class="brand-mark" src="${logo}" alt="NAVI logo"><h1>NAVI</h1><p class="eyebrow">Copilot Companion · Local First</p></div><section class="speech" aria-live="polite"><strong id="heading">Willkommen!</strong><p id="hint">Ich zeige Tipps nur, wenn du sie brauchst. Keine zusätzlichen KI-Aufrufe.</p></section><form id="check"><label for="prompt">Prompt lokal prüfen</label><textarea id="prompt" rows="4" maxlength="100000" placeholder="Was möchtest du Copilot fragen?"></textarea><button type="submit">Prompt analysieren</button></form><p id="status" class="status" role="status">Lokale Analyse · Kein Versand</p></main><script nonce="${nonce}" src="${script}"></script></body></html>`;
    webview.onDidReceiveMessage(async (m:unknown)=>{
      if(!m || typeof m!=='object') return;
      const x=m as {type?:unknown;text?:unknown};
      if(x.type==='check' && typeof x.text==='string' && x.text.length<=100000) {
        const result=analyzePrompt(x.text);
        await this.showAnalysis(result);
        this.emitter.fire(result);
      }
    });
  }
  async showAnalysis(result:Analysis):Promise<void> {
    if(!this.view)return;
    await this.view.webview.postMessage({type:'analysis',hints:result.hints,characterCount:result.characterCount});
  }
  dispose():void {this.emitter.dispose();}
}
function cryptoNonce():string {return require('node:crypto').randomBytes(16).toString('base64');}
