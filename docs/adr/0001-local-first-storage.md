# ADR 0001 — Local-first history without SQLite by default

**Status:** Accepted for MVP (2026-10-16)

## Context

NAVI must behave as an individual desktop VS Code user's companion. The user requested storage comparable in *experience* to Copilot Chat: private, local, user-specific, without central enterprise database or dashboard. Copilot's actual internal history files are not a public extension API.

## Decision

Persist only messages submitted to NAVI and NAVI's generated text, using the extension's `globalStorageUri` and a schema-versioned JSON document. Writes are serialized; data is retained up to a configured maximum. Provide history opt-out and a destructive clear-history command. No remote persistence.

## Rationale

VS Code explicitly supplies extension storage locations. A small, bounded local history does not require a database service, schema migrations, native binaries, or SQLite build/packaging complexity. `workspaceState` would tie history to individual workspaces; the requested semantics are user/profile-scoped.

## Alternatives

- **SQLite:** legitimate and widely used for embedded local software, including many desktop applications, but not required by VS Code nor automatically best for every extension. Revisit for indexed search, large datasets or transactional concurrency.
- **VS Code globalState:** convenient for small settings/state, but structured user-owned history files and explicit deletion are clearer under `globalStorageUri`.
- **Central DB / shared dashboard:** rejected; conflicts with privacy architecture.

## Consequences

The entire bounded JSON document is read/written on changes and is not suitable for massive logs. Existing data remains readable unless a future explicit migration is designed. User prompt contents are sensitive: no sync, no telemetry, no secrets in source control.
