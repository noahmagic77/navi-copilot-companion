import {test} from 'node:test';import {strict as assert} from 'node:assert';
import {analyzePrompt,potentialTopicChange} from '../src/core/promptAnalyzer';
import {parseTokenMetrics} from '../src/core/otelParser';
test('no hints on empty prompt',()=>assert.deepEqual(analyzePrompt(''),{hints:[],characterCount:0}));
test('flags vague prompt',()=>assert.ok(analyzePrompt('Mach das besser').hints.some(h=>h.code==='UNCLEAR_GOAL')));
test('does not mandate short prompts',()=>assert.equal(analyzePrompt('x'.repeat(6000)).hints.find(h=>h.code==='OVERSIZED_PROMPT')?.severity,'info'));
test('topic change heuristic conservative',()=>{assert.equal(potentialTopicChange('fix auth login password service','fix auth login session service'),false);assert.equal(potentialTopicChange('implement oauth authentication login token','refactor css layout animation styles'),true);});
test('parses standard token attributes',()=>assert.deepEqual(parseTokenMetrics({attributes:{'gen_ai.usage.input_tokens':100,'gen_ai.usage.output_tokens':30,'gen_ai.response.model':'test-model'}}),{inputTokens:100,outputTokens:30,cachedInputTokens:0,model:'test-model'}));
test('rejects absent usage',()=>assert.equal(parseTokenMetrics({message:'hello'}),undefined));
