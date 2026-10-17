# NAVI integration and limits – v0.5.0 preview

This document describes the current public experimental preview. NAVI is an independent VS Code extension, not a fork or replacement for Copilot Chat. It deliberately does not inspect private Copilot conversations or rely on undocumented APIs.

## Implemented

- Side-panel fairy UI using `WebviewViewProvider`; CSP limits script loading to bundled assets and there are no external requests.
- Optional Windows x64 foreground overlay, controlled through typed local pipes and bundled with the extension. The local v0.5.2 preview also sends short excerpts of NAVI's own completed replies to its speech bubble (up to 160 Unicode characters, fenced code blocks replaced). No raw prompt, file read or access to another participant's chat is introduced. See [Speech bubbles](SPEECH.md).
- Pure local prompt checker with nonauthoritative guidance, conservative topic-change heuristic and no implicit model calls.
- Sanitized JSONL journal in `globalStorageUri/sessions/<salted-workspace-key>/<session-id>.jsonl`, storing only rule codes and selected token counts.
- Optional `node:sqlite` database index, rebuildable from JSONL. Fallback to JSONL-only when SQLite unavailable.
- Explicit commands to check a prompt, export analytics, clear analytics, rebuild the index, and import a **selected** local JSONL metric file.
- `@navi` uses the model selected for that request in VS Code Chat and streams its response. NAVI's local checker observes only requests sent to `@navi`; it cannot read another participant's private chat.
- Raw `@navi` prompt/answer history is now **disabled for new users by default**; if the existing user already enabled it, the setting remains effective. It is independent of sanitized analytics (also opt-in).
- `navi.fairy.respectReducedMotion` optionally controls whether both fairy renderers respect the operating system's reduced-motion preference; default is `false`.

## Unsupported, by design

- No automatic detection or forwarding of arbitrary Copilot Chat prompts: no stable general-purpose access to another participant's private messages. Users must address `@navi` or explicitly submit text to NAVI.
- No active GitHub Copilot hooks configured or modified.
- No automatic telemetry capture, scanning of workspace files, or Copilot token savings calculation.
- Offline local analysis does not mean Copilot's selected cloud model runs offline.

## Storage constraints and next hardening tasks

- SQLite `node:sqlite` is runtime-conditional, and `DatabaseSync` uses synchronous operations. Check VS Code extension-host compatibility under real installed VS Code; consider async storage adapter later.
- Concurrent VS Code windows use one SQLite database; its WAL and busy timeout help with reader concurrency, but JSONL single-writer coordination across processes is **not** fully hardened. Do not claim multi-process production readiness.
- Manual OTel importer accepts simple JSONL span objects with `gen_ai.usage.*` metrics; exporter formats vary and repeated imports can create duplicate metrics. Add import fingerprints before beta.
- `clear analytics` deletes the journal and SQLite index rows; local backups and previously exported files are not touched. `clear history` is a separate explicit command.
- Content is unencrypted on disk; OS permissions protect the local profile. Logs and SQLite WAL/SHM files must remain outside the git repository.
- `workspaceSalt` stays local, and hashed keys cannot be interpreted without the salt. Original workspace URIs are not persisted.

## How to verify

1. `npm ci`, `npm run check`, `npm test`.
2. Press F5 in VS Code Desktop and open NAVI from the Activity Bar.
3. Run **NAVI: Check Prompt**; verify a tip and the animated fairy. Verify CSP and both states of `navi.fairy.respectReducedMotion`.
4. Send `@navi Explain this code` in VS Code Chat. NAVI only inspects its **own** chat requests.
5. Enable `navi.analytics.enabled` explicitly and inspect `NAVI: Open Local Data Folder`; inspect sanitized JSONL.
6. Run `NAVI: Rebuild Analytics Index` and `NAVI: Export Sanitized Analytics`.
7. Test `NAVI: Delete Sanitized Analytics`, `NAVI: Clear Local History` separately.

The repository is public, but the extension remains an experimental preview and is not published in the VS Code Marketplace. A public repository does not imply Marketplace approval or a change to the repository license.
