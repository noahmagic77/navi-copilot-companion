export interface HistoryEntry {
  id: string;
  timestamp: string;
  command?: string;
  prompt: string;
  response: string;
}
export interface HistoryDocument {
  schemaVersion: 1;
  entries: HistoryEntry[];
}
export function emptyHistory(): HistoryDocument {
  return { schemaVersion: 1, entries: [] };
}
export function appendEntry(history: HistoryDocument, entry: HistoryEntry, maxEntries: number): HistoryDocument {
  const limit = Number.isFinite(maxEntries) ? Math.max(1, Math.trunc(maxEntries)) : 200;
  return { schemaVersion: 1, entries: [...history.entries, entry].slice(-limit) };
}
export function parseHistory(value: unknown): HistoryDocument {
  if (!value || typeof value !== 'object') { return emptyHistory(); }
  const candidate = value as Partial<HistoryDocument>;
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.entries)) {
    throw new Error('Unsupported NAVI history format. Original file has not been modified.');
  }
  const entries = candidate.entries.filter((entry): entry is HistoryEntry =>
    !!entry && typeof entry.id === 'string' && typeof entry.timestamp === 'string' &&
    typeof entry.prompt === 'string' && typeof entry.response === 'string' &&
    (entry.command === undefined || typeof entry.command === 'string')
  );
  return { schemaVersion: 1, entries };
}
