# NAVI roadmap

## Phase 0 — foundation (this commit)
- Private repository; TypeScript manifest; VS Code `@navi` participant.
- Per-user/per-profile local history and deletion command.
- Basic tests, GitHub CI, architecture decision record.

## Phase 1 — usable prototype
- Visual history browser with search, deletion by conversation and export.
- Reliable conversation association and model error handling.
- Mocked VS Code integration tests; dependency audit; check packaging in a real extension host.
- Add the approved original NAVI logo as a correctly sized icon.

## Phase 2 — context and UX
- Workspace context by explicit user action, minimum necessary file access.
- Progressive summaries and user-controllable context windows.
- Transparency about model/provider calls and sensitive data.

## Phase 3 — hardening
- Measured performance and schema migration strategy; consider SQLite if justified.
- Accessibility, error reporting without telemetry, security review.
- Private VSIX test release; publish publicly only after separate approval.

These are proposed milestones, not committed dates.
