/** Compile-time design contracts (architecture reference). Runtime v0.2 uses CommonJS JS. */
export type Topic = 'auth' | 'database' | 'testing' | 'ui' | 'devops' | 'performance' | 'documentation' | 'unclassified';
export type RuleId = 'clarify' | 'scope' | 'relevant-files' | 'define-acceptance' | 'structure' | 'fresh-chat';
export type HookKind = 'prompt' | 'start' | 'tool' | 'unknown';
export type Severity = 'info' | 'suggestion' | 'warning';

export interface SanitizedHookEventV1 {
  ts: string;
  kind: HookKind;
  session: string; // Pseudonymous, shortened SHA256, not a raw session identifier
  category?: Topic;
  words?: number;
  flags?: RuleId[];
  toolCategory?: 'search' | 'edit' | 'terminal' | 'other';
}
export interface PromptAnalysis { words: number; category: Topic; flags: RuleId[]; }
export interface Recommendation { id: RuleId; message: string; }
export interface AnalysisEvent {
  at: string;
  source: string;
  advice: Recommendation[];
}
export interface TokenTotals { input: number; output: number; cached: number; calls: number; }
export interface StateSnapshotV1 { version: 1; events: AnalysisEvent[]; }
export interface UIState {
  type: 'state';
  events: AnalysisEvent[];
  hookCount: number;
  toolCount: number;
  tokens: TokenTotals;
  animated: boolean;
  notifications: boolean;
  hookStatus: boolean;
  telemetryStatus: boolean;
}
