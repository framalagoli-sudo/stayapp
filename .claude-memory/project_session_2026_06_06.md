---
name: project-session-2026-06-06
description: Session 2026-06-06 — Migrazione Next.js completata e deployata su Vercel (oltrenova-next.vercel.app)
metadata: 
  node_type: memory
  type: project
  originSessionId: c96cc8bb-ed2c-4d97-a0b6-15b9e0417fe5
---

## Stato migrazione Next.js
- Cartella: `client-next/` — deployata su `https://oltrenova-next.vercel.app`
- Railway: `https://stayapp-production.up.railway.app` (NEXT_PUBLIC_API_URL)
- Vercel project: `oltrenova-next` (separato dal progetto SPA corrente)

## Completato ✅
- SSR funzionante in produzione: og:title/og:description/og:image nell'HTML grezzo
- Login admin funziona (entra nel pannello dopo credenziali)
- AziendaProvider aggiunto al layout admin
- lib/supabase.js usa `createClient` da `@supabase/supabase-js` (non ssr)
- lib/api.js: apiFetch con import lazy supabase, serverFetch con try-catch
- Build verde 67 pagine, deploy su Vercel OK

## Fix MFA completati ✅ (sessione 2026-06-06 pomeriggio)

### Bug 1 — MFA bypass per super_admin
**File:** `client-next/components/admin/AdminGuard.jsx`
**Problema:** `mfaStillLoading` dipendeva da `require2fa`, che è sempre `false` per super_admin (nessun `azienda_id`). Il guard non aspettava l'AAL e non reindirizzava a mfa-verify.
**Fix:** `mfaStillLoading = user && aalStatus === null` (sempre aspetta AAL). Check MFA ora usa `aalStatus?.nextLevel === 'aal2'` direttamente, senza dipendere da `require2fa`. Aggiunto redirect a `/admin/security` per utenti non enrollati in aziende con `require_2fa`.

### Bug 2 — Crash dopo inserimento codice TOTP
**File:** `client-next/components/admin/MfaVerifyPage.jsx`
**Problema:** `useRouter()` salvato in `navigate` ma usato come `router` → ReferenceError crash.
**Fix:** Rinominato `navigate` → `router`.

### Bug 3 — Pannello admin visibile dietro la pagina MFA
**File:** `client-next/app/admin/mfa-verify/page.js`
**Problema:** La pagina mfa-verify usava `<AdminLayout>` che mostrava sidebar e contenuto admin in background.
**Fix:** Rimosso `AdminLayout` — la pagina MFA è ora standalone fullscreen.

**Deploy:** commit `9e72417` → `oltrenova-next.vercel.app` ✅ — MFA testato e funzionante.

## Fix SSR crash — window non disponibile (sessione 2026-06-06 sera)

**Causa root del 500 su `/r/fondaco-narni`:** `window.location.pathname` al top-level di `LandingRistorante.jsx` fuori da `useEffect`. In SSR Next.js, `window` non esiste → ReferenceError → HTTP 500.

**Fix su 6 file (commit `eaf3bec`):**
- `LandingRistorante.jsx` — `pwaUrl` usa `/r/${ristorante.slug}?qr=1`, back URL usa slug
- `LandingStruttura.jsx` — stesso + 3 `useState(() => window.innerWidth < 768)` → guarded
- `LandingBlockRenderer.jsx` — back URL usa `homeUrl` già calcolato
- `PaginaPage.jsx` — `useSearchParams` destrutturato come tupla (React Router) → corretto
- `ArticoloPage.jsx` / `PolicyPage.jsx` — window guarded o path relativo

**Regola:** ogni `window.*` al top-level di un `'use client'` crasha in SSR → usare guard o slug dai props.

## Fix smoke test 406 (vecchio SPA + server)

**Causa:** `AuthContext.jsx` usa `.single()` su `profiles` → 406 se 0 righe (utente CI dopo teardown). `onAuthStateChange` + `getSession()` attivano entrambi `fetchProfile` → 2×406 in console.

**Fix (commit `588a3e9`):** `.maybeSingle()` in `AuthContext.jsx` e `server/src/middleware/auth.js`. Deploy su `www.oltrenova.com` (old SPA) via stayapp project.

## Fix 500 su /r/fondaco-narni — session 2026-06-07

**Causa:** `openGraph.type: 'restaurant'` in `app/r/[slug]/page.js` riga 23. Next.js valida i tipi OG a runtime (non a build-time) e lancia `Error: Invalid OpenGraph type: restaurant` → HTTP 500. I tipi validi sono solo: `website`, `article`, `book`, `profile`, `music.*`, `video.*`.

**Fix:** `type: 'restaurant'` → `type: 'website'` — commit + deploy ✅

**Regola:** nei `generateMetadata` di Next.js usare solo tipi OG standard. `restaurant`, `hotel`, ecc. sono tipi schema.org (JSON-LD), non tipi OpenGraph.

## Fix smoke test 401 — session 2026-06-07 (dopo chiusura)

**Causa:** `global-teardown.js` eliminava `ci-user.json` ma lasciava `state.json`. Al successivo deploy, se la hook scattava due volte o il setup falliva, Playwright usava lo state.json stale (token utente già eliminato da Supabase) → 401 su tutti gli endpoint Railway.

**Fix (commit `ab88186`):**
- `tests/global-teardown.js`: aggiunto `rmSync('.auth/state.json', { force: true })` dopo ci-user.json
- `client/src/pages/admin/ImpostazioniPage.jsx`: aggiunto `loadError` state — se l'API fallisce, mostra errore anziché restare bloccata su "Caricamento…"
- Deploy del vecchio SPA su `www.oltrenova.com` ✅

**Regola:** il teardown deve sempre eliminare ENTRAMBI i file: `ci-user.json` E `state.json`. Senza, uno state stale può causare false 401 alla run successiva.

**Regola deploy:** il vecchio SPA (`stayapp`) si deploya dalla ROOT del repo (`cd hospitality && npx vercel --prod`), non da `client/`. Il progetto ha `rootDirectory: client` → se si deploya da `client/`, cerca `client/client/` e fallisce con exit 127.

## Fix smoke test concorrenza — session 2026-06-07 (secondo round)

**Causa:** tre deploy consecutivi avviavano tre hook async contemporaneamente → race condition su `.auth/state.json` e `.auth/ci-user.json`. Hook A's teardown cancellava ci-user.json di hook B → hook B gireva con utente eliminato → 401.

**Fix (commit `ab84b1f`):**
- `tests/global-teardown.js`: `rmSync('.auth/state.json')` spostato PRIMA del check su ci-user.json — così state viene sempre eliminato, anche se ci-user manca
- `.claude/settings.local.json`: lock file `.smoke-lock` con auto-scadenza 5 minuti — serializza i run e previene concorrenza tra hook deploy multipli

## Prossimi step
1. **Test manuale pannello admin** su `oltrenova-next.vercel.app` — navigare tutte le sezioni (strutture, ristoranti, attività, booking, newsletter, blog, staff) e trovare eventuali crash. Francesco lo fa manualmente.
2. **Fix bug trovati** durante il test
3. **Cutover dominio** — spostare `oltrenova.com` da Vercel SPA a `oltrenova-next`
4. **Smoke test aggiornati** — puntare a Next.js invece del vecchio SPA
5. **PWA** — riconfigurare next-pwa (rimosso temporaneamente)

## Direzione futura discussa
- Eliminare Railway migrando le route Express in Next.js API Routes → stack finale: **Vercel + Supabase only**
- Next.js è open source gratuito, Vercel è il servizio a pagamento ($20/mese già attivo)
- Multi-lingua (IT/EN/DE) sarà molto più semplice con Next.js (next-intl)

**Why:** La migrazione è al 90% — MFA funziona, build verde, deploy live. Manca test completo pannello e cutover dominio.
