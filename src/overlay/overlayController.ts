import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import * as vscode from 'vscode';
import {OverlayProcess} from './overlayProcess';

const motionIds = new Set(['greet','hover','drift','curious','figure8','stretch','twirl','listen','think','hint','celebrate','rest']);
export class OverlayController implements vscode.Disposable {
  readonly supported = process.platform === 'win32' && process.arch === 'x64';
  private readonly output = vscode.window.createOutputChannel('NAVI Overlay');
  private readonly bridge = new OverlayProcess(error => this.failure(error));
  private readonly subscriptions: vscode.Disposable[];
  private queue = Promise.resolve();
  private disposed = false;
  private verified = false;
  private lastMotion = '';
  private lastMotionAt = 0;
  constructor(private readonly extensionUri: vscode.Uri) {
    this.subscriptions = [
      vscode.window.onDidChangeWindowState(state => this.bridge.send({type:'focus', focused:state.focused})),
      vscode.workspace.onDidChangeConfiguration(event => {
        if (['navi.overlay.enabled','navi.fairy.animationEnabled','navi.fairy.powerMode'].some(key => event.affectsConfiguration(key))) void this.update();
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
      this.bridge.send({type:'configure', enabled:current.get<boolean>('fairy.animationEnabled',true), eco:current.get<string>('fairy.powerMode','balanced')==='eco'});
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
  motion(id: string): void {
    if (!motionIds.has(id)) return;
    const now = Date.now();
    if (id===this.lastMotion && now-this.lastMotionAt<200) return;
    this.lastMotion=id;this.lastMotionAt=now;
    this.bridge.send({type:'motion', motion:id});
  }
  private failure(error: Error): void {
    if (this.disposed) return;
    this.output.appendLine(error.message);
    void vscode.window.showErrorMessage('Die NAVI-Vordergrund-Fee konnte nicht gestartet werden. Details stehen unter Ausgabe → NAVI Overlay. Die NAVI-Ansicht bleibt verfügbar.');
  }
  dispose(): void {
    this.disposed=true;
    this.bridge.dispose();
    for (const subscription of this.subscriptions) subscription.dispose();
    this.output.dispose();
  }
}
