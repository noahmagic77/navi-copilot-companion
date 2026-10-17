# Public release readiness checklist

This document is deliberately conservative. The current repo should remain private until these points are reviewed.

- [ ] Explicitly approve the final open-source license (currently MIT; Apache-2.0 was considered but not selected).
- [ ] Confirm all copyright and trademark rights for branding, logo and visual assets; do not use Zelda/Nintendo source assets.
- [ ] Audit all source files and Git history for credentials, user prompts, corporate identifiers, Copilot transcripts and runtime telemetry.
- [ ] Verify all dependencies and third-party assets have compatible licenses.
- [ ] Verify GitHub Actions on Linux, Windows and macOS; attach CI run results.
- [ ] Test VSIX install, settings and uninstall in a clean real VS Code environment.
- [ ] Test actual supported Copilot agent hook event behavior and OTel metrics on the target VS Code version.
- [ ] Test native SQLite support in the target extension host and JSONL-only fallback.
- [ ] Exercise data export/delete, crash recovery, retention and multiple VS Code windows.
- [ ] Review Webview CSP and content sanitization, telemetry opt-in, external API calls and filesystem permissions.
- [ ] Publish public README, usage screenshots, known limitations, CHANGELOG, SECURITY and CONTRIBUTING policy.
- [ ] Mark the project clearly as an unofficial third-party companion, not a GitHub or Microsoft product.
- [ ] Decide whether a Marketplace release is appropriate; set the real verified publisher ID first.
- [ ] Obtain owner's explicit permission to make the repository public and publish a release.
