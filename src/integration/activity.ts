import {speechText} from '../core/speechText';

export type ActivitySource = 'vscode' | 'codex' | 'manual';
export type ActivityState = 'busy' | 'completed' | 'cancelled' | 'error';
export interface ActivityEvent {source: ActivitySource; state: ActivityState | 'message'; message: string}

/** Only the active owner can change the fairy; late results cannot replace another turn. */
export class ActivityController {
  private readonly active = new Map<string, {source: ActivitySource; until: number}>();
  constructor(private readonly emit: (event: ActivityEvent) => void, private readonly now = Date.now) {}

  expire(): void {
    const owner = this.owner();
    for (const [key, value] of this.active) if (value.until <= this.now()) this.active.delete(key);
    if (owner && !this.active.has(owner[0])) this.restore(owner[1].source);
  }

  update(source: ActivitySource, id: string, state: ActivityState, message = ''): boolean {
    this.expire();
    const key = source + ':' + id;
    if (state === 'busy') {
      if (!this.active.has(key) && this.active.size >= 32) throw new Error('Too many active NAVI requests.');
      const wasOwner = this.owner()?.[0] === key;
      this.active.set(key, {source, until: this.now() + 120_000});
      if (this.owner()?.[0] !== key) return false;
      if (!wasOwner) this.emit({source, state, message: ''});
      return true;
    }
    const wasOwner = this.owner()?.[0] === key;
    if (!this.active.delete(key) || !wasOwner) return false;
    if (this.active.size) { this.restore(source); return false; }
    this.emit({source, state, message: speechText(message)});
    return true;
  }

  message(source: ActivitySource, message: string): boolean {
    this.expire();
    if (this.owner()) return false;
    this.emit({source, state: 'message', message: speechText(message)});
    return true;
  }

  private owner() { return this.active.entries().next().value as [string, {source: ActivitySource; until: number}] | undefined; }
  private restore(source: ActivitySource): void {
    const next = this.owner();
    this.emit({source: next?.[1].source ?? source, state: next ? 'busy' : 'cancelled', message: ''});
  }
}
