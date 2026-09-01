[CmdletBinding()]
param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$repositoryRootForGit = $repositoryRoot.Replace('\', '/')

Push-Location $repositoryRoot
try {
  $workingChanges = & git '-c' "safe.directory=$repositoryRootForGit" 'status' '--porcelain'
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

  & npx --yes wrangler@4.114.0 deploy --dry-run
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare deployment dry run failed."
  }

  if (-not $DryRun) {
    & npx --yes wrangler@4.114.0 deploy
    if ($LASTEXITCODE -ne 0) {
      throw "Cloudflare deployment failed."
    }
  }
} finally {
  Pop-Location
}
