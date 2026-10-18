import {speechText} from '../core/speechText';

export type ActivitySource = 'vscode' | 'codex' | 'manual';
export type ActivityState = 'received' | 'waiting' | 'busy' | 'completed' | 'cancelled' | 'error';
export type ActivityEvent =
  | {source: ActivitySource; state: ActivityState; message: string; requestId: string}
  | {source: ActivitySource; state: 'message'; message: string; requestId?: never};

/** Only the active owner can change the fairy; late results cannot replace another turn. */
export class ActivityController {
  private readonly active = new Map<string, {source: ActivitySource; requestId: string; state:ActivityState; until: number}>();
  constructor(private readonly emit: (event: ActivityEvent) => void, private readonly now = Date.now) {}

  expire(): void {
    const owner = this.owner();
    for (const [key, value] of this.active) if (value.until <= this.now()) this.active.delete(key);
    if (owner && !this.active.has(owner[0])) this.restore(owner[1]);
  }

  update(source: ActivitySource, id: string, state: ActivityState, message = ''): boolean {
    this.expire();
    const key = source + ':' + id;
    if (state === 'busy'||state==='received'||state==='waiting') {
      if (!this.active.has(key) && this.active.size >= 32) throw new Error('Too many active NAVI requests.');
      const wasOwner = this.owner()?.[0] === key;
      const previousState=this.active.get(key)?.state;
      this.active.set(key, {source, requestId:id, state, until: this.now() + 120_000});
      if (this.owner()?.[0] !== key) return false;
      if (!wasOwner||previousState!==state) this.emit({source, requestId:id, state, message: ''});
      return true;
    }
    const wasOwner = this.owner()?.[0] === key;
    if (!this.active.delete(key) || !wasOwner) return false;
    if (this.active.size) { this.restore({source, requestId:id}); return false; }
    this.emit({source, requestId:id, state, message: speechText(message)});
    return true;
  }

  message(source: ActivitySource, message: string): boolean {
    this.expire();
    if (this.owner()) return false;
    this.emit({source, state: 'message', message: speechText(message)});
    return true;
  }

  private owner() { return this.active.entries().next().value as [string, {source: ActivitySource; requestId: string; state:ActivityState; until: number}] | undefined; }
  private restore(fallback: {source: ActivitySource; requestId: string}): void {
    const next = this.owner();
    const task = next?.[1] ?? fallback;
    this.emit({source:task.source, requestId:task.requestId, state:next?next[1].state:'cancelled', message:''});
  }
}
