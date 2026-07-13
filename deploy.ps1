# deploy.ps1 - git push + deploy Vercel + smoke test
# Uso: .\deploy.ps1
# Da lanciare dalla root del repo.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Ancora alla cartella dello script (= root del repo) così funziona anche se
# lanciato da una sottocartella (client-next, server, ...). Senza questo, i
# Set-Location relativi sotto si romperebbero e .\deploy.ps1 da subfolder fallisce.
Set-Location $PSScriptRoot

# Sorveglianza vulnerabilità dipendenze (CVE). Informativo: NON blocca il deploy,
# ma stampa high/critical così le vedi ad ogni rilascio. Fix: aggiorna il pacchetto
# (o mergia la PR di Dependabot). Vedi SECURITY.md §0.
Write-Host "`n=== npm audit (dipendenze - informativo) ===" -ForegroundColor Cyan
Set-Location client-next
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) { Write-Host "  Vulnerabilita high/critical rilevate (vedi sopra) - valuta un aggiornamento." -ForegroundColor Yellow }
Set-Location ..

Write-Host "`n=== Git push (Railway) ===" -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nGit push fallito." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Deploy Vercel (Next.js) ===" -ForegroundColor Cyan
Set-Location client-next
# --force: rebuild SENZA build cache. Necessario perché Vercel, riusando la cache,
# può NON re-inlinare le env var NEXT_PUBLIC_* nel bundle client (es. la Site Key
# Turnstile) → widget rotto → form bloccati. La cache stale ci ha già rotto i form
# in produzione (17/6, campagna live). Affidabilità > 1-2 min di build in più.
npx vercel --prod --force --yes
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
