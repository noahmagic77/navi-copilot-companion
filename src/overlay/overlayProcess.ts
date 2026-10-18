import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {isSoundCue,type SoundCue} from '../core/soundPolicy';
import type {ExpressionState} from '../brain/expression';
import type {PresenceValues} from '../brain/presence';
import {isEditorAnchorState,type EditorAnchorState} from './editorAnchor';

export type OverlayCommand =
  | ({type:'presence';enabled:boolean}&PresenceValues)
  | {type:'expression';state:ExpressionState;age:number}
  | {type: 'configure'; enabled: boolean; eco: boolean; respectReducedMotion: boolean; soundEnabled?: boolean; soundVolume?: number; bubbleEnabled?:boolean}
  | {type:'speech';message:string}
  | {type: 'sound'; cue: 'greeting' | 'discover' | 'hint' | 'celebrate'}
  | {type: 'focus'; focused: boolean}
  | {type: 'motion'; motion: string; preview?:boolean}
  | {type: 'target'; x: number; y: number}
  | {type:'editorAnchor';id:number;token:string}
  | {type:'startGame';mode:GameMode}
  | {type:'stopGame'}
  | {type: 'cancelTarget'}
  | {type: 'stop'};
export type GameMode = 'catch'|'chase'|'hide';
export interface OverlayPointer {x:number;y:number}
export type SpawnOverlay = (executable: string, args: string[]) => ChildProcessWithoutNullStreams;

/** The child receives only typed control messages over inherited pipes. */
export class OverlayProcess {
  private child: ChildProcessWithoutNullStreams | undefined;
  private starting: Promise<void> | undefined;
  private stopping = new WeakSet<ChildProcessWithoutNullStreams>();
  private ready = false;
  constructor(
    private readonly onFailure: (error: Error) => void,
    private readonly launch: SpawnOverlay = (file, args) => spawn(file, args, {windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], shell: false}),
    private readonly onDiagnostic: (message: string) => void = () => {},
    private readonly onSoundFailure:(cue:SoundCue)=>void=()=>{},
    private readonly onGameInvite:()=>void=()=>{},
    private readonly onPointer:(point:OverlayPointer|null)=>void=()=>{},
    private readonly onInteraction:(state:'gameStarted'|'gameStopped'|'interaction'|'actions')=>void=()=>{},
    private readonly onEditorAnchor:(state:EditorAnchorState)=>void=()=>{}
  ) {}
  get running(): boolean {return !!this.child && this.ready;}

  start(executable: string, ownerPid: number): Promise<void> {
    if (this.starting) return this.starting;
    if (this.running) return Promise.resolve();
    const child = this.launch(executable, ['--host-pid', String(ownerPid)]);
    this.child = child;
    this.ready = false;
    const promise = new Promise<void>((resolve, reject) => {
      let buffer = '', stderr = '', diagnosticBuffer = '', settled = false, startupSucceeded = false;
      const complete = (error?: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error); else resolve();
      };
      const timeout = setTimeout(() => {
        this.stopping.add(child);
        child.kill();
        complete(new Error('NAVI overlay did not become ready within 5 seconds.'));
      }, 5000);
      timeout.unref();
      child.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        if (buffer.length > 8192) {buffer = ''; return;}
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          try {
            const message=JSON.parse(line) as {type?:string;cue?:unknown;x?:unknown;y?:unknown};
            if (message.type === 'ready' && this.child === child) {
              this.ready = true; startupSucceeded = true; complete();
            }
            if(message.type==='soundFailed'&&isSoundCue(message.cue)&&this.child===child&&this.ready&&!this.stopping.has(child)){
              this.onDiagnostic('Native fairy sound could not start; trying visible companion playback.');
              this.onSoundFailure(message.cue);
            }
            if(message.type==='gameInvite'&&this.child===child&&this.ready&&!this.stopping.has(child)) this.onGameInvite();
            if(message.type==='pointer'&&Number.isFinite(message.x)&&Number.isFinite(message.y)&&this.child===child&&this.ready&&!this.stopping.has(child)) this.onPointer({x:message.x as number,y:message.y as number});
            if(message.type==='pointerLost'&&this.child===child&&this.ready&&!this.stopping.has(child)) this.onPointer(null);
            if((message.type==='gameStarted'||message.type==='gameStopped'||message.type==='interaction'||message.type==='actions')&&this.child===child&&this.ready&&!this.stopping.has(child))this.onInteraction(message.type);
            if(message.type==='editorAnchor'&&isEditorAnchorState(message)&&this.child===child&&this.ready&&!this.stopping.has(child)){
              const {id,status,x,y,coreX,coreY}=message;
              this.onEditorAnchor({id,status,x,y,coreX,coreY,...(typeof message.reason==='string'?{reason:message.reason.slice(0,200)}:{})});
            }
          } catch { /* Ignore unrelated or malformed helper output. */ }
        }
      });
      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        stderr = (stderr + text).slice(-2048);
        diagnosticBuffer += text;
        let newline: number;
        while ((newline = diagnosticBuffer.indexOf('\n')) >= 0) {
          const line = diagnosticBuffer.slice(0, newline).trim();
          diagnosticBuffer = diagnosticBuffer.slice(newline + 1);
          if (line) this.onDiagnostic(line);
        }
      });
      child.stdin.on('error', () => { /* A closing child can race with a final control message. */ });
      child.on('error', (error: Error) => {
        if (this.child === child) {this.child = undefined; this.ready = false;}
        complete(error);
      });
      child.on('close', (code: number | null) => {
        if (diagnosticBuffer.trim()) this.onDiagnostic(diagnosticBuffer.trim());
        const intentional = this.stopping.has(child);
        if (this.child === child) {this.child = undefined; this.ready = false;}
        const error = new Error(stderr.trim() || `NAVI overlay exited (${code ?? 'no exit code'}).`);
        if (!settled) complete(intentional ? undefined : error);
        else if (!intentional && startupSucceeded) this.onFailure(error);
      });
    });
    this.starting = promise;
    void promise.finally(() => {if (this.starting === promise) this.starting = undefined;}).catch(() => {});
    return promise;
  }

  send(command: OverlayCommand): void {
    if (!this.child?.stdin.writable || this.stopping.has(this.child)) return;
    this.child.stdin.write(JSON.stringify(command) + '\n');
  }
  stop(): void {
    const child = this.child;
    if (!child) return;
    this.stopping.add(child);
    this.child = undefined; this.ready = false;
    if (child.stdin.writable) child.stdin.end(JSON.stringify({type: 'stop'}) + '\n');
    const fallback = setTimeout(() => child.kill(), 1000);
    fallback.unref();
    child.once('close', () => clearTimeout(fallback));
  }
  dispose(): void {this.stop();}
}
