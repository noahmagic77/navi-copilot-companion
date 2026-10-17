import test from 'node:test';
import assert from 'node:assert/strict';
import {speechText} from '../src/core/speechText';

test('bubble excerpts are bounded Unicode plain text with controls and code blocks removed',()=>{
  assert.equal(speechText('Hallo\u0000\n  Welt'),'Hallo Welt');
  const text=speechText('🧚'.repeat(200));assert.equal(Array.from(text).length,160);assert(text.endsWith('…'));
  assert.equal(speechText('Erklärung ```ts\nsecret();\n``` Ende'),'Erklärung [Code im Chat] Ende');
  assert.equal(speechText('   '),'');assert.equal(speechText('<b>Text</b>'),'<b>Text</b>');
});
