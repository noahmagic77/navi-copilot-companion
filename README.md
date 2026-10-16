# NAVI — Copilot Companion

> Private, local-first Visual Studio Code extension prototype for the VS Code / GitHub Copilot Chat experience.

**Status:** Early development (v0.1.0). This repository is private; NAVI is not published in the VS Code Marketplace.

## What NAVI does today

- Exposes an `@navi` participant in VS Code Chat, including `/explain` and `/summarize`.
- Uses the language model selected by the user in VS Code Chat; no separate model credentials.
- Optionally retains **only NAVI's own** prompt/response exchanges in local VS Code extension storage.
- Adds commands to open the local data directory, clear NAVI history, and show the extension status.
- Provides a typed TypeScript starter, unit tests, GitHub Actions CI and architectural documentation.

**Important boundary:** NAVI cannot automatically access, extract or replay GitHub Copilot Chat's private history. The public Chat Participant API does not provide access to other participants' private conversations. No undocumented database scraping, chat interception or telemetry is implemented.

## Getting started

Requirements: VS Code Desktop >= 1.100, Node.js 22+, npm, and access to a language model in VS Code Chat (for example, via GitHub Copilot).

```bash
git clone https://github.com/noahmagic77/navi-copilot-companion.git
cd navi-copilot-companion
npm install
npm run compile
npm test
```

Open the project in VS Code and press **F5** to start an **Extension Development Host**. In the new window, open Chat and type `@navi Explain the purpose of this project` or `@navi /summarize Describe a release checklist`.

Commands (Command Palette):
- `NAVI: Show Status`
- `NAVI: Open Local Data Folder`
- `NAVI: Clear Local History`

## Local-first privacy

`navi.history.enabled` (default: **true**) controls whether NAVI stores its *own* interactions locally. Disable it to stop new exchanges being saved. `navi.history.maxEntries` (default: 200) caps locally retained exchanges. Deletion is available from the Command Palette.

History lives under VS Code's per-user/per-profile `ExtensionContext.globalStorageUri`, not in this Git repository or a corporate database. There is no account sync, centralized dashboard or extension telemetry. Invoking `@navi` sends your request through VS Code's selected language-model provider in order to generate an answer; **local storage does not mean local model inference**. Avoid sharing secrets in prompts.

The initial history format is a small, versioned JSON document, written with a temporary file and rename. SQLite is a possible future backend if query volume justifies it; see [Architecture](docs/architecture.md) and [ADR 0001](docs/adr/0001-local-first-storage.md).

## Repository guide

| Path | Purpose |
| --- | --- |
| `src/extension.ts` | VS Code commands and Chat participant |
| `src/chat/` | Model request orchestration |
| `src/storage/` | Local storage boundary and retention policy |
| `test/` | Node.js unit tests |
| `docs/` | Architecture, decisions and roadmap |
| `.github/workflows/ci.yml` | Private CI; no publication |

## Scope and next milestones

1. Ship this minimal, testable extension foundation.
2. Add a user-controlled NAVI history browser, export and retention controls.
3. Implement safe, opt-in workspace context features with tests.
4. Evaluate SQLite only if search/performance requirements require it.
5. Add the selected original NAVI-inspired PNG logo after the approved image file is available; no third-party artwork is committed.

This project is **not open source** at this stage. No redistribution license is granted. Never commit local chat records, tokens or generated `.vsix` files.

See [Development roadmap](docs/roadmap.md) for planned work.
