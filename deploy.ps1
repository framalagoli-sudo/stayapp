# deploy.ps1 — deploy Vercel + smoke test
# Uso: .\deploy.ps1
# Da lanciare dalla root del repo.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "`n=== Deploy Vercel (Next.js) ===" -ForegroundColor Cyan
Set-Location client-next
npx vercel --prod --yes
$deployExit = $LASTEXITCODE
Set-Location ..
if ($deployExit -ne 0) {
    Write-Host "`n❌ Deploy fallito." -ForegroundColor Red
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
    Write-Host "`n❌ Smoke test falliti — il deploy è avvenuto ma ci sono regressioni da investigare." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Deploy + smoke test completati con successo." -ForegroundColor Green
