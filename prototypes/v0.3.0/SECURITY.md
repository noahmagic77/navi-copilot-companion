# Security and responsible disclosure

**Status:** pre-release prototype; **not audited or approved for production or enterprise use**.

NAVI intentionally avoids storing raw prompts and workspace code in its session journals, but optional external hook and OpenTelemetry integrations can expose sensitive data if misconfigured. Read `docs/security-and-privacy.md` before enabling them.

## Report a vulnerability

Do not disclose credentials, corporate code or exploit details in public GitHub issues. Once this repository is public, use GitHub's **Report a vulnerability** / private vulnerability reporting channel if enabled. Until a private reporting channel is configured, contact the repository owner privately through an existing trusted channel. No security-response SLA is currently offered.

## Supported versions

The prototype has no security-supported release series yet. Keep integrations opt-in and avoid production use until an explicitly supported release is announced.
