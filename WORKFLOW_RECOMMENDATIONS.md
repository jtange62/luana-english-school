# Workflow Recommendations

Use this as the quick reference when changing laptops or making production
changes to the Luana English School site.

## Current Known Good State

- Production URL: `https://luana-english-school.jtange62.workers.dev`
- Staging URL: `https://luana-english-school-staging.jtange62.workers.dev`
  (separate D1 database and R2 bucket — see `docs/deployment.md`)
- Working branch: `agent/parent-portal-checkpoint`
- Latest local checkpoint tag: `checkpoint-before-photo-optimization-2026-07-28`
- Latest deployed Worker version after photo-selection performance work:
  `ec805453-05ca-4cc6-a191-f384dbc266db`
- Latest performance commit: `8b2e09d Improve photo selection responsiveness`

## What Is Working Well

- You checkpoint before risky changes.
- You test before deploying.
- You verify on production after deploying.
- You keep parent photo access behind week-code authentication.
- You optimize uploads before storage, which keeps Cloudflare/R2 usage low.

That is a strong small-site workflow. Keep it.

## Highest-Value Improvements

1. Push the active branch before switching machines.

   ```powershell
   git status
   git push -u origin agent/parent-portal-checkpoint
   ```

2. Keep unrelated local/editor settings out of commits unless intentional.

   Last seen unrelated local file:

   ```text
   .claude/settings.json
   ```

3. On a new laptop, prove the environment before making changes.

   ```powershell
   node --test tests\*.test.mjs
   node --check worker.js
   node --check portal.js
   .\scripts\deploy-clean.ps1 -DryRun
   ```

4. Use the guarded deployment script for production.

   ```powershell
   .\scripts\deploy-clean.ps1
   ```

5. After each deploy, smoke-check production.

   ```powershell
   Invoke-WebRequest -Uri "https://luana-english-school.jtange62.workers.dev/parents.html" -UseBasicParsing
   Invoke-WebRequest -Uri "https://luana-english-school.jtange62.workers.dev/portal.js" -UseBasicParsing
   ```

## Cloudflare Notes

The current setup is comfortable on Cloudflare's free tier while traffic and
storage stay in normal school-site territory. The important production resources
are:

- Worker: `luana-english-school`
- D1 database: `luana_parent_portal`
- R2 bucket: `luana-parent-photos`
- Images binding: `IMAGES`
- Static assets binding: `ASSETS`

Watch these as the portal grows:

- R2 storage size
- R2 object count
- Worker daily requests
- Any photo endpoints that could be abused without authentication

## Good Default Change Loop

```powershell
git status
git add <changed-files>
git commit -m "Checkpoint before <change>"

# Make the change

node --test tests\*.test.mjs
node --check worker.js
node --check portal.js
.\scripts\deploy-clean.ps1 -DryRun

git add <changed-files>
git commit -m "<clear change summary>"
.\scripts\deploy-clean.ps1
```

If the working tree has unrelated local changes, commit only the files that are
part of the change.
