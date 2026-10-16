'use strict';
/** Parses common OTLP JSON and span-per-line formats; never stores raw traces. */
function attrs(input) {
  if (!Array.isArray(input) && !(input && typeof input === 'object')) return {};
  if (!Array.isArray(input)) return { ...input };
  const out = {};
  for (const x of input) {
    if (!x || typeof x.key !== 'string') continue;
    const v = x.value;
    out[x.key] = v && typeof v === 'object' ? (v.intValue ?? v.doubleValue ?? v.stringValue ?? v.boolValue) : v;
  }
  return out;
}
function collectSpans(obj) {
  const found = []; const seen = new Set();
  function visit(value, depth) {
    if (!value || typeof value !== 'object' || depth > 9 || found.length > 10000) return;
    if (seen.has(value)) return; seen.add(value);
    if (Array.isArray(value)) { for (const v of value) visit(v, depth + 1); return; }
    if (typeof value.name === 'string' && value.attributes) found.push(value);
    for (const key of ['resourceSpans', 'scopeSpans', 'spans', 'data', 'resource_spans', 'scope_spans']) if (value[key]) visit(value[key], depth + 1);
  }
  visit(obj, 0); return found;
}
const asCount = (raw) => {
  const n = Number(raw ?? 0);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
};
class TokenMetricsParser {
  constructor(maxIds = 15000) { this.seen = new Set(); this.maxIds = maxIds; }
  parse(data) {
    const totals = { input: 0, output: 0, cached: 0, calls: 0 };
    for (const span of collectSpans(data)) {
      const a = attrs(span.attributes);
      if (a['gen_ai.operation.name'] !== 'chat' && span.name !== 'chat') continue;
      const input = asCount(a['gen_ai.usage.input_tokens']);
      const output = asCount(a['gen_ai.usage.output_tokens']);
      if (input === null || output === null || input + output === 0) continue;
      const id = String(span.spanId || span.span_id || '');
      const trace = String(span.traceId || span.trace_id || '');
      const key = id && trace ? `${trace}:${id}` : '';
      if (key && this.seen.has(key)) continue;
      if (key) {
        this.seen.add(key);
        if (this.seen.size > this.maxIds) this.seen.delete(this.seen.values().next().value);
      }
      totals.input += input; totals.output += output;
      totals.cached += asCount(a['gen_ai.usage.cache_read.input_tokens']) ?? 0;
      totals.calls += 1;
    }
    return totals;
  }
  reset() { this.seen.clear(); }
}
module.exports = { TokenMetricsParser, attrs, collectSpans };
