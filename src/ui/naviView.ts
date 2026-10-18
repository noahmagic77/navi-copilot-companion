import {randomBytes} from 'node:crypto';
import * as vscode from 'vscode';
import {renderNaviWebview} from './webviewContent';
import {motionIds} from '../core/motionCatalog';
import {isSoundCue,soundForMotion} from '../core/soundPolicy';
import {speechText} from '../core/speechText';
import type {ExpressionFrame} from '../brain/expression';
import type {PresenceValues} from '../brain/presence';

export type GameAction = {type:'start';mode:'catch'|'chase'|'hide'}|{type:'stop'};

export class NaviView implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = 'navi.companion';
  private view: vscode.WebviewView | undefined;
  private expression:{frame:ExpressionFrame;at:number}|undefined;
  private companionAway=false;
  private problemOffer=false;
  private problemMessage='';
  private readonly viewSubscriptions: vscode.Disposable[] = [];
  private readonly configurationSubscription: vscode.Disposable;
  private readonly motionEmitter = new vscode.EventEmitter<{id:string;preview:boolean}>();
  readonly onMotion = this.motionEmitter.event;
  private readonly gameEmitter = new vscode.EventEmitter<GameAction>();
  readonly onGameAction = this.gameEmitter.event;
  private readonly interactions=new vscode.EventEmitter<'touch'|'pointer'>();
  readonly onInteraction=this.interactions.event;
  private presenceFrame:{enabled:boolean;values:PresenceValues}|undefined;

  constructor(private readonly extensionUri: vscode.Uri,private readonly nativeAudio:()=>boolean=()=>false,private readonly playNativeSound:(cue:string)=>boolean=()=>false) {
    this.configurationSubscription = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('navi.fairy.animationEnabled') || event.affectsConfiguration('navi.fairy.powerMode') || event.affectsConfiguration('navi.fairy.respectReducedMotion') || event.affectsConfiguration('navi.sound') || event.affectsConfiguration('navi.bubble')) void this.sendSettings();
    });
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.clearViewSubscriptions();
    this.view = view;
    const webview = view.webview;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    webview.options = {enableScripts: true, localResourceRoots: [media]};
    this.viewSubscriptions.push(
      vscode.window.onDidChangeWindowState(state=>{void webview.postMessage({type:'audioFocus',focused:state.focused});if(state.focused)this.restoreExpression();}),
      webview.onDidReceiveMessage((message: unknown) => this.receiveMessage(message)),
      view.onDidChangeVisibility(() => {
        void webview.postMessage({type: 'visibility', visible: view.visible});
        if(view.visible)this.restoreExpression();
        if (!view.visible) this.motionEmitter.fire({id:'hover',preview:false});
      }),
      view.onDidDispose(() => {
        this.motionEmitter.fire({id:'hover',preview:false});
        this.view = undefined;
        this.clearViewSubscriptions();
      })
    );
    webview.html = renderNaviWebview({
      cspSource: webview.cspSource,
      nonce: randomBytes(16).toString('base64'),
      styleUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'fairy.css')).toString(),
      motionUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'fairy-motion.js')).toString(),
      expressionUri:webview.asWebviewUri(vscode.Uri.joinPath(media,'fairy-expression.js')).toString(),
      scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'fairy.js')).toString(),
      soundBaseUri:webview.asWebviewUri(vscode.Uri.joinPath(media,'sounds')).toString(),
      soundScriptUri:webview.asWebviewUri(vscode.Uri.joinPath(media,'fairy-sound.js')).toString(),
      soundEnabled:vscode.workspace.getConfiguration('navi').get<boolean>('sound.enabled',false),
      soundVolume:vscode.workspace.getConfiguration('navi').get<number>('sound.volume',30),
      bubbleEnabled:vscode.workspace.getConfiguration('navi').get<boolean>('bubble.enabled',true),
      animationEnabled: this.animationEnabled(),
      respectReducedMotion: this.respectReducedMotion(),
      powerMode: this.powerMode(),
      overlaySupported: process.platform==='win32' && process.arch==='x64'
    });
  }

  async showGreeting(motion: string): Promise<void> {
    if (this.view?.visible) await this.view.webview.postMessage({type:'greeting', motion});
  }
  async showSpeech(message:string):Promise<void>{
    if(this.view?.visible) await this.view.webview.postMessage({type:'speech',message:speechText(message)});
  }
  companionPosition(away:boolean):void{this.companionAway=away;if(this.view?.visible)void this.view.webview.postMessage({type:'companionPosition',away});}
  offerProblem(available:boolean,message=''):void{this.problemOffer=available;this.problemMessage=message;if(this.view?.visible)void this.view.webview.postMessage({type:'problemOffer',available,message});}
  presence(values:PresenceValues,enabled:boolean):void{
    const wasEnabled=this.presenceFrame?.enabled;
    this.presenceFrame={enabled,values:{...values}};
    if(this.view?.visible&&(enabled||wasEnabled!==enabled))void this.view.webview.postMessage({type:'presence',enabled,...values});
  }
  showExpression(frame:ExpressionFrame):void{
    this.expression={frame:{...frame,message:speechText(frame.message)},at:Date.now()};
    this.restoreExpression();
  }
  private restoreExpression():void{
    if(this.view?.visible&&this.expression)void this.view.webview.postMessage({type:'expression',...this.expression.frame,age:this.expression.frame.age+Math.max(0,(Date.now()-this.expression.at)/1000)});
  }
  async playSound(cue:string):Promise<void>{
    if(isSoundCue(cue)&&this.view?.visible&&vscode.window.state.focused)await this.view.webview.postMessage({type:'sound',cue});
  }

  private async receiveMessage(message: unknown): Promise<void> {
    if (!message || typeof message !== 'object') return;
    const data = message as {type?: unknown; text?: unknown; enabled?: unknown; motion?: unknown; eco?: unknown; volume?:unknown;cue?:unknown;preview?:unknown;mode?:unknown;command?:unknown;kind?:unknown};
    if(data.type==='fairyInteraction'&&(data.kind==='touch'||data.kind==='pointer')){
      if(vscode.window.state.focused&&this.view?.visible)this.interactions.fire(data.kind);return;
    }
    if(data.type==='companionCommand'&&typeof data.command==='string'&&['navi.actions','navi.showOfferedProblem','navi.showProblems','navi.fixProblem','navi.openBrain','navi.manageMemories','navi.startListening','navi.stopListening'].includes(data.command)){
      await vscode.commands.executeCommand(data.command);return;
    }
    if (data.type === 'motion' && typeof data.motion === 'string' && motionIds.has(data.motion)) {
      this.motionEmitter.fire({id:data.motion,preview:data.preview===true});
      const cue=soundForMotion(data.motion);
      if(cue && !this.nativeAudio() && vscode.window.state.focused && this.view?.visible) await this.view.webview.postMessage({type:'sound',cue});
    } else if(data.type==='startGame'&&(data.mode==='catch'||data.mode==='chase'||data.mode==='hide')) {
      this.gameEmitter.fire({type:'start',mode:data.mode});
    } else if(data.type==='stopGame') {
      this.gameEmitter.fire({type:'stop'});
    } else if (data.type==='setSound' && typeof data.enabled==='boolean') {
      await vscode.workspace.getConfiguration('navi').update('sound.enabled',data.enabled,vscode.ConfigurationTarget.Global);
      await this.sendSettings();
    } else if (data.type==='setSoundVolume' && typeof data.volume==='number' && Number.isFinite(data.volume)) {
      await vscode.workspace.getConfiguration('navi').update('sound.volume',Math.round(Math.max(0,Math.min(100,data.volume))),vscode.ConfigurationTarget.Global);
      await this.sendSettings();
    } else if (data.type==='previewSound' && isSoundCue(data.cue)) {
      if (vscode.window.state.focused && this.view?.visible && !this.playNativeSound(data.cue)) await this.view.webview.postMessage({type:'sound',cue:data.cue});
    } else if(data.type==='openChat'||data.type==='hideSpeech'){
      await vscode.commands.executeCommand(data.type==='openChat'?'navi.talkToFairy':'navi.hideSpeech');
    } else if (data.type === 'showOverlay' || data.type === 'hideOverlay') {
      await vscode.commands.executeCommand(data.type==='showOverlay'?'navi.showOverlay':'navi.hideOverlay');
    } else if (data.type === 'setPowerMode' && typeof data.eco === 'boolean') {
      await vscode.workspace.getConfiguration('navi').update('fairy.powerMode',data.eco?'eco':'balanced',vscode.ConfigurationTarget.Global);
      await this.sendSettings();
    } else if (data.type === 'ready') {
      await this.sendSettings();
      if (this.view) await this.view.webview.postMessage({type: 'visibility', visible: this.view.visible});
      this.restoreExpression();
      this.companionPosition(this.companionAway);
      this.offerProblem(this.problemOffer,this.problemMessage);
      if(this.presenceFrame)this.presence(this.presenceFrame.values,this.presenceFrame.enabled);
    } else if (data.type === 'setAnimation' && typeof data.enabled === 'boolean') {
      try {
        await vscode.workspace.getConfiguration('navi').update('fairy.animationEnabled', data.enabled, vscode.ConfigurationTarget.Global);
      } catch {
        void vscode.window.showErrorMessage('NAVI konnte die Animationseinstellung nicht speichern.');
      }
      await this.sendSettings();
    }
  }

  private animationEnabled(): boolean {
    return vscode.workspace.getConfiguration('navi').get<boolean>('fairy.animationEnabled', true);
  }

  private respectReducedMotion(): boolean {
    return vscode.workspace.getConfiguration('navi').get<boolean>('fairy.respectReducedMotion', false);
  }

  private powerMode(): string {return vscode.workspace.getConfiguration('navi').get<string>('fairy.powerMode','balanced');}

  private async sendSettings(): Promise<void> {
    const config=vscode.workspace.getConfiguration('navi');
    if (this.view) await this.view.webview.postMessage({type: 'settings', animationEnabled: this.animationEnabled(), respectReducedMotion: this.respectReducedMotion(), powerMode:this.powerMode(),soundEnabled:config.get<boolean>('sound.enabled',false),soundVolume:config.get<number>('sound.volume',30),bubbleEnabled:config.get<boolean>('bubble.enabled',true),windowFocused:vscode.window.state.focused});
  }

  private clearViewSubscriptions(): void {
    while (this.viewSubscriptions.length) this.viewSubscriptions.pop()!.dispose();
  }

  dispose(): void {
    this.clearViewSubscriptions();
    this.configurationSubscription.dispose();
    this.motionEmitter.dispose();
    this.gameEmitter.dispose();
    this.interactions.dispose();
    this.view = undefined;
    this.expression = undefined;
  }
}
