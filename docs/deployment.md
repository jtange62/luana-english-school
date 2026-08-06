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
On a real deployment, it applies pending D1 migrations before publishing the
Worker. Dry runs never modify the database.

## Testing before production

Two ways to try changes without touching the production site or data:

### Local dev server (no Cloudflare resources touched)

```powershell
.\scripts\dev.ps1
```

Runs `wrangler dev` with fully local, emulated D1/R2/Images storage under
`.wrangler/state` (already gitignored). Nothing here ever reaches the real
production database, bucket, or Worker — it's safe to try anything.

### Staging environment (real Cloudflare resources, separate from production)

A second Worker, `luana-english-school-staging`, has its own D1 database
(`luana_parent_portal_staging`) and R2 bucket
(`luana-parent-photos-staging`), defined under `env.staging` in
`wrangler.jsonc`. It runs at:

```text
https://luana-english-school-staging.jtange62.workers.dev
```

Deploy work-in-progress changes there with:

```powershell
.\scripts\deploy-staging.ps1
```

Unlike `deploy-clean.ps1`, this script allows an uncommitted working tree —
staging exists specifically to test changes before they're committed. It still
runs the full test suite, syntax checks, and a dry run first.

Staging secrets (`SESSION_SECRET`, `STAFF_PORTAL_PASSWORD`,
`SUMMER_WEEK_1_CODE`, `SUMMER_WEEK_2_CODE`, `SUMMER_WEEK_3_CODE`) are set
independently of production via:

```powershell
npx wrangler@4.114.0 secret put SUMMER_WEEK_1_CODE --env staging
```

Never reuse production secret values on staging.
