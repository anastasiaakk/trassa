# Полный деплой: build:web + API + портал
# Usage:
#   $env:TRASSA_SSH_PASSWORD = '...'
#   .\scripts\deploy-sync.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $env:TRASSA_SSH_PASSWORD) {
  Write-Host "Set TRASSA_SSH_PASSWORD first" -ForegroundColor Red
  exit 1
}

npm run deploy:sync
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Portal: https://trassa.duckdns.org/#/" -ForegroundColor Green
Write-Host "API:    https://trassa.duckdns.org/api/health" -ForegroundColor Green
