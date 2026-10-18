import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import * as vscode from 'vscode';
import {OverlayProcess,type GameMode,type OverlayPointer} from './overlayProcess';
import {motionIds} from '../core/motionCatalog';
import {isSoundCue,type SoundCue} from '../core/soundPolicy';
import {speechText} from '../core/speechText';
import type {ExpressionFrame} from '../brain/expression';
import type {PresenceValues} from '../brain/presence';
import type {EditorAnchorState} from './editorAnchor';

export class OverlayController implements vscode.Disposable {
  readonly supported = process.platform === 'win32' && process.arch === 'x64';
  private readonly output = vscode.window.createOutputChannel('NAVI Overlay');
  private readonly soundFailures=new vscode.EventEmitter<SoundCue>();
  readonly onSoundFailure=this.soundFailures.event;
  private readonly pointerChanges=new vscode.EventEmitter<OverlayPointer|null>();
  readonly onPointer=this.pointerChanges.event;
  private readonly interactions=new vscode.EventEmitter<'gameStarted'|'gameStopped'|'interaction'|'actions'>();
  readonly onInteraction=this.interactions.event;
  private readonly editorAnchors=new vscode.EventEmitter<EditorAnchorState>();
  readonly onEditorAnchor=this.editorAnchors.event;
  private anchorSequence=0;
  private anchorActive=false;
  private anchorState:EditorAnchorState|undefined;
  get editorAnchorState():EditorAnchorState|undefined{return this.anchorState?{...this.anchorState}:undefined;}
  private presenceFrame:{enabled:boolean;values:PresenceValues}|undefined;
  private gameActive=false;
  private manualUntil=0;
  private automaticTarget=false;
  private readonly bridge = new OverlayProcess(error => this.failure(error), undefined, message => this.output.appendLine(message),cue=>this.soundFailures.fire(cue),()=>this.inviteGame(),point=>this.pointerChanges.fire(point),state=>{
    if(state==='gameStarted')this.gameActive=true;
    else if(state==='gameStopped')this.gameActive=false;
    else this.manualUntil=Date.now()+15000;
    this.interactions.fire(state);
  },state=>{
    if(state.id!==this.anchorSequence||!this.anchorActive)return;
    this.anchorState={...state};if(state.status==='stopped')this.anchorActive=false;
    this.editorAnchors.fire({...state});
  });
  private readonly subscriptions: vscode.Disposable[];
  private queue = Promise.resolve();
  private disposed = false;
  private verified = false;
  private lastMotion = '';
  private lastMotionAt = 0;
  private previewActive=false;
  private expression:{frame:ExpressionFrame;at:number}|undefined;
  constructor(private readonly extensionUri: vscode.Uri) {
    this.subscriptions = [
      vscode.window.onDidChangeWindowState(state => this.bridge.send({type:'focus', focused:state.focused})),
      vscode.workspace.onDidChangeConfiguration(event => {
        if(event.affectsConfiguration('navi.overlay.editorAnchors')&&!vscode.workspace.getConfiguration('navi').get<boolean>('overlay.editorAnchors',true))this.stopEditorAnchor();
        if (['navi.overlay.enabled','navi.fairy.animationEnabled','navi.fairy.powerMode','navi.fairy.respectReducedMotion','navi.sound.enabled','navi.sound.volume','navi.bubble.enabled'].some(key => event.affectsConfiguration(key))) void this.update();
      })
    ];
  }
  update(): Promise<void> {
    this.queue = this.queue.then(async () => {
      if (this.disposed) return;
      const config = vscode.workspace.getConfiguration('navi');
      if (!this.supported || !config.get<boolean>('overlay.enabled', true)) {this.cancelEditorAnchor();this.gameActive=false;this.pointerChanges.fire(null);this.bridge.stop(); return;}
      const executable = vscode.Uri.joinPath(this.extensionUri,'bin','win32-x64','navi-overlay.exe').fsPath;
      if (!this.verified) {
        const [bytes, checksum] = await Promise.all([readFile(executable), readFile(executable+'.sha256','utf8')]);
        if (createHash('sha256').update(bytes).digest('hex') !== checksum.trim().split(/\s/)[0]) throw new Error('NAVI overlay integrity check failed.');
        this.verified = true;
      }
      if (this.disposed || !vscode.workspace.getConfiguration('navi').get<boolean>('overlay.enabled',true)) return;
      await this.bridge.start(executable, process.pid);
      if (this.disposed) {this.bridge.stop(); return;}
      const current = vscode.workspace.getConfiguration('navi');
      this.bridge.send({type:'configure', enabled:current.get<boolean>('fairy.animationEnabled',true), eco:current.get<string>('fairy.powerMode','balanced')==='eco', respectReducedMotion:current.get<boolean>('fairy.respectReducedMotion',false), soundEnabled:current.get<boolean>('sound.enabled',false), soundVolume:current.get<number>('sound.volume',30),bubbleEnabled:current.get<boolean>('bubble.enabled',true)});
      this.bridge.send({type:'focus', focused:vscode.window.state.focused});
      if(this.presenceFrame)this.presence(this.presenceFrame.values,this.presenceFrame.enabled);
      if(this.expression&&this.expression.frame.state!=='idle')this.bridge.send({type:'expression',state:this.expression.frame.state,age:Math.min(86400,this.expression.frame.age+Math.max(0,(Date.now()-this.expression.at)/1000))});
    }).catch(error => this.failure(error instanceof Error ? error : new Error(String(error))));
    return this.queue;
  }
  async show(): Promise<void> {
    if (!this.supported) {
      await vscode.commands.executeCommand('navi.companion.focus');
      void vscode.window.showInformationMessage('Die Vordergrund-Fee ist in dieser Version für Windows x64 verfügbar. Die NAVI-Ansicht kannst du hier weiter nutzen.');
      return;
    }
    await vscode.workspace.getConfiguration('navi').update('overlay.enabled',true,vscode.ConfigurationTarget.Global);
    await this.update();
    this.bridge.send({type:'focus',focused:vscode.window.state.focused});
  }
  async hide(): Promise<void> {
    this.stopEditorAnchor();
    this.gameActive=false;
    this.pointerChanges.fire(null);
    this.bridge.stop();
    await vscode.workspace.getConfiguration('navi').update('overlay.enabled',false,vscode.ConfigurationTarget.Global);
  }
  motion(id: string, preview=false): void {
    if (!motionIds.has(id)) return;
    this.expression=undefined;
    if (this.previewActive && !preview && (id==='greet'||id.startsWith('greet-'))) return;
    this.previewActive=preview;
    if(preview)this.manualUntil=Date.now()+15000;
    if(preview)this.automaticTarget=false;
    const now = Date.now();
    const key=id+':'+preview;
    if (key===this.lastMotion && now-this.lastMotionAt<200) return;
    this.lastMotion=key;this.lastMotionAt=now;
    this.bridge.send({type:'motion', motion:id,preview});
  }
  async flyTo(x: number, y: number): Promise<void> {
    this.cancelEditorAnchor();
    this.automaticTarget=false;
    this.manualUntil=Date.now()+15000;
    if (![x,y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) return;
    if (!this.supported) {
      void vscode.window.showInformationMessage('Gezielter Flug ist für die Vordergrund-Fee unter Windows x64 verfügbar.');
      return;
    }
    const config = vscode.workspace.getConfiguration('navi');
    if (!config.get<boolean>('fairy.animationEnabled',true)) {
      void vscode.window.showInformationMessage('Aktiviere die NAVI-Animation, um die Fee zu einem Ziel fliegen zu lassen.');
      return;
    }
    await this.show();
    this.bridge.send({type:'target', x, y});
  }
  async playGame(): Promise<void> {
    const choice=await vscode.window.showQuickPick([
      {label:'Ich fange NAVI',description:'Klicke NAVI mit der Maus an.',mode:'catch' as const},
      {label:'NAVI fängt die Maus',description:'NAVI versucht den Mauszeiger zu berühren.',mode:'chase' as const},
      {label:'Verstecken',description:'Finde NAVI nach ihrem Versteckflug.',mode:'hide' as const}
    ],{title:'NAVI: Spiel auswählen'});
    if(choice) await this.startGame(choice.mode);
  }
  async startGame(mode:GameMode): Promise<void> {
    this.cancelEditorAnchor();
    this.automaticTarget=false;
    if(!this.supported){void vscode.window.showInformationMessage('NAVI-Spiele sind für das Vordergrund-Overlay unter Windows x64 verfügbar.');return;}
    if(!vscode.workspace.getConfiguration('navi').get<boolean>('fairy.animationEnabled',true)){
      void vscode.window.showInformationMessage('Aktiviere die NAVI-Animation, um ein Spiel zu starten.');return;
    }
    await this.show();
    if(this.bridge.running){this.manualUntil=Date.now()+15000;this.bridge.send({type:'startGame',mode});}
  }
  stopGame():void{this.gameActive=false;this.manualUntil=Date.now()+15000;this.bridge.send({type:'stopGame'});}
  get interacting():boolean{return (this.bridge.running&&this.gameActive)||this.previewActive||Date.now()<this.manualUntil;}
  get playing():boolean{return this.bridge.running&&this.gameActive;}
  get previewing():boolean{return this.previewActive;}
  autoPosition(x:number,y:number):void{if(this.bridge.running){this.automaticTarget=true;this.bridge.send({type:'target',x,y});}}
  cancelAutomaticTarget():void{if(this.automaticTarget)this.cancelTarget();}
  private inviteGame():void{
    if(this.disposed||!vscode.window.state.focused)return;
    void vscode.window.showInformationMessage('NAVI möchte eine Spielrunde anbieten.', 'Spiel auswählen').then(choice=>{
      if(choice==='Spiel auswählen') void this.playGame();
    });
  }
  cancelTarget(): void {this.automaticTarget=false;this.cancelEditorAnchor();this.bridge.send({type:'cancelTarget'});}
  private cancelEditorAnchor():void{
    if(!this.anchorActive)return;
    this.anchorActive=false;
    if(this.anchorState){this.anchorState={...this.anchorState,status:'stopped'};this.editorAnchors.fire({...this.anchorState});}
  }
  stopEditorAnchor():void{if(this.anchorActive){this.cancelEditorAnchor();this.bridge.send({type:'cancelTarget'});}}
  async visitEditorAnchor(token:string):Promise<void>{
    this.cancelTarget();
    const id=++this.anchorSequence;
    this.anchorState={id,status:'unavailable',x:0,y:0,coreX:0,coreY:0};
    if(!this.supported||!/^[0-9a-f]{6}$/.test(token)||!vscode.workspace.getConfiguration('navi').get<boolean>('overlay.editorAnchors',true)||!vscode.workspace.getConfiguration('navi').get<boolean>('fairy.animationEnabled',true)){
      this.editorAnchors.fire({...this.anchorState});return;
    }
    this.anchorActive=true;this.manualUntil=Date.now()+21000;
    await this.show();
    if(this.disposed||id!==this.anchorSequence||!this.anchorActive)return;
    this.anchorState={id,status:'searching',x:0,y:0,coreX:0,coreY:0};this.editorAnchors.fire({...this.anchorState});
    this.bridge.send({type:'editorAnchor',id,token});
  }
  say(message:string):void{this.bridge.send({type:'speech',message:speechText(message)});}
  presence(values:PresenceValues,enabled:boolean):void{
    const wasEnabled=this.presenceFrame?.enabled;
    this.presenceFrame={enabled,values:{...values}};
    if(enabled||wasEnabled!==enabled)this.bridge.send({type:'presence',enabled,...values});
  }
  express(frame:ExpressionFrame):void{
    this.expression={frame:{...frame},at:Date.now()};
    this.previewActive=false;
    this.bridge.send({type:'expression',state:frame.state,age:Math.min(86400,Math.max(0,frame.age))});
  }
  get audioActive(): boolean {return this.supported && this.bridge.running;}
  playSound(cue: string): boolean {
    if (!this.audioActive || !isSoundCue(cue)) return false;
    this.bridge.send({type:'sound',cue});return true;
  }
  private failure(error: Error): void {
    if (this.disposed) return;
    this.cancelEditorAnchor();
    this.gameActive=false;
    this.pointerChanges.fire(null);
    this.output.appendLine(error.message);
    void vscode.window.showErrorMessage('Die NAVI-Vordergrund-Fee konnte nicht gestartet werden. Details stehen unter Ausgabe → NAVI Overlay. Die NAVI-Ansicht bleibt verfügbar.');
  }
  dispose(): void {
    this.editorAnchors.dispose();
    this.interactions.dispose();
    this.soundFailures.dispose();
    this.pointerChanges.fire(null);
    this.pointerChanges.dispose();
    this.disposed=true;
    this.bridge.dispose();
    for (const subscription of this.subscriptions) subscription.dispose();
    this.output.dispose();
  }
}
