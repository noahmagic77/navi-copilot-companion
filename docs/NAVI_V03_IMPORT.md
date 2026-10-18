# NAVI v0.3.0 prototype import

The current `main` branch contains a separate TypeScript VS Code Chat Participant starter. The earlier NAVI 0.3.0 implementation (CommonJS, optional agent hooks, OTel, JSONL session journals and SQLite index) is preserved in [`prototypes/v0.3.0/`](../prototypes/v0.3.0/).

This is a **reference prototype**, not an upgrade to the main extension. It is not automatically executed or packaged by the existing root project, and its legacy CI workflow under `prototypes/` does not run automatically. Run its tests from that directory with `npm run check`. The main product architecture, privacy, and integration need reconciliation before combining the codebases.

No GitHub Marketplace/VS Code Marketplace publication has been performed. Repository stays private.
