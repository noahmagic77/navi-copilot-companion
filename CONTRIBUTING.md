# Contributing to NAVI

NAVI is open source under the [MIT license](LICENSE.md). Issues, bug reports, documentation improvements and pull requests are welcome.

1. Read the [roadmap](docs/roadmap.md) and [status report](docs/STATUS.md) to distinguish implemented features from concepts.
2. Keep changes focused and explain the resulting user behavior.
3. Run `npm ci`, `npm run check` and `npm test` for TypeScript changes. Native Windows changes also require `go -C native/overlay test ./...` on Windows x64.
4. Build an installable extension with `npm run package` when changing packaged behavior. Record any live checks still pending.
5. Preserve third-party notices. Do not submit copied game recordings, proprietary code, credentials, personal settings or chat history.

Contribute only material you have the right to distribute under the project's MIT license. New dependencies retain their own license terms and must be documented when distributed.

The local `private: true` npm flag prevents accidental npm registry publication; it does not make this repository closed source or change the MIT license.
