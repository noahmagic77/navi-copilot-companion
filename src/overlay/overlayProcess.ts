import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';

export type OverlayCommand =
  | {type: 'configure'; enabled: boolean; eco: boolean}
  | {type: 'focus'; focused: boolean}
  | {type: 'motion'; motion: string}
  | {type: 'stop'};
export type SpawnOverlay = (executable: string, args: string[]) => ChildProcessWithoutNullStreams;

/** The child receives only typed control messages over inherited pipes. */
export class OverlayProcess {
  private child: ChildProcessWithoutNullStreams | undefined;
  private starting: Promise<void> | undefined;
  private stopping = new WeakSet<ChildProcessWithoutNullStreams>();
  private ready = false;
  constructor(
    private readonly onFailure: (error: Error) => void,
    private readonly launch: SpawnOverlay = (file, args) => spawn(file, args, {windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], shell: false})
  ) {}
  get running(): boolean {return !!this.child && this.ready;}

  start(executable: string, ownerPid: number): Promise<void> {
    if (this.starting) return this.starting;
    if (this.running) return Promise.resolve();
    const child = this.launch(executable, ['--host-pid', String(ownerPid)]);
    this.child = child;
    this.ready = false;
    const promise = new Promise<void>((resolve, reject) => {
      let buffer = '', stderr = '', settled = false, startupSucceeded = false;
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
            if ((JSON.parse(line) as {type?: string}).type === 'ready' && this.child === child) {
              this.ready = true; startupSucceeded = true; complete();
            }
          } catch { /* Ignore unrelated or malformed helper output. */ }
        }
      });
      child.stderr.on('data', (chunk: Buffer) => {stderr = (stderr + chunk.toString('utf8')).slice(-2048);});
      child.stdin.on('error', () => { /* A closing child can race with a final control message. */ });
      child.on('error', (error: Error) => {
        if (this.child === child) {this.child = undefined; this.ready = false;}
        complete(error);
      });
      child.on('close', (code: number | null) => {
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
