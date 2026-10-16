import {randomBytes} from 'node:crypto';
import * as vscode from 'vscode';
import {analyzePrompt, type Analysis} from '../core/promptAnalyzer';
import {renderNaviWebview} from './webviewContent';

export class NaviView implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = 'navi.companion';
  private view: vscode.WebviewView | undefined;
  private lastAnalysis: Analysis | undefined;
  private readonly viewSubscriptions: vscode.Disposable[] = [];
  private readonly emitter = new vscode.EventEmitter<Analysis>();
  private readonly configurationSubscription: vscode.Disposable;
  readonly onAnalysis = this.emitter.event;

  constructor(private readonly extensionUri: vscode.Uri) {
    this.configurationSubscription = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('navi.fairy.animationEnabled')) void this.sendSettings();
    });
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.clearViewSubscriptions();
    this.view = view;
    const webview = view.webview;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    webview.options = {enableScripts: true, localResourceRoots: [media]};
    this.viewSubscriptions.push(
      webview.onDidReceiveMessage((message: unknown) => this.receiveMessage(message)),
      view.onDidChangeVisibility(() => {
        void webview.postMessage({type: 'visibility', visible: view.visible});
      }),
      view.onDidDispose(() => {
        this.view = undefined;
        this.clearViewSubscriptions();
      })
    );
    webview.html = renderNaviWebview({
      cspSource: webview.cspSource,
      nonce: randomBytes(16).toString('base64'),
      styleUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'fairy.css')).toString(),
      motionUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'fairy-motion.js')).toString(),
      scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'fairy.js')).toString(),
      animationEnabled: this.animationEnabled()
    });
  }

  async showAnalysis(result: Analysis): Promise<void> {
    this.lastAnalysis = result; // Only rule text and counts; never prompt contents.
    if (!this.view) return;
    await this.view.webview.postMessage({type: 'analysis', hints: result.hints, characterCount: result.characterCount});
  }

  private async receiveMessage(message: unknown): Promise<void> {
    if (!message || typeof message !== 'object') return;
    const data = message as {type?: unknown; text?: unknown; enabled?: unknown};
    if (data.type === 'ready') {
      await this.sendSettings();
      if (this.view) await this.view.webview.postMessage({type: 'visibility', visible: this.view.visible});
      if (this.lastAnalysis) await this.showAnalysis(this.lastAnalysis);
    } else if (data.type === 'setAnimation' && typeof data.enabled === 'boolean') {
      try {
        await vscode.workspace.getConfiguration('navi').update('fairy.animationEnabled', data.enabled, vscode.ConfigurationTarget.Global);
      } catch {
        void vscode.window.showErrorMessage('NAVI konnte die Animationseinstellung nicht speichern.');
      }
      await this.sendSettings();
    } else if (data.type === 'check' && typeof data.text === 'string' && data.text.length <= 100_000) {
      const result = analyzePrompt(data.text);
      await this.showAnalysis(result);
      this.emitter.fire(result);
    }
  }

  private animationEnabled(): boolean {
    return vscode.workspace.getConfiguration('navi').get<boolean>('fairy.animationEnabled', true);
  }

  private async sendSettings(): Promise<void> {
    if (this.view) await this.view.webview.postMessage({type: 'settings', animationEnabled: this.animationEnabled()});
  }

  private clearViewSubscriptions(): void {
    while (this.viewSubscriptions.length) this.viewSubscriptions.pop()!.dispose();
  }

  dispose(): void {
    this.clearViewSubscriptions();
    this.configurationSubscription.dispose();
    this.emitter.dispose();
    this.view = undefined;
    this.lastAnalysis = undefined;
  }
}
