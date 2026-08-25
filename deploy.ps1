# deploy.ps1 - deploy Vercel + git push + smoke test
# Uso: .\deploy.ps1            (flusso normale)
#      .\deploy.ps1 -AllowDirty  (emergenza: deploya anche con modifiche non committate)
# Da lanciare dalla root del repo.

param([switch]$AllowDirty)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Ancora alla cartella dello script (= root del repo) così funziona anche se
# lanciato da una sottocartella (client-next, tests, ...). Senza questo, i
# Set-Location relativi sotto si romperebbero e .\deploy.ps1 da subfolder fallisce.
Set-Location $PSScriptRoot

# ── Guardie: garantire che ciò che va in produzione sia ciò che è in git ──────
# `vercel --prod` carica i FILE LOCALI, non il commit: senza questi controlli si
# può pubblicare codice che in git non esiste (modifiche non committate, oppure
# un branch diverso da quello che poi viene pushato).
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'main') {
    Write-Host "`nSei sul branch '$branch', non su 'main'." -ForegroundColor Red
    Write-Host "  Il deploy pubblica i file locali ma il push aggiorna 'main': git e produzione divergerebbero." -ForegroundColor Yellow
    Write-Host "  Passa su main (git checkout main) oppure fai il merge prima di deployare." -ForegroundColor Yellow
    exit 1
}

$dirty = git status --porcelain
if ($dirty -and -not $AllowDirty) {
    Write-Host "`nCi sono modifiche non committate:" -ForegroundColor Red
    $dirty | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host "`n  Verrebbero pubblicate in produzione senza finire in git (nessuna traccia, nessun rollback)." -ForegroundColor Yellow
    Write-Host "  Committale prima, oppure usa .\deploy.ps1 -AllowDirty se è un'emergenza consapevole." -ForegroundColor Yellow
    exit 1
}
if ($dirty) { Write-Host "`n-AllowDirty: deploy con modifiche NON committate (fuori da git)." -ForegroundColor Yellow }

# Sorveglianza vulnerabilità dipendenze (CVE). Informativo: NON blocca il deploy,
# ma stampa high/critical così le vedi ad ogni rilascio. Fix: aggiorna il pacchetto
# (o mergia la PR di Dependabot). Vedi SECURITY.md §0.
Write-Host "`n=== npm audit (dipendenze - informativo) ===" -ForegroundColor Cyan
Set-Location client-next
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) { Write-Host "  Vulnerabilita high/critical rilevate (vedi sopra) - valuta un aggiornamento." -ForegroundColor Yellow }
Set-Location ..

# Il deploy viene PRIMA del push: la build di Vercel fa da gate. Se il codice non
# compila, 'main' resta pulito. (Il check CI "Build client-next" non protegge da
# questi push diretti, che hanno il bypass del branch protection.)
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
    Write-Host "`nDeploy fallito. Niente e' stato pushato: 'main' e' rimasto com'era." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Git push ===" -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    # Caso scomodo: la produzione è già aggiornata ma git no. Va sanato subito,
    # altrimenti il prossimo deploy parte da una base che non corrisponde al live.
    Write-Host "`nGit push fallito DOPO un deploy riuscito: la produzione e' aggiornata, 'main' no." -ForegroundColor Red
    Write-Host "  Risolvi e ripusha (git push origin main) prima del prossimo deploy." -ForegroundColor Yellow
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

# ── Sonde di sicurezza ───────────────────────────────────────────────────────
# Un check di sicurezza fatto una volta e' una fotografia: vale finche' nessuno
# tocca il codice. Queste tre girano a ogni deploy perche' le classi che coprono
# sono esattamente quelle che in passato sono rientrate da una porta laterale:
#   - security-sweep      chi puo' leggere cosa senza titolo (multi-tenant)
#   - rls-secondo-muro    cosa esce bussando al database, colonne comprese
#   - colonne-pubbliche   quali colonne escono da una route senza login
# Non bloccano il deploy (e' gia' avvenuto): segnalano subito, forte.
Write-Host "`n=== Sonde di sicurezza ===" -ForegroundColor Cyan
Set-Location tests
$sicurezzaKo = 0
foreach ($sonda in @("probe-security-sweep.mjs", "probe-rls-secondo-muro.mjs", "probe-colonne-pubbliche.mjs")) {
    Write-Host "-- $sonda" -ForegroundColor DarkGray
    node $sonda
    if ($LASTEXITCODE -ne 0) { $sicurezzaKo++ }
}
Set-Location ..

if ($sicurezzaKo -gt 0) {
    Write-Host "`n!! $sicurezzaKo sonde di sicurezza hanno segnalato qualcosa: GUARDARE SOPRA." -ForegroundColor Red
    Write-Host "   Il deploy e' gia' avvenuto. Se e' un buco vero, si chiude adesso." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nDeploy + smoke test + sonde di sicurezza: tutto a posto." -ForegroundColor Green
