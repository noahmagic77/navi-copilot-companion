# ADR 0002 — Sanitized JSONL sessions with optional SQLite index

Status: Accepted for technical prototype, **pending real VS Code Extension Host validation**.

## Context

The existing main branch contains a privacy-first TypeScript Chat Participant and an opt-in legacy full-text history file. NAVI v0.3.0 preserves a separate sanitized event journal and SQLite indexing experiment. We need a controlled integration, not two competing application roots or direct access to Copilot private storage.

## Decision

- Keep the existing `@navi` participant in TypeScript and the legacy history file for explicitly opted-in own-chat history. Default raw chat history to off for fresh installations.
- Add deterministic prompts-only local heuristics and a WebviewViewProvider fairy UI.
- Store *derived non-content signals only*, opt-in, in JSONL scoped by salted workspace key and generated session UUID under `ExtensionContext.globalStorageUri`.
- Treat JSONL as authoritative. Optionally build a SQLite index via the extension-host's `node:sqlite`, with rebuild and JSONL-only fallback.
- Keep all Copilot private-history access and automatic hook registration outside the scope of this change.

## Constraints

`node:sqlite` is not guaranteed in every supported extension host. `DatabaseSync` can block the Node event loop and WAL should not be confused with proof of multiprocess safety. The importer is manual and needs deduplication before general release. Corrupted JSONL lines are skipped during index reconstruction but files are not silently overwritten. Never use NAVI's estimated token savings as a factual metric.

## Alternatives

- Keep only a monolithic JSON file: easiest, but unsuitable for session journaling and recovery at scale.
- Native SQLite library: extra architecture/deployment issues; defer until cross-OS packaging tests.
- Hook directly into GitHub Copilot's internal database: rejected; undocumented and fragile.
- Central SQL server: rejected, violates user-specific local-first requirement.

## Follow-up gates

1. Run official VS Code Desktop integration tests with the actual bundled Node runtime.
2. Establish file retention and multiprocess transaction safety.
3. Evaluate supported Copilot hooks without accessing other participants' private history.
4. Demonstrate actual per-model token usage with real OTel data and verify expected semantic keys.
5. Add VSIX packaging and Windows/macOS/Linux test matrix.
