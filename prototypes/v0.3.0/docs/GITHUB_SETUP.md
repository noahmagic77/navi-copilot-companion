# GitHub setup: NAVI

## Proposed repository

- Name: `navi-copilot-companion`
- Visibility: **Private** for the initial development phase
- Default branch: `main`
- Description: `Local-first VS Code companion for focused and efficient GitHub Copilot workflows.`
- License: existing **MIT**, subject to owner review before any public release
- Do **not** activate auto-publishing or deploy keys by default

## Publish with connected GitHub access

After the GitHub connection is authorized, create a **private** repository, push this repository tree to `main`, and verify the `CI` workflow finishes successfully. Ask for permission before changing repository visibility to public or making a Marketplace release.

## Manual alternative (GitHub CLI on the owner's own computer)

If an authorized GitHub integration is unavailable:

```bash
git init -b main
git add .
git commit -m "Initial NAVI v0.3.0 GitHub-ready prototype"
gh auth login
gh repo create navi-copilot-companion --private --source=. --remote=origin --push
```

Run from the extracted repository folder. `gh auth login` authorizes the owner's GitHub account locally; do **not** paste a Personal Access Token into ChatGPT, issues or shell history.

## After initial push

1. Confirm GitHub reports the repository as **Private**.
2. Check the `Actions` tab for cross-platform test results; local success does not imply the GitHub CI has already passed.
3. Set up repository protections and private vulnerability reporting as appropriate.
4. Verify no runtime `.jsonl`, `.sqlite`, `.env`, tokens or user sessions entered version control.
5. Review dependencies, license, icon/cover artwork, trademark notices and privacy documents **before** making it public.

## Publishing decision

GitHub hosting and public open-source distribution are two separate decisions. This package does not publish to the VS Code Marketplace and does not make the repository public.
