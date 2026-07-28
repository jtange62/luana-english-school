[CmdletBinding()]
param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path

Push-Location $repositoryRoot
try {
  # Unlike deploy-clean.ps1, staging deploys are allowed with a dirty working
  # tree — staging exists specifically to test work in progress before it is
  # committed and pushed to production.

  $testFiles = Get-ChildItem -LiteralPath "tests" -Filter "*.test.mjs" -File |
    ForEach-Object { $_.FullName }
  & node --test $testFiles
  if ($LASTEXITCODE -ne 0) {
    throw "Automated tests failed."
  }

  & node --check "portal.js"
  if ($LASTEXITCODE -ne 0) {
    throw "portal.js syntax check failed."
  }

  Get-Content -Raw -LiteralPath "worker.js" | & node --input-type=module --check
  if ($LASTEXITCODE -ne 0) {
    throw "worker.js syntax check failed."
  }

  & npx --yes wrangler@4.114.0 deploy --env staging --dry-run
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare staging deployment dry run failed."
  }

  if (-not $DryRun) {
    & npx --yes wrangler@4.114.0 deploy --env staging
    if ($LASTEXITCODE -ne 0) {
      throw "Cloudflare staging deployment failed."
    }
  }
} finally {
  Pop-Location
}
