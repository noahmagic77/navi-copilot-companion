# NAVI integration and limits – local v0.6.0 preview

NAVI is an independent VS Code companion, not a replacement for Copilot Chat. Local prompt analysis and the remaining analytics/metrics subsystem have been removed: no checker, topic scoring, OTel import, session journal or SQLite startup/index. Old user files are not deleted or loaded.

## Available integrations

- `@navi` streams the model selected for its own request through the supported VS Code Chat Participant API. It does not read another participant's private messages.
- The companion Webview and optional Windows-x64 overlay use bundled assets and typed local messages. Shared expressions and lifelike dynamics add no model requests.
- Editor/focus/diagnostic/task/debug events drive bounded reactions. Explicit problem actions open and highlight a current diagnostic; no automatic file modification. [Behavior and limits](LIFELIKE.md).
- Confirmed memories are opt-in and separate from optional own-chat history. No automatic analysis records are generated.
- A bundled MCP adapter accepts deliberately shared Codex messages/status through authenticated per-window local IPC. **Configure Codex Connection** produces a host-specific configuration; it does not connect every chat automatically. Manual text sharing is available. [Setup and live-check limits](AI-CONNECTION.md).
- Voice uses an explicitly registered existing-provider adapter. No compatible real microphone/transcription provider is connected here. Unavailable voice stays disabled with an explanation. [Provider API](ACTIVE-COMPANION.md).

## Data and execution boundaries

Own-chat history is disabled by default and stores only NAVI's own exchanges when enabled. Confirmed memories are disabled by default and use profile/workspace state. Both have explicit deletion controls. Files are not encrypted by NAVI; deleting local data does not erase provider-side copies or OS backups. Legacy analytics files from older installations remain untouched; their old commands and automatic startup processing are removed.

No automatic access to external chat history, hidden model thoughts, camera or desktop screenshots. No extra model installation or telemetry backend. Model execution remains with the configured local, remote/cloud or server provider; companion animation and event processing run in the extension host.

## Verification

Run `npm run check` and `npm test`. `npm run test:companion-host` uses an isolated real VS Code profile and verifies that retired commands/modules are absent, alongside actual editor and diagnostic behavior. Browser and native tests cover drawing and IPC. Focus-dependent checks are reported as skipped when the test window lacks focus. Full model, debugger, microphone and human visual acceptance remain separate.