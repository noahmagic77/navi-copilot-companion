import {createGreetingSelector} from './motionCatalog';

/** Visits every greeting before repeating; coalesces startup/focus/tab events. */
export class GreetingCycle {
  private lastAt = -Infinity;
  private readonly select: () => string;
  constructor(random: () => number = Math.random) {
    this.select = createGreetingSelector(random);
  }
  next(now: number): string | undefined {
    if (!Number.isFinite(now) || now - this.lastAt < 15_000) return;
    this.lastAt = now;
    return this.select();
  }
}
