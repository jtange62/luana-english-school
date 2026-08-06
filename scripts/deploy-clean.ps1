[CmdletBinding()]
param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path

Push-Location $repositoryRoot
try {
  $workingChanges = git status --porcelain
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect the Git working tree."
  }
  if ($workingChanges) {
    throw "Deployment refused: commit or temporarily set aside all working-tree changes first."
  }

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

  & npx --yes wrangler@4.119.0 deploy --dry-run
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare deployment dry run failed."
  }

  if (-not $DryRun) {
    & npx --yes wrangler@4.119.0 d1 migrations apply luana_parent_portal --remote
    if ($LASTEXITCODE -ne 0) {
      throw "Production database migrations failed."
    }

    & npx --yes wrangler@4.119.0 deploy
    if ($LASTEXITCODE -ne 0) {
      throw "Cloudflare deployment failed."
    }
  }
} finally {
  Pop-Location
}
