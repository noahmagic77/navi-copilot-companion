# NAVI architecture (v0.1)

## Boundaries

NAVI is an independent VS Code extension with a supported Chat Participant (`@navi`). It is not a fork or replacement of GitHub Copilot Chat. It uses `request.model` to access the language model selected for the chat request. It does not read GitHub Copilot's private chat storage, internal APIs, authentication tokens or full conversation history.

```text
VS Code Chat -> @navi participant -> VS Code language-model API -> selected provider
                        |
                        v (only when enabled and request finishes)
                LocalHistoryStore
                        |
                        v
      ExtensionContext.globalStorageUri/navi-history.v1.json
          (local VS Code user/profile state only)
```

## Privacy / threat model

- Local-first **persistence**, not offline model inference. When using cloud models, the selected provider processes chat prompts and any later opt-in context provided to that model.
- Storage scope: `globalStorageUri` is allocated for the extension and separated by local user environment and VS Code profile. Do not place history in the workspace or Git repo.
- No central server, shared corporate database, extension analytics, background upload or hidden telemetry.
- No attempt to ingest another participant's messages or private history.
- No implicit file-system/workspace scanning. Future context features must be explicit and tested.
- `navi.history.enabled` and `navi.history.maxEntries` control local retention; `NAVI: Clear Local History` deletes the saved history file.
- Initial format: `schemaVersion: 1`, capped entries; temporary-file + rename write, and serialized mutations. Invalid JSON causes an error rather than silent overwrite.
- Filesystem users with access to the OS profile may be able to read the JSON. This is not encrypted at rest by NAVI. Respect OS account access controls.
- The initial implementation does not include automatic expiration, export, or sensitive-data redaction. These must be developed before any wider deployment.
- Deletion removes NAVI's saved file, but does not erase a provider's prompts, system backups or separate VS Code/Copilot chat history.

## Module ownership

`src/extension.ts`: lifecycle, commands, confirmation UX.

`src/chat/participant.ts`: model invocation and streaming response.

`src/storage/history.ts`: schema, validation, bounded retention. No VS Code dependency.

`src/storage/localHistoryStore.ts`: per-profile persistence using `vscode.workspace.fs`.

## Compatibility

Desktop VS Code >=1.100, Node.js >=22 for development. VS Code remote extension hosts and Web extensions require explicit verification before support is claimed. JSON store chosen intentionally before any native SQLite dependency.

## Future improvements

Per-conversation grouping (the initial document is an exchange log, not a transcript replica), export/import, configurable retention period, privacy audit, tests with mocked VS Code storage, opt-in workspace retrieval and independently licensed logo assets.
