# Contributing to NAVI

NAVI is currently a **development prototype**. The public contribution process will open after the initial GitHub privacy, licensing and integration review. For now, contributions can be reviewed by the repository owner.

## Local setup

Requires Node.js 22+ for development tests and Python 3 for the dependency-free VSIX builder. The extension itself does not require `npm install`.

```bash
npm run check
npm run vsix
```

Do not enable Copilot hooks or telemetry without explicit opt-in in a trusted workspace. To exercise UI logic, use the built-in demo and the static prompt checker.

## Pull requests

Create a focused branch, add or adjust tests, and describe any observable privacy changes. Preserve the local-first design, do not introduce remote analytics by default, and avoid accessing undocumented Copilot internals. Use no real prompts, source code, account identifiers, production tokens or enterprise data in tests, screenshots or logs.

For a behavioral change, include a reproducible test. For storage changes, document journal/index migration, recovery and crash handling. For UI changes, test reduced motion and accessibility.

## License

The current repository uses the existing MIT license. Review third-party assets, trademarks and license choice before public release.
