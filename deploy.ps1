# deploy.ps1 — git push + deploy Vercel + smoke test
# Uso: .\deploy.ps1
# Da lanciare dalla root del repo.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "`n=== Git push (Railway) ===" -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nGit push fallito." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Deploy Vercel (Next.js) ===" -ForegroundColor Cyan
Set-Location client-next
npx vercel --prod --yes
$deployExit = $LASTEXITCODE
Set-Location ..
if ($deployExit -ne 0) {
    Write-Host "`nDeploy fallito." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Attendo 15s che il deploy si propaghi... ===" -ForegroundColor Cyan
Start-Sleep -Seconds 15

Write-Host "`n=== Smoke test ===" -ForegroundColor Cyan
Set-Location tests
npm test
$testExit = $LASTEXITCODE
Set-Location ..

if ($testExit -ne 0) {
    Write-Host "`nSmoke test falliti." -ForegroundColor Red
    exit 1
}

Write-Host "`nDeploy + smoke test completati con successo." -ForegroundColor Green
