# CLAUDE.md

**Read [CONTEXT.md](CONTEXT.md) before making any change.** It is the canonical technical reference for this repository — stack, architecture, conventions, commands, and constraints. This file is only a pointer; do not duplicate its content here.

Three constraints cause real damage if missed, so they are repeated:

1. **The repo root is the deploy bundle.** `assets.directory` is `"."`, so any new file is publicly served unless listed in `.assetsignore` *and* `.gitignore`.
2. **Never pipe or redirect a native command's stderr in PowerShell** (`2>&1`). PS 5.1 wraps it as `NativeCommandError` and aborts `deploy-clean.ps1` mid-run even on success.
3. **Zero dependencies is deliberate.** No `package.json`, no bundler, no framework, no TypeScript.

Deploy to production only via `.\scripts\deploy-clean.ps1`. Ask before committing.
