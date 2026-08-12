---
name: project_session_2026_07_13
description: "Sessione 13/7 — Strato 0 sicurezza reso OPERATIVO: gh CLI, pulizia codice morto (client/+server/), CI gate + branch protection + auto-merge Dependabot"
metadata:
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Chiuso il loop del "processo tipo WordPress-update" deciso l'11/7. Prima era solo configurato (dependabot.yml); ora è **operativo e automatico**. Vedi [[reference_security_audit]] (Strato 0) e [[todo_prossima_sessione]] (punto ripresa 13/7).

**Cosa fatto (tutto committato+pushato su main):**
- **`gh` CLI installato + autenticato** (winget; `C:\Program Files\GitHub CLI\gh.exe`, account framalagoli-sudo, keyring). Sblocca gestione PR/CI/merge da riga di comando.
- **Cancellato codice morto**: `client/` (168 file, vecchio frontend Vite dismesso) + `server/` (55 file, backend Express, Railway spento confermato da Francesco). Effetto misurato: vulnerabilità Dependabot **40 → 19** solo con la pulizia (le dipendenze morte pesavano). Reversibile via git.
- **Gestite le 22 PR Dependabot aperte**: chiuse **10 di rumore** (erano su client//server/ ora cancellati), mergiate **2 CI actions** (checkout/setup-node), messe in **auto-merge 4 sicure** (#9 client-next minor/patch + #3/#4/#5 test), **parcheggiati 6 major** (#22 Next 16, #11 React 19, #12/#20/#21 Sentry, #10 Stripe).
- **CI gate** `.github/workflows/ci.yml`: compila client-next ad ogni PR con **placeholder env non-segreti** (l'app è dynamic a runtime → il build non tocca i segreti veri). **Provato verde** dal vivo (run 1m44s). Sostituisce `check-schema.yml` che girava dentro `server/` (rotto dalla cancellazione).
- **Branch protection** su main: richiede il check "Build client-next". `enforce_admins=false` → Francesco (admin) e `deploy.ps1` continuano a pushare diretto senza intoppi; le PR invece devono passare il gate.
- **Auto-merge** `.github/workflows/dependabot-automerge.yml`: le PR Dependabot **minor/patch** ricevono auto-merge (entrano da sole se verdi); **major esclusi** (manuali).

**Effetto netto**: aggiornamenti dipendenze sicuri = **hands-free**; rotture = **bloccate dal gate**; impegno di Francesco ≈ zero (solo decidere ogni tanto sui major parcheggiati). È il "grande sito" chiesto.

**Tranelli imparati (Windows/PowerShell + gh):**
- `gh` non è sul PATH della shell tool → invocare col percorso pieno.
- `jq` con interpolazione `\(...)` si rompe nel quoting PowerShell (`unknown command "\(.field)"`) → usare path jq semplici (`.field`) o l'output tabellare di default.
- `gh api -X PUT .../branches/main/protection` con payload JSON annidato: passarlo da **file** con `--input file.json` (non stdin, come per gli altri comandi Windows).
- **`deploy.ps1` + branch protection**: da quando `main` è protetto, `git push` (admin bypass) stampa `remote: Bypassed rule violations` su **stderr**. In PS 5.1, se catturi l'output con `2>&1` **e** `$ErrorActionPreference='Stop'`, quello stderr diventa `NativeCommandError` fatale → lo script aborta *dopo* aver pushato. Il `deploy` interattivo di Francesco (senza cattura) NON ha il problema. Quando devo deployare io: lancio i due passi a mano (`npx vercel --prod --force --yes` in client-next, poi `npm test` in tests) senza `2>&1`.
- **`deploy.ps1` em-dash**: i `—` (U+2014) dentro stringhe `Write-Host` rompono il parse PS 5.1 (letto come Windows-1252 → `â€"`, il `"` chiude la stringa). Fix: solo ASCII nei .ps1. Committato (`cf2ea3e`).

**ESITO deploy (13/7)**: tutti i fix + i 15 update Dependabot portati LIVE su Vercel (oltrenova-next, READY, aliasato `*.oltrenova.com`). **59/59 smoke verdi**. CodeQL SAST: 16→**0 alert aperti**.

**Valutazione sicurezza + i "6 punti" (Francesco ha chiesto voto onesto → 7/10, poi "facciamoli tutti"):** i 6 gap = #1 auth-hardening (login+upload), #2 WAF Cloudflare, #3 monitoring/Sentry, #4 RLS 2° muro, #5 pentest esterno, #6 Turnstile (già SOFT per scelta).
- **✅ #1 FATTO e LIVE (13/7)**: **upload blindati** — `lib/upload-helper.js` era l'UNICO punto di scrittura su Storage (tutte le 13 route + qualsiasi upload passano di lì); prima ext/content-type venivano dal client → si caricava `.svg`/`.html` con `<script>` e si otteneva URL pubblico che lo serviva (stored XSS / hosting malware multi-tenant). Ora: allowlist immagini (jpg/png/webp/gif/avif), **ext+content-type forzati dal server**, reject markup (`<`) e file vuoto. **forgot-password**: enumeration chiusa (sempre `ok:true`). **+2 test regressione** in security.spec.js (SVG/markup → 400, verificati live). **Login admin** = `supabase.auth.signInWithPassword` diretto a Supabase Auth → brute-force gestito dalla piattaforma.
- **⏳ AZIONI DASHBOARD di Francesco (login hardening #1 + #2)**: Supabase → Auth → **Rate Limits** (confermare attivi) + **Leaked password protection** ON + **min password length** ≥8/10; Cloudflare → **WAF managed rules** (oggi solo Bot Fight su Free).
- **📋 DA FARE (progetti)**: #4 **RLS 2° muro** — grosso: il server usa `service_role` (bypassa RLS) → oggi l'isolamento tenant dipende da 1 solo strato (codice app). Vero 2° muro per le API = smettere di usare service_role per le letture per-tenant (ri-architettura, a tappe). #3 **monitoring** — Sentry bloccato Next14 → alternativa leggera (Better Stack / Vercel log drain / wrapper captureException). #5 **pentest esterno** (ingaggio, a pagamento).

**Coda: diluvio mail di fallimento dopo la cancellazione client//server/.** Il repo aveva **5 progetti Vercel** + **Railway** ancora agganciati a GitHub (auto-deploy al push). Cancellate le cartelle, quei servizi morti fallivano il build ad ogni push → mail. **Diagnosi a freddo** (non a sensazione): sito live `www.oltrenova.com` = **200 OK, intatto**; il progetto Vercel vivo è **`oltrenova-next`** (deploy SOLO manuale via `deploy.ps1`, non git-connesso → mai toccato dai push). I colpevoli erano i progetti Vercel morti (`stayapp`/`client`/`client-next`/`server`) + Railway. **Verifica dal vivo con GitHub Deployments API**: `gh api repos/<repo>/deployments` mostra `creator.login` (`vercel[bot]` / `railway-app[bot]`) + `sha` + `created_at` per push → si vede ESATTAMENTE chi rebuilda su quale commit. Fix: Vercel = disconnesso git (basta il pannello). **Railway = "disconnetti repo" nel pannello NON basta** (continuava a deployare); serve **uninstallare la GitHub App Railway** da GitHub → Settings → Applications → Installed GitHub Apps → Railway → Uninstall/togli il repo. Confermato con push di test post-uninstall: nessun nuovo deployment. **Lezione**: dopo aver cancellato codice deployato, staccare i servizi CI/host esterni dal repo, e la GitHub App va rimossa lato GitHub (l'azione nel pannello del servizio può non bastare).

**Debito aperto**: perso il check di **drift schema DB** (era `server/scripts/check-schema.js`, morto con server/) → reintrodurre su client-next se utile (backlog, non urgente).
