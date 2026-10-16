# NAVI — Copilot Companion

## NAVI direkt herunterladen

**[NAVI Copilot Companion v0.2.0 – VSIX direkt herunterladen](https://raw.githubusercontent.com/noahmagic77/navi-copilot-companion/main/downloads/navi-copilot-companion-0.2.0.vsix)**

Die Datei ist direkt installierbar – **kein ZIP-Entpacken erforderlich**. Öffne in **VS Code Desktop → Erweiterungen → … → Install from VSIX…** und wähle die heruntergeladene `navi-copilot-companion-0.2.0.vsix`.

[Installationsanleitung (Deutsch)](docs/INSTALLATION.md) · [Automatische Build-Ergebnisse](https://github.com/noahmagic77/navi-copilot-companion/actions/workflows/ci.yml?query=branch%3Amain)

Dateigröße: 197.841 Bytes · SHA-256: `e25640ef8d28a81fd579edbebcafd59921d785bd18eabf510637882ec2bd7125`. Dies ist ein **v0.2.0-Entwicklungsstand**, nicht die VS-Code-Marketplace-Version.

TypeScript VS Code companion with an animated fairy guide, an offline deterministic prompt checker and privacy-first analytics.

**Status:** Public GitHub repository with an experimental v0.2.0 preview on `main`; no VS Code Marketplace release.

## Key features

- `@navi`, `/explain`, and `/summarize` using the model chosen by the user in VS Code Chat.
- NAVI Activity Bar view containing a fairy, accessible speech bubble and local prompt checker. The selected NAVI logo is included as a bundled PNG.
- Offline local prompt rules and a conservative *potential* topic-change suggestion. Tips are guidance, not verified token savings.
- Per-profile sanitized `JSONL` session journals, salted workspace grouping and a rebuildable **optional** SQLite index (`node:sqlite` when supported).
- Commands for deleting separate full-text NAVI history or sanitized analytics, export, index rebuilding and explicit local OTel metric-file import.
- Independent deterministic tests and GitHub CI on pull requests.

## Installation über GitHub

**[Installierbare VSIX v0.2.0](https://raw.githubusercontent.com/noahmagic77/navi-copilot-companion/main/downloads/navi-copilot-companion-0.2.0.vsix)** · [Ausführliche Anleitung](docs/INSTALLATION.md)

1. VSIX über den Link herunterladen (keine ZIP-Datei).
2. VS Code Desktop öffnen und **Erweiterungen → … → Install from VSIX…** auswählen.
3. Datei `navi-copilot-companion-0.2.0.vsix` auswählen und VS Code bei Bedarf neu laden.

Die Datei ist im Repository unter `downloads/` versioniert. Bei einer neuen Version muss dieser Download explizit erneuert werden; [GitHub Actions](https://github.com/noahmagic77/navi-copilot-companion/actions/workflows/ci.yml?query=branch%3Amain) stellt weiterhin temporäre Build-Artefakte bereit. Noch kein VS Code Marketplace Release.

## Installation for development

VS Code Desktop >= 1.100, Node.js >= 22 and npm.

```bash
npm install
npm run check
npm test
```

Press F5 to run the Extension Development Host. Open NAVI in the Activity Bar, enter a prompt and select **Prompt analysieren**. You can also run **NAVI: Check Prompt** or address `@navi` in VS Code Chat.

## Privacy and storage

All local NAVI files are stored under `ExtensionContext.globalStorageUri`, separated by user environment/profile. NAVI has **no central backend**. New installations default to `navi.history.enabled=false` and `navi.analytics.enabled=false`; previous legacy chat data is untouched and can be deleted explicitly. Enabling full NAVI own-chat history saves prompt and response contents unencrypted locally, so opt in only if appropriate. Sanitized analytics contain only rule codes, session identifiers and counts, no source code and no full prompts. Exported files are user-controlled. The selected chat model may still send prompts to its provider; NAVI itself makes no extra LLM request for the local checker.

NAVI **does not** access GitHub Copilot's private conversations, intercept its prompt input or record its token usage automatically. Importing a JSONL metric file is an explicit user action, has format constraints, and reimporting the same file creates duplicate metrics; see [Integration limitations](docs/INTEGRATION.md).

## Source tree

- `src/core/` — independent TypeScript analysis rules and OTel metric parser
- `src/storage/sessionJournal.ts` — sanitized JSONL primary store and optional SQLite cache
- `src/ui/naviView.ts`, `media/` — Webview UI and bundled logo
- `src/chat/participant.ts` — existing VS Code Chat Participant, with local analysis callback
- `src/storage/localHistoryStore.ts` — backwards-compatible, opt-in own-chat history
- `docs/` — architecture/ADR and integration notes
- `prototypes/v0.3.0/` — earlier reference-only JavaScript implementation on separate import branch (see PR #1)

## Scope and next milestones

The SQLite backend and official VS Code integration have not yet been validated in a live extension host. Run live E2E tests before claiming support for every OS/remote mode. See [ADR 0002](docs/adr/0002-sanitized-session-storage.md) and [Integration](docs/INTEGRATION.md).

Public GitHub repository for an experimental preview. The repository being public does not imply a VS Code Marketplace publication; consult LICENSE.md for the applicable licensing terms.
