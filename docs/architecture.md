# NAVI architecture (v0.5.1 preview)

## Boundaries

NAVI is an independent VS Code extension with a supported Chat Participant (`@navi`), a Webview companion and an optional native Windows x64 overlay. It is not a fork or replacement of GitHub Copilot Chat. `@navi` uses `request.model` for the current request and streams the response. NAVI cannot read other participants' private messages, chat storage, internal APIs, authentication tokens or full conversation history.

```text
VS Code Chat -> @navi -> selected VS Code model -> streamed reply
                   |                 |
                   |                 +--> optional LocalHistoryStore
                   |                      (NAVI's own full-text history)
                   v
          local prompt analysis -> NAVI Webview -> motion identifiers
                   |                       |
                   v                       v
       sanitized JSONL journal       native Windows overlay
                   |
                   +--> optional rebuildable SQLite index
```

The native child process receives only typed configuration, focus and motion messages over inherited stdin/stdout pipes. The extension verifies the bundled helper's SHA-256 before starting it. Prompt text and source contents are not sent to the overlay.

## Privacy / threat model

- Local-first storage and deterministic prompt analysis do not make model inference offline. The selected VS Code model provider processes `@navi` requests under that provider's terms.
- Storage scope: `globalStorageUri` is allocated for the extension and separated by local user environment and VS Code profile. Do not place history in the workspace or Git repo.
- No NAVI central server, background upload or hidden extension telemetry. The configured model provider is a separate service when a cloud model is selected.
- No attempt to ingest another participant's messages or private history.
- No implicit file-system/workspace scanning. Future context features must be explicit and tested.
- `navi.history.enabled` and `navi.history.maxEntries` control optional local retention of NAVI's own chat; `NAVI: Clear Local History` deletes that history.
- Sanitized analytics are a separate opt-in. JSONL is the primary journal; the optional SQLite index can be rebuilt from it. `NAVI: Clear Sanitized Analytics` does not remove exported copies or OS backups.
- `navi.fairy.animationEnabled` controls movement; `navi.fairy.respectReducedMotion` optionally follows the OS preference and is off by default. Hidden views and inactive/minimized overlay windows pause their animation clocks.
- Filesystem users with access to the OS profile may be able to read the JSON. This is not encrypted at rest by NAVI. Respect OS account access controls.
- Local history is unencrypted. Users should opt in only when appropriate; deleting NAVI data cannot erase provider-side prompts, OS backups or separate VS Code/Copilot history.

## Module ownership

`src/extension.ts`: lifecycle, commands, confirmation UX.

`src/chat/participant.ts`: model invocation and streaming response.

`src/storage/history.ts`: history schema, validation and bounded retention. No VS Code dependency.

`src/storage/localHistoryStore.ts`: opt-in per-profile full-text history.

`src/storage/sessionJournal.ts`: sanitized JSONL events and optional SQLite index.

`src/ui/`: Webview rendering, fairy state and local prompt-check UI.

`src/overlay/` and `native/overlay/`: helper lifecycle, typed IPC, Win32 window tracking and GDI+ rendering.

## Compatibility

Desktop VS Code >=1.100. Development and packaging require Node.js >=22; building the Windows x64 helper also requires Go >=1.24. The bundled native overlay is Windows x64 only. Remote extension hosts and Web extensions require separate live verification before support is claimed.

## Future improvements

NAVI does not yet provide a guided, hint-first programming tutor. A future learning mode should ask what the learner has tried, offer graduated hints before a full solution, let the user request explanation or reveal, and keep the learner in control. It must not silently inspect other chats or workspace files. Support for children and adults should avoid age profiling and document model-provider, privacy and guardian considerations before release.

Other hardening includes live Extension Development Host testing, multi-window journal coordination, migration strategy, dependency/security review and performance measurements on target hardware.
