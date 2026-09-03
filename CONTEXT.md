# CONTEXT.md

Master technical reference for AI assistants working in this repository.

## System Overview & Core Purpose

Japanese-language marketing site for Luana English School, a children's English school in Fuchu, Tokyo, covering its preschool, kinder, afterschool, and summer programs. It also hosts a credential-gated parent/staff portal where staff upload class photos and parents view only the albums their access codes unlock.

## Tech Stack & Tooling

- **Runtime:** Cloudflare Workers (`compatibility_date` 2026-07-08, `nodejs_compat` flag). Node.js 24 for tests and tooling.
- **Dependencies: none.** There is no `package.json`, no `node_modules`, no bundler, no framework, no TypeScript. All JS is hand-written vanilla ES.
- **CLI:** Wrangler, always pinned — `npx --yes wrangler@4.114.0`.
- **Storage:** D1 `luana_parent_portal` (binding `DB`), R2 `luana-parent-photos` (binding `PHOTOS`), Cloudflare Images (binding `IMAGES`), static assets (binding `ASSETS`).
- **Email:** Resend HTTP API via `RESEND_API_KEY` + `LOGIN_FROM_EMAIL`; falls back to console logging when unset. Inbound `aloha@`/`info@` use Cloudflare Email Routing.
- **Testing:** `node:test` + `node:assert/strict`. No test framework.
- **Analytics:** `gtag` (G-YBX9T1NJEL), lazily loaded on first interaction.
- **Scripts:** PowerShell (`scripts/*.ps1`). CI: GitHub Actions `.github/workflows/validate.yml`.

## Directory Map

| Path | Purpose |
|---|---|
| `*.html` (root) | All site pages, flat, no `src/`. Public: `index`, `summer`, `kinder`, `preschool`, `afterschool`, `fees`, `gallery`, `newsletter`, `privacy`. Private: `parents`, `staff`. |
| `worker.js` | Entire backend — routing, auth, API, photo pipeline. Single file, ~1000 lines. |
| `portal.js` / `portal.css` | Client for both parent and staff portals; branches on `document.body.dataset.app`. |
| `site.js` / `site.css` / `summer.css` | Public-site behavior and styling. |
| `migrations/` | Numbered D1 SQL migrations (`001_`…`004_`), applied manually. |
| `tests/` | `parent-portal-auth.test.mjs` (Worker behavior), `site-structure.test.mjs` (HTML/SEO invariants). |
| `scripts/` | `deploy-clean.ps1` (prod), `deploy-staging.ps1`, `dev.ps1`. |
| `docs/` | `deployment.md`, `parent-portal-setup.md`, `summer-page-project.md`. |
| `photos/`, `images/`, `videos/`, `pdfs/` | Public media served directly. |
| `_headers` | Cache-control and security headers for static paths. |
| `.assetsignore` | The only thing preventing repo files from being served publicly. Critical. |

## Architecture & Data Flow

**Request path** (`worker.js` default export `fetch`):

1. `www.luanaenglishschool.jp` → 301 to apex.
2. Hard 404 for `/worker.js`, `/wrangler.jsonc`, `/migrations/*`, `/docs/*`.
3. `/parents` and `/staff` → serve the corresponding HTML asset.
4. `/api/*` → `handleApi()`.
5. Everything else → `env.ASSETS.fetch(request)`.

**Assets:** `assets.directory` is `"."` — the repository root *is* the deploy bundle. Any file not listed in `.assetsignore` is publicly fetchable.

**Auth:** Two entry paths, both ending in the same session.
- Password/code: staff password (`STAFF_PORTAL_PASSWORD`) or per-week parent codes (`SUMMER_WEEK_{1,2,3}_CODE`), compared with `constantEqual()`.
- Magic link: `requestLogin()` writes a `sha256` token hash to `login_tokens` (15-minute expiry), emails the link; `verifyLogin()` consumes it once.

Session is an HMAC-SHA256-signed base64url payload in the `luana_portal` cookie — `HttpOnly; Secure; SameSite=Lax`, 30 days. Parent sessions carry `groups` and `weeks`, which filter every subsequent read.

**Photo write:** staff multipart upload → type/size validation (≤20 MB, jpeg/png/webp/heic/heif, ≤10 per day, concurrency 4) → Cloudflare Images transform to WebP at 1600 px plus a 480 px thumbnail → R2 `put` → D1 rows in `photos`, `post_photos`, `album_photos`. Images-quota errors fall back to storing the original.

**Photo read:** `/api/photos/:id` → session check → group/week authorization → R2 `get` → streamed response.

**Data model:** `parents`/`children` (by `group_key`), `staff`, `login_tokens`, `posts` (by `group_key` + `week_slug` + `post_date`), `albums`/`album_groups`, `photos`, and the `post_photos`/`album_photos` join tables.

## Coding Standards & Conventions

- **Module formats differ by file.** `worker.js` is an ES module (`export default { fetch }`). `portal.js` and `site.js` are **classic scripts** validated by `node --check` — `import`/`export` there breaks CI.
- Flat top-level functions, no classes. `camelCase` functions/locals; `SCREAMING_SNAKE_CASE` module constants.
- All responses go through the `json()`, `text()`, or `asset()` helpers. Do not construct bare `Response` objects for API routes.
- **Error handling:** throw an `Error` carrying `.status` (and `.setupRequired` for missing configuration, via `setupError()` → 503). The top-level `catch` logs `console.error("Request failed", { method, pathname, message, stack })` and returns JSON. Never log request bodies, credentials, or parent/child data.
- Auth failures use `authError()` → 401. Gate handlers with `requireSession(request, env, role)` or `optionalSession()`.
- Secrets and tokens: `constantEqual()` for comparison, `sha256()` for storage. Never `===` on a secret.
- **D1:** always `.prepare(sql).bind(...)`. Never interpolate values into SQL. Use `.batch()` where multiple writes must land together.
- **HTML:** hand-authored, `<html lang="ja">`, Japanese UI copy. Structured data lives in one `<script type="application/ld+json">` per page using `@graph` with `@id` anchors (`#breadcrumb`, `#webpage`, `#service`). Each page's JSON-LD is self-contained — cross-page `@id` references do not resolve.
- **CSS:** custom properties on `:root` per page; no preprocessor. All text must meet WCAG AA (4.5:1 normal, 3:1 large ≥18.66 px bold / 24 px). Verify against the *actual* rendered background, including `color-mix()` tints.
- Indentation is 2 spaces. Double quotes in `worker.js` and tests; single quotes in `site.js`.
- **Tests** load the Worker by reading `worker.js` and importing it as a base64 `data:` URL, with hand-rolled `mockDb()` / R2 / Images stubs. Follow that pattern; do not add a mocking library.

## Build, Test & Run Commands

```bash
# Full test suite (34 tests)
node --test tests/*.test.mjs

# Syntax checks (both required by CI)
node --check portal.js
node --input-type=module --check < worker.js

# Deployment package validation
npx --yes wrangler@4.114.0 deploy --dry-run

# Apply a migration
npx --yes wrangler@4.114.0 d1 execute luana_parent_portal --remote --file=migrations/00X_name.sql

# Inbound email routing
npx --yes wrangler@4.114.0 email routing rules list luanaenglishschool.jp
```

```powershell
# Local dev — emulated D1/R2/Images under .wrangler/state, touches nothing remote
.\scripts\dev.ps1

# Staging (luana-english-school-staging) — permits a dirty working tree
.\scripts\deploy-staging.ps1

# Production — runs tests, both syntax checks, and a dry run first; REFUSES a dirty tree
.\scripts\deploy-clean.ps1
.\scripts\deploy-clean.ps1 -DryRun
```

There is no linter or formatter. Do not introduce one without being asked.

## Explicit Constraints

- **Do not add `package.json`, `node_modules`, dependencies, a bundler, a framework, or TypeScript.** The zero-dependency design is deliberate.
- **Do not unpin the Wrangler version.** Both CI and the deploy scripts use `wrangler@4.114.0` exactly.
- **Do not place anything sensitive in the repo root.** `assets.directory` is `"."`, so a new file is public by default. Anything private must be added to **both** `.assetsignore` and `.gitignore`. `.codex-tools/`, `.face-blur-models/`, `.face-blur-review/`, and `summer-raw/` are already excluded — never commit or deploy them.
- **Never use `2>&1` or pipe a native command's stderr in PowerShell.** PS 5.1 wraps stderr lines as `NativeCommandError`, which trips `$ErrorActionPreference = "Stop"` and aborts `deploy-clean.ps1` mid-run even on exit code 0.
- **Never link to, index, or sitemap `/parents` or `/staff`.** They are protected by `robots.txt` `Disallow`, `<meta name="robots" content="noindex,nofollow">`, and absence of inbound links. All three must stay.
- **Do not add `Review` or `AggregateRating` schema** to any page — self-published reviews of your own organization violate Google's structured-data guidelines. Reviews belong on the Google Business Profile.
- **Do not add `Offer`/price schema to a page that does not visibly display those prices.** Prices live on `fees.html` only.
- **Lighthouse SEO 92 is expected, not a defect.** The lone failure is Cloudflare's injected `Content-Signal` directive, which Lighthouse does not recognize. Do not "fix" it by disabling Cloudflare's managed `robots.txt` — that block also denies GPTBot, Google-Extended, Bytespider, Amazonbot, Applebot-Extended, and meta-externalagent.
- **Never deploy a dirty working tree**, and never bypass `deploy-clean.ps1` by calling `wrangler deploy` directly for production.
- **Photographs of children require confirmed publication permission** before being added to any public page or external profile. When in doubt, do not publish.
- Do not commit without being asked; the maintainer reviews changes first.
