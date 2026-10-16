/** Optional parser for user-provided sanitized OTel records; no implicit file scanning. */
export interface TokenMetrics { inputTokens: number; outputTokens: number; cachedInputTokens: number; model?: string; }
function nonnegative(v: unknown): number | undefined {
  if(typeof v==='number' && Number.isSafeInteger(v) && v>=0) return v;
  if(typeof v==='string' && /^\d+$/.test(v) && Number.isSafeInteger(Number(v))) return Number(v);
  return undefined;
}
export function parseTokenMetrics(record: unknown): TokenMetrics | undefined {
  if(!record || typeof record!=='object') return;
  const e = record as Record<string, unknown>;
  const attrs = Array.isArray(e.attributes) ? Object.fromEntries((e.attributes as unknown[]).filter(a=>a && typeof a==='object').map(a=>{
    const p=a as Record<string,unknown>;
    const raw=(p.value && typeof p.value==='object') ? (p.value as Record<string,unknown>) : {};
    return [String(p.key??''),raw.intValue??raw.stringValue??p.value];
  })) : (e.attributes && typeof e.attributes==='object' ? e.attributes as Record<string,unknown> : e);
  const input=nonnegative(attrs['gen_ai.usage.input_tokens'] ?? attrs['gen_ai.usage.prompt_tokens'] ?? attrs['input_tokens']);
  const output=nonnegative(attrs['gen_ai.usage.output_tokens'] ?? attrs['gen_ai.usage.completion_tokens'] ?? attrs['output_tokens']);
  if(input===undefined || output===undefined) return;
  const cached=nonnegative(attrs['gen_ai.usage.cache_read.input_tokens'] ?? attrs['cached_input_tokens'])??0;
  const model=attrs['gen_ai.response.model'] ?? attrs['gen_ai.request.model'];
  return {inputTokens:input,outputTokens:output,cachedInputTokens:Math.min(cached,input),...(typeof model==='string'?{model:model.slice(0,100)}:{})};
}
