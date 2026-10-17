export type SoundCue = 'greeting' | 'discover' | 'hint' | 'celebrate';
export function isSoundCue(value: unknown): value is SoundCue {
  return typeof value === 'string' && ['greeting','discover','hint','celebrate'].includes(value);
}
export function soundForMotion(id: string): SoundCue | undefined {
  if (id === 'greet' || id.startsWith('greet-')) return 'greeting';
  if (id === 'curious') return 'discover';
  if (id === 'hint' || id === 'celebrate') return id;
  return undefined;
}
