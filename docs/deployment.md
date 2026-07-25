# Safe deployment

GitHub Actions validates every pull request and every push to `main`.

The validation job runs:

- portal authorization tests
- public navigation and sitemap checks
- JavaScript syntax checks
- a Cloudflare deployment dry run

Production deployments should use the guarded PowerShell script:

```powershell
.\scripts\deploy-clean.ps1
```

To validate without publishing:

```powershell
.\scripts\deploy-clean.ps1 -DryRun
```

The script refuses to deploy when the Git working tree contains uncommitted
changes. This prevents unrelated local edits from being uploaded accidentally.
