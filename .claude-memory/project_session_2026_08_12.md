---
name: project_session_2026_08_12
description: "Sessione 12/08/2026 — chiusi i 3 aperti piccoli: residuo client/ rimosso, deploy.ps1 con gate+guardie, sweep bug grid misurato dal vivo (3 liste admin + card check-in PWA) con sonde probe-*.mjs"
metadata: 
  node_type: memory
  type: project
  originSessionId: def02397-c897-4edf-bae0-413b418c3dd2
  modified: 2026-08-12T16:38:30.972Z
---

# Sessione 12/08/2026 — gli "aperti piccoli" lasciati dall'11/08

Francesco: «se puoi 1 migliorare 2 lavorare in modo più sicuro 3 performare,
procedi come ritieni opportuno». Tutto committato (`f06d0c45`), deployato e
**verificato in produzione**. Smoke 66 passati / 1 skipped.

## 1. Residuo `client/` — rimosso
Non era più il vecchio Vite: restava solo `client/.vite/deps_temp_*/package.json`
(23 byte, cache). Gitignorato, 0 file tracciati → cancellato senza impatto.

## 2. `deploy.ps1`: la build Vercel come gate + due guardie
**Problema**: il check CI "Build client-next" non protegge i push diretti a
`main` (Francesco ha il bypass), e `vercel --prod` pubblica i **file locali**,
non il commit.

**Fix scelto** (invece di passare a branch+PR, che sarebbe costato ~2 min di CI
a ogni deploy): **invertito l'ordine → deploy Vercel PRIMA, `git push` dopo**.
Se il codice non compila, `main` resta pulito. Costo zero.

Aggiunte due guardie che escono **prima** di toccare Vercel:
- non sei su `main` → stop (deployeresti i file di un branch e pusheresti main);
- working tree sporco → stop (finirebbe in produzione codice non in git).
  Override consapevole: `.\deploy.ps1 -AllowDirty`.
Entrambe **provate** (branch usa e getta + tree sporco) prima di usare lo script.
Messaggio esplicito anche nel caso scomodo "deploy ok ma push fallito".

Riscritto il file in **UTF-8 con BOM**: PS 5.1 legge i `.ps1` senza BOM come
ANSI e storpiava gli accenti a schermo (era già così prima, non una regressione).
⚠️ Questo **supera la regola del 13/07 "solo ASCII nei `.ps1`"** (nata quando un
em-dash `—` ruppe il parse): la causa era l'assenza del BOM, non i caratteri in
sé. Col BOM accenti e frecce passano — verificato, lo script gira due volte.

## 3. Bug grid: dalla teoria alla misura
Scanner statico (graffe bilanciate sugli oggetti `style`) → **10 candidati**
`display:grid` senza `gridTemplateColumns`. Ma coi dati reali, a 1280px,
**59 pagine admin su 60 erano pulite**.

Allora ho scritto la **prova ostile**: inietto un nome lunghissimo in ogni riga
e guardo chi cede. Risultato: **3 liste admin** (properties +227px, ristoranti
+150px, attività +150px) e — più importante — la **card check-in della PWA
ospite** (`GuestApp.jsx`), dove il valore è il campo orario scritto dal titolare,
a 28px in una colonna da 147px. Lì lo vede il **cliente finale**.

Falsi positivi scartati (verificati nel codice, non a occhio): audit log
(troncamento voluto `maxWidth`+ellipsis in wrapper `overflowX:auto`), form
builder ed elenco tipi richiesta (testi **statici** nel codice).

**Fix**: `minmax(0, 1fr)` + `overflowWrap: 'anywhere'`. Servono **entrambi** —
dettaglio e regola generale in [[reference_grid_liste_admin]] (ora anche nota 23
del `CLAUDE.md`).

**Prova prima/dopo, misurata**: in produzione pre-fix il valore check-in usciva
di 53px dalla card e spingeva via il check-out (screenshot); dopo il deploy va a
capo dentro la card (`gridDelta: 0`). Con un testo *con spazi o trattini* il
browser se la cavava già da solo: il caso che rompe è la **parola unica**.

## 4. Sonde `tests/probe-*.mjs` (nuove, committate)
Misurano il layout **dal vivo** invece di dedurlo. Utente super_admin effimero
(`probe-auth.mjs`, stesso pattern di `global-setup.js`, sempre eliminato in
`finally`). Non fanno parte dello smoke: si lanciano a mano con `node`.
`probe-overflow` (overflow coi dati attuali), `probe-grid-stress` /
`probe-guest-stress` (prova ostile), `probe-shot` / `probe-page-shot`
(screenshot admin/pubblico). `$env:TEST_URL='http://localhost:3000'` per il dev.
**Deciso di NON metterle nello smoke**: utili ma lente e potenzialmente flaky.

## 5. Scoperto per strada
- **Dev locale era rotto da tempo**: mancava `SUPABASE_SERVICE_ROLE_KEY` in
  `client-next/.env.local` → 500 su ogni pagina guest. Aggiunta. Vedi
  [[reference_dev_locale_env]] — include la lezione: le prime verifiche "locali
  ok" erano su pagine vuote.
- **`components/admin/RistorantiListPage.jsx` non è importato da nessuno**:
  duplicato morto di `ristorante/RistoranteListPage.jsx` (quello vivo). Non
  cancellato (fuori mandato) → **backlog**.
- **Due nuovi advisory XSS su Next** (CSP nonces `GHSA-ffhc`, beforeInteractive
  `GHSA-gx5p`) visti nell'`npm audit` del deploy: **non ci riguardano** — non
  usiamo nonce (la CSP ha `'unsafe-inline'`) e `beforeInteractive` non compare
  nel codice. Il triage dell'11/08 regge.
- `Not authorized` di Vercel di nuovo transitorio: passato al secondo tentativo.
