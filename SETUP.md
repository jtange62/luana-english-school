# Setup

This guide gets a new Windows laptop ready to work on and deploy the Luana
English School Cloudflare Worker site.

## 1. Install Tools

Install these first:

- Git
- Node.js LTS
- PowerShell
- A browser for Cloudflare login

Confirm they are available:

```powershell
git --version
node --version
npm --version
```

## 2. Clone The Repo

```powershell
git clone <repo-url>
cd luana-english-school
git switch agent/parent-portal-checkpoint
```

If the branch is not available yet, push it from the old laptop first:

```powershell
git push -u origin agent/parent-portal-checkpoint
```

## 3. Confirm Project Shape

This project is a Cloudflare Worker with static assets. The key files are:

- `worker.js` - Worker API, auth, photo storage, and image handling
- `portal.js` - parent/staff portal browser behavior
- `portal.css` - portal styling
- `wrangler.jsonc` - Cloudflare bindings and Worker config
- `migrations/` - D1 database migrations
- `tests/` - Node tests

Related docs:

- `docs/deployment.md`
- `docs/parent-portal-setup.md`
- `WORKFLOW_RECOMMENDATIONS.md`

## 4. Install Or Use Wrangler

The deployment script uses a pinned Wrangler version through `npx`, so a local
project install is not required for normal deployment.

You can still confirm Wrangler works:

```powershell
npx --yes wrangler@4.114.0 --version
```

Then log in to Cloudflare:

```powershell
npx --yes wrangler@4.114.0 login
npx --yes wrangler@4.114.0 whoami
```

## 5. Verify Cloudflare Resources

`wrangler.jsonc` should already point at production resources:

- Worker: `luana-english-school`
- D1 database: `luana_parent_portal`
- R2 bucket: `luana-parent-photos`
- Images binding: `IMAGES`
- Assets binding: `ASSETS`

Check configured secrets without printing their values:

```powershell
npx --yes wrangler@4.114.0 secret list
```

Required secrets:

- `SESSION_SECRET`
- `STAFF_PORTAL_PASSWORD`
- `SUMMER_WEEK_1_CODE`
- `SUMMER_WEEK_2_CODE`
- `SUMMER_WEEK_3_CODE`

If a secret is missing, set it interactively:

```powershell
npx --yes wrangler@4.114.0 secret put SESSION_SECRET
npx --yes wrangler@4.114.0 secret put STAFF_PORTAL_PASSWORD
npx --yes wrangler@4.114.0 secret put SUMMER_WEEK_1_CODE
npx --yes wrangler@4.114.0 secret put SUMMER_WEEK_2_CODE
npx --yes wrangler@4.114.0 secret put SUMMER_WEEK_3_CODE
```

Do not paste secret values into committed files.

## 6. Run Local Checks

```powershell
node --test tests\*.test.mjs
node --check worker.js
node --check portal.js
git diff --check
```

## 7. Validate Deployment

Before publishing:

```powershell
.\scripts\deploy-clean.ps1 -DryRun
```

The script refuses to deploy if the working tree has uncommitted changes. This
is intentional.

## 8. Deploy

When tests and dry-run pass:

```powershell
.\scripts\deploy-clean.ps1
```

Production URL:

```text
https://luana-english-school.jtange62.workers.dev
```

## 9. Smoke Check Production

```powershell
Invoke-WebRequest -Uri "https://luana-english-school.jtange62.workers.dev/" -UseBasicParsing
Invoke-WebRequest -Uri "https://luana-english-school.jtange62.workers.dev/parents.html" -UseBasicParsing
Invoke-WebRequest -Uri "https://luana-english-school.jtange62.workers.dev/api/photos/not-real?share=1" -UseBasicParsing -SkipHttpErrorCheck
```

Expected:

- Public pages return `200`
- Signed-out private photo access returns `401`

## 10. Normal Change Loop

```powershell
git status

# edit files

node --test tests\*.test.mjs
node --check worker.js
node --check portal.js
.\scripts\deploy-clean.ps1 -DryRun

git add <changed-files>
git commit -m "<clear change summary>"
.\scripts\deploy-clean.ps1
```

Keep unrelated machine/editor settings out of commits unless you intentionally
want them shared.
