import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { appendEntry, emptyHistory, parseHistory } from '../src/storage/history';

const entry = (id: string) => ({ id, timestamp: '2026-01-01T00:00:00.000Z', prompt: 'question', response: 'answer' });

test('empty history has a versioned schema', () => {
  assert.deepEqual(emptyHistory(), { schemaVersion: 1, entries: [] });
});
test('retention keeps only the latest entries', () => {
  const first = appendEntry(emptyHistory(), entry('1'), 2);
  const second = appendEntry(first, entry('2'), 2);
  const third = appendEntry(second, entry('3'), 2);
  assert.deepEqual(third.entries.map(e => e.id), ['2', '3']);
});
test('invalid schema is rejected without data loss', () => {
  assert.throws(() => parseHistory({ schemaVersion: 2, entries: [] }), /Unsupported/);
});
test('malformed entries are excluded', () => {
  assert.equal(parseHistory({ schemaVersion: 1, entries: [entry('good'), { bad: true }] }).entries.length, 1);
});
