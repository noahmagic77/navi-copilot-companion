# NAVI architecture (local v0.6.0 preview)

## Boundaries

NAVI is an independent VS Code extension with a supported Chat Participant (`@navi`), a Webview companion and an optional native Windows x64 overlay. It is not a fork or replacement of GitHub Copilot Chat. `@navi` uses `request.model` for the current request and streams the response. NAVI cannot read other participants' private messages, chat storage, internal APIs, authentication tokens or full conversation history.

```text
VS Code Chat -> @navi -> selected model -> streamed reply
                  |                           |
                  +-> ActivityController      +-> optional own-chat history
                            |
Editor/focus/pointer -> Brain -> decisions/expressions -> Webview + Windows fairy
                            |
                            +-> sanitized live inspector (no prompt scoring)

Local analysis, metric import, journals and SQLite indexing: removed
```

The native child process receives typed configuration, focus, motion, target, sound and bounded speech messages over inherited stdin/stdout pipes. The extension verifies the bundled helper's SHA-256 before starting it. In the local v0.5.2 preview, speech messages can contain up to 160 Unicode characters from NAVI's own completed chat replies, with fenced code blocks replaced by a placeholder. The helper does not read raw prompts, workspace files or other chats. Bubble text is transient, displayed locally and not added to analytics or a separate log.

## Privacy / threat model

- Local companion decisions and storage do not make model inference offline. The selected VS Code model provider processes `@navi` requests under that provider's terms.
- Storage scope: `globalStorageUri` is allocated for the extension and separated by local user environment and VS Code profile. Do not place history in the workspace or Git repo.
- No NAVI central server, background upload or hidden extension telemetry. The configured model provider is a separate service when a cloud model is selected.
- No attempt to ingest another participant's messages or private history.
- No implicit file-system/workspace scanning. Future context features must be explicit and tested.
- `navi.history.enabled` and `navi.history.maxEntries` control optional local retention of NAVI's own chat; `NAVI: Clear Local History` deletes that history.
- Local analytics and metric imports are removed. Existing legacy files are left untouched and no longer loaded.
- `navi.fairy.animationEnabled` controls movement; `navi.fairy.respectReducedMotion` optionally follows the OS preference and is off by default. Hidden views and inactive/minimized overlay windows pause their animation clocks.
- Filesystem users with access to the OS profile may be able to read the JSON. This is not encrypted at rest by NAVI. Respect OS account access controls.
- Local history is unencrypted. Users should opt in only when appropriate; deleting NAVI data cannot erase provider-side prompts, OS backups or separate VS Code/Copilot history.

## Module ownership

`src/extension.ts`: lifecycle, commands, confirmation UX.

`src/chat/participant.ts`: model invocation and streaming response.

`src/storage/history.ts`: history schema, validation and bounded retention. No VS Code dependency.

`src/storage/localHistoryStore.ts`: opt-in per-profile full-text history.

`src/brain/` and `src/companion/`: bounded perception, decisions, lifelike dynamics and confirmed memories. No analytics journal or SQLite index.

`src/ui/`: companion rendering, fairy state and live brain inspection. Prompt analysis and its UI have been removed.

`src/overlay/` and `native/overlay/`: helper lifecycle, typed IPC, Win32 window tracking and GDI+ rendering.

## Compatibility

Desktop VS Code >=1.100. Development and packaging require Node.js >=22; building the Windows x64 helper also requires Go >=1.24. The bundled native overlay is Windows x64 only. Remote extension hosts and Web extensions require separate live verification before support is claimed.

## Future improvements

NAVI does not yet provide a guided, hint-first programming tutor. A future learning mode should ask what the learner has tried, offer graduated hints before a full solution, let the user request explanation or reveal, and keep the learner in control. It must not silently inspect other chats or workspace files. Support for children and adults should avoid age profiling and document model-provider, privacy and guardian considerations before release.

Other hardening includes live Extension Development Host testing, multi-window journal coordination, migration strategy, dependency/security review and performance measurements on target hardware.

## Existing-model activity and explicit Codex handoff (local v0.5.3)

An ActivityController arbitrates per-request leases across NAVI's own VS Code turns, explicitly shared Codex tool calls and manual messages. runModelTurn preserves selected-model streaming and distinguishes successful completion from cancellation/error. A bundled MCP stdio process forwards bounded requests through an authenticated per-window named pipe (Unix socket outside Windows); it does not open a TCP port or call another model. A transient connection descriptor is created only by the setup command and removed on normal shutdown. Shared Codex/manual text can reach the native speech helper through the same 160-character sanitizer as NAVI replies. No workspace scanning or private-chat ingestion occurs. See [AI connection](AI-CONNECTION.md).
