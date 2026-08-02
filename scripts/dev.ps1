[CmdletBinding()]
param(
  [switch]$Staging
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path

Push-Location $repositoryRoot
try {
  & node --check "portal.js"
  if ($LASTEXITCODE -ne 0) {
    throw "portal.js syntax check failed."
  }

  Get-Content -Raw -LiteralPath "worker.js" | & node --input-type=module --check
  if ($LASTEXITCODE -ne 0) {
    throw "worker.js syntax check failed."
  }

  $databaseName = if ($Staging) { "luana_parent_portal_staging" } else { "luana_parent_portal" }
  & npx --yes wrangler@4.114.0 d1 migrations apply $databaseName --local
  if ($LASTEXITCODE -ne 0) {
    throw "Local D1 migration failed."
  }

  if ($Staging) {
    & npx --yes wrangler@4.114.0 dev --env staging
  } else {
    & npx --yes wrangler@4.114.0 dev
  }
} finally {
  Pop-Location
}
