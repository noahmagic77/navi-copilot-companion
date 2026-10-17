import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import * as vscode from 'vscode';
import {OverlayProcess} from './overlayProcess';
import {motionIds} from '../core/motionCatalog';
import {isSoundCue,type SoundCue} from '../core/soundPolicy';
import {speechText} from '../core/speechText';

export class OverlayController implements vscode.Disposable {
  readonly supported = process.platform === 'win32' && process.arch === 'x64';
  private readonly output = vscode.window.createOutputChannel('NAVI Overlay');
  private readonly soundFailures=new vscode.EventEmitter<SoundCue>();
  readonly onSoundFailure=this.soundFailures.event;
  private readonly bridge = new OverlayProcess(error => this.failure(error), undefined, message => this.output.appendLine(message),cue=>this.soundFailures.fire(cue));
  private readonly subscriptions: vscode.Disposable[];
  private queue = Promise.resolve();
  private disposed = false;
  private verified = false;
  private lastMotion = '';
  private lastMotionAt = 0;
  private previewActive=false;
  constructor(private readonly extensionUri: vscode.Uri) {
    this.subscriptions = [
      vscode.window.onDidChangeWindowState(state => this.bridge.send({type:'focus', focused:state.focused})),
      vscode.workspace.onDidChangeConfiguration(event => {
        if (['navi.overlay.enabled','navi.fairy.animationEnabled','navi.fairy.powerMode','navi.fairy.respectReducedMotion','navi.sound.enabled','navi.sound.volume','navi.bubble.enabled'].some(key => event.affectsConfiguration(key))) void this.update();
      })
    ];
  }
  update(): Promise<void> {
    this.queue = this.queue.then(async () => {
      if (this.disposed) return;
      const config = vscode.workspace.getConfiguration('navi');
      if (!this.supported || !config.get<boolean>('overlay.enabled', true)) {this.bridge.stop(); return;}
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
    this.bridge.stop();
    await vscode.workspace.getConfiguration('navi').update('overlay.enabled',false,vscode.ConfigurationTarget.Global);
  }
  motion(id: string, preview=false): void {
    if (!motionIds.has(id)) return;
    if (this.previewActive && !preview && (id==='greet'||id.startsWith('greet-'))) return;
    this.previewActive=preview;
    const now = Date.now();
    const key=id+':'+preview;
    if (key===this.lastMotion && now-this.lastMotionAt<200) return;
    this.lastMotion=key;this.lastMotionAt=now;
    this.bridge.send({type:'motion', motion:id,preview});
  }
  async flyTo(x: number, y: number): Promise<void> {
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
  cancelTarget(): void {this.bridge.send({type:'cancelTarget'});}
  say(message:string):void{this.bridge.send({type:'speech',message:speechText(message)});}
  get audioActive(): boolean {return this.supported && this.bridge.running;}
  playSound(cue: string): boolean {
    if (!this.audioActive || !isSoundCue(cue)) return false;
    this.bridge.send({type:'sound',cue});return true;
  }
  private failure(error: Error): void {
    if (this.disposed) return;
    this.output.appendLine(error.message);
    void vscode.window.showErrorMessage('Die NAVI-Vordergrund-Fee konnte nicht gestartet werden. Details stehen unter Ausgabe → NAVI Overlay. Die NAVI-Ansicht bleibt verfügbar.');
  }
  dispose(): void {
    this.soundFailures.dispose();
    this.disposed=true;
    this.bridge.dispose();
    for (const subscription of this.subscriptions) subscription.dispose();
    this.output.dispose();
  }
}
