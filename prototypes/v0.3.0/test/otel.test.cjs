'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { TokenMetricsParser } = require('../src/core/TokenMetricsParser.cjs');

test('counts chat spans only (avoids invoke_agent double-count)', () => {
  const raw = { resourceSpans: [{ scopeSpans: [{ spans: [
    {name:'invoke_agent', attributes:[{key:'gen_ai.usage.input_tokens',value:{intValue:'4000'}}]},
    {name:'chat', attributes:[{key:'gen_ai.operation.name',value:{stringValue:'chat'}},{key:'gen_ai.usage.input_tokens',value:{intValue:'120'}},{key:'gen_ai.usage.output_tokens',value:{intValue:'23'}}]}
  ] }]}] };
  assert.deepEqual(new TokenMetricsParser().parse(raw), { input:120, output:23, cached:0, calls:1 });
});

test('ignores malformed values and tracks optional cached tokens', () => {
  const raw = { spans: [
    { name:'chat', attributes:{'gen_ai.usage.input_tokens':500,'gen_ai.usage.output_tokens':100,'gen_ai.usage.cache_read.input_tokens':50} },
    { name:'chat', attributes:{'gen_ai.usage.input_tokens':-1,'gen_ai.usage.output_tokens':5} }
  ] };
  assert.deepEqual(new TokenMetricsParser().parse(raw), {input:500, output:100, cached:50, calls:1});
});

test('deduplicates on traceId and spanId and returns zero with no data', () => {
  const parser = new TokenMetricsParser();
  const data = { name:'chat', spanId:'id1', traceId:'trace1', attributes:{'gen_ai.usage.input_tokens':5,'gen_ai.usage.output_tokens':3} };
  assert.deepEqual(parser.parse(data), {input:5,output:3,cached:0,calls:1});
  assert.deepEqual(parser.parse(data), {input:0,output:0,cached:0,calls:0});
  assert.deepEqual(parser.parse({ anything:'else' }), {input:0,output:0,cached:0,calls:0});
});
