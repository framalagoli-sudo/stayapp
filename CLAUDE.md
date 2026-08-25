# StayApp — Documentazione per sviluppo

> ⚠️ **IMPORTANTE — leggere prima di tutto:** StayApp è una piattaforma SaaS **worldwide per qualsiasi business di servizi** — hotel, ristoranti, attività, MA ANCHE freelancer, studi professionali, agenzie, palestre, coach, negozi, ecc. I nomi nel codice (`struttura`, `ristorante`, `attivita`) sono i primi template verticali, non il limite del prodotto. Ogni feature deve funzionare per un avvocato a Berlino tanto quanto per un hotel in Puglia. Non inquadrare mai StayApp come "tool per hospitality italiana".

Piattaforma SaaS multi-modulo per qualsiasi business di servizi. Il cliente finale inquadra un QR code e accede a una PWA installabile. Ogni entità può attivare anche un **minisito pubblico** (landing page marketing).

**Architettura multi-modulo:**
```
Azienda (top-level)
├── moduli: { struttura, ristorante, attivita, ... }
├── Struttura 1 → PWA /s/:slug  |  Minisito /s/:slug (se attivo)
├── Ristorante 1 → PWA /r/:slug |  Minisito /r/:slug (se attivo)
└── Attività 1  → Minisito /a/:slug
```

> **🌐 Registrazione domini (piano, non ancora implementato)** → `REGISTRAR.md` — il fornitore dev'essere sostituibile: interfaccia unica in `lib/registrar/`, implementazioni sotto. Né Cloudflare né Vercel vendono `.it`.
## ⛔ Prima di scrivere qualsiasi codice

Non è un rimando, è la regola. Vale per **ogni** modifica, anche quelle da due
minuti, anche quando nessuno l'ha chiesto: un difetto non sa che stavamo andando
di fretta. Ognuna di queste righe nasce da un guasto vero già successo.

1. **Ogni route API si autentica** con `requireAuth` / `requireEntityAccess` /
   `requireRecordAccess`, oppure è pubblica **di proposito** e sa di esserlo.
   Le route usano la chiave di servizio e scavalcano la RLS: senza controllo
   applicativo, chiunque legge i dati di chiunque.
2. **Mai `select('*')` dove risponde chi non ha fatto login.** Le colonne si
   elencano. Con l'asterisco, una colonna aggiunta domani viene pubblicata da
   sola — è successo col catalogo shop e con la password del WiFi.
3. **Un dato riservato non si toglie a valle: non si legge a monte.** La query
   non lo chiede per i rami che non ne hanno diritto. Toglierlo dopo è una
   difesa sola, che il prossimo ramo aggiunto scavalca in silenzio.
4. **Un valore che arriva dal client non finisce mai grezzo** in una query, in
   un URL o in una proprietà CSS: passa da una funzione che cerca in un
   catalogo chiuso e in mancanza torna al predefinito.
5. **Quello che legge il browser non importa mai un file che tocca
   `supabaseAdmin`.** Le costanti condivise vanno in un file senza dipendenze.
6. **Ogni migration** dichiara `GRANT` e `ENABLE ROW LEVEL SECURITY`, e
   concede le colonne nuove **una per una** se devono essere pubbliche. La RLS
   filtra le righe, non le colonne.
7. **Il dato deve arrivare fino in fondo**: aggiungendo un campo, aggiungerlo
   anche alle select che servono le pagine pubbliche. Altrimenti si salva e non
   si vede — ed è già successo due volte in un giorno.
8. **Verificare dal vivo, col caso ostile.** Non basta che compili e nemmeno che
   funzioni: si prova anche cosa succede se qualcuno ci mette dentro qualcosa di
   cattivo. Se tocca il browser (PWA, componenti client), va aperto con un
   browser vero: `next build` non vede un identificatore fuori scope.

**Il controllo automatico**: `node tests/verifica-regole.mjs` legge il codice e
trova le violazioni meccaniche di queste regole. Gira **da solo prima di ogni
deploy** e lo blocca. Un'eccezione si può dichiarare — commento
`regola-ok: <motivo>` sopra la riga — ma il motivo va scritto, così resta
leggibile perché quella riga è accettabile.

**Dopo il deploy** girano da sole `probe-security-sweep`,
`probe-rls-secondo-muro` e `probe-colonne-pubbliche`: provano il sistema vivo.

> Dettaglio e storia degli invarianti → `SECURITY.md` §0.

---

> **🧯 Se succede qualcosa (piano di risposta a un incidente)** → `INCIDENTE.md` — scritto per essere eseguito da soli e sotto pressione; verifica dell'archivio con `tests/verifica-backup.mjs`
> **🔒 Sicurezza (invarianti, checklist route, procedure rigide)** → `SECURITY.md` §0 — LEGGERE prima di toccare route API/auth/esposizione dati. Multi-tenant + service_role = la sicurezza dipende dai controlli applicativi.
> **🔍 Check di sicurezza in corso (roadmap A1–A8)** → `SECURITY-CHECK.md` — cosa è già stato verificato e cosa no. A1 (authz) e A2-shop/loyalty fatti; prossimi A3 (mass assignment), A5 (costi AI), A2-booking.
> **Route frontend E backend, JSONB structures, moduli admin/guest, pattern Next** → `client-next/CLAUDE.md` (auto-caricato quando si lavora in client-next/ — tutto il codice LIVE)
> **Schema DB** → `supabase/migrations/` (unica fonte di verità sulle tabelle).
> ⚠️ Non esiste più un backend separato: le API sono **route Next in `client-next/app/api/`**. Il vecchio Express in `server/` è stato rimosso (commit `9b0e484`, 13/07/2026) insieme al frontend Vite in `client/`; entrambi sono in `.gitignore`. Non ricostruirli.

---

## Recovery da zero (PC nuovo o crash)

Tutto il necessario per ripristinare l'ambiente completo:

**1. Clona il repo**
```bash
git clone https://github.com/framalagoli-sudo/stayapp.git hospitality
cd hospitality
cd client-next && npm install
cd ../tests && npm install
```

**2. Variabili d'ambiente** (ricopia dai dashboard):
- `client-next/.env.local` → Vercel Dashboard → Project → Settings → Environment Variables (contiene sia le var pubbliche `NEXT_PUBLIC_*` sia i segreti server-side usati dalle route API)
- `tests/.env.test` → credenziali Supabase (URL + anon key + service role key)

**3. Memory Claude Code** (ripristina il contesto AI accumulato):
```bash
# Su Windows, copia i file dalla cartella nel repo alla posizione attesa da Claude.
# CLAUDE.global.md è la config globale "come lavoro" → va in ~/.claude, NON in memory/.
$dest = "$env:USERPROFILE\.claude\projects\C--Users-<TUO-USERNAME>-progetti-hospitality\memory"
New-Item -ItemType Directory -Force $dest
Copy-Item .claude-memory\* $dest -Exclude CLAUDE.global.md
Copy-Item .claude-memory\CLAUDE.global.md "$env:USERPROFILE\.claude\CLAUDE.md"
```
> La cartella `.claude-memory/` nel repo contiene tutte le memory di sessione **+** il backup del CLAUDE.md globale (`CLAUDE.global.md`). Aggiornata ad ogni sessione con `git push`.

**4. Avvio locale** — un solo processo: le API girano dentro la stessa app Next.
```bash
cd client-next && npm run dev  # → http://localhost:3000 (frontend + /api/*)
```

**5. Comando `deploy` (Windows, opzionale ma comodo)**
Crea la funzione `deploy` nel profilo PowerShell così da lanciare `deploy.ps1` da **qualsiasi** cartella (senza `.\` e senza dover essere in root). Il file profilo è fuori dal repo → va ricreato a mano al recovery:
```powershell
# Percorso profilo: C:\Users\<TUO-USERNAME>\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1
$dir = Split-Path $PROFILE
New-Item -ItemType Directory -Force $dir | Out-Null
@'
# Lancia il deploy di StayApp (push + Vercel + smoke test) da qualsiasi cartella.
# deploy.ps1 si riposiziona da solo sulla root del repo ($PSScriptRoot).
function deploy { & "C:\Users\<TUO-USERNAME>\progetti\hospitality\deploy.ps1" }
'@ | Out-File $PROFILE -Encoding utf8
```
Poi riavvia il terminale (oppure `. $PROFILE`) e usa `deploy`. Richiede ExecutionPolicy ≠ `Restricted` (di default qui è `Bypass`).

---

## Setup nuovo sviluppatore

**Prerequisiti:** Node.js 18+, Git, credenziali Supabase/Vercel (da Francesco — fra.malagoli@gmail.com)

```bash
git clone https://github.com/framalagoli-sudo/stayapp.git && cd hospitality
cd client-next && npm install
```

**Variabili d'ambiente:** un solo file, `client-next/.env.local` → copia da Vercel → Settings → Environment Variables. Include le `NEXT_PUBLIC_*` (esposte al browser) e i segreti usati **solo** dalle route API server-side (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, …).
> ⚠️ Vercel inietta un BOM: applicare sempre `.trim()` alle env var server-side.
> ⚠️ **`SUPABASE_SERVICE_ROLE_KEY` è indispensabile anche in locale**: le pagine ospite sono SSR (`lib/guest-data.js` interroga Supabase server-side) e senza quella chiave ogni `/s|/r|/a` risponde **500 `supabaseKey is required`** — mentre l'admin continua a caricare, quindi il guasto passa inosservato. Il dev locale lavora sul **DB di produzione**: si guarda, non si sperimenta.

**Avvio locale:**
```bash
cd client-next && npm run dev   # → http://localhost:3000 (frontend + /api/*)
```

**Deploy — sempre e solo `.\deploy.ps1` dalla root:**
```powershell
.\deploy.ps1
```
Lo script fa in sequenza: **guardie** → `npm audit` (informativo) → `npx vercel --prod --force --yes` **da `client-next/`** → `git push origin main` → attesa 15s → smoke test (`tests/`, ~3 min). Se i test falliscono il deploy è già avvenuto, ma il problema emerge subito.

> **Perché il deploy viene PRIMA del push** (dal 12/08/2026): `vercel --prod` pubblica i **file locali**, non il commit. Mettendolo per primo, la build Vercel fa da gate — se il codice non compila, `main` resta pulito. Serve perché il check CI "Build client-next" non protegge i push diretti a `main` (bypass admin).
> **Le due guardie** escono prima di toccare Vercel: si deploya **solo da `main`** e **solo con working tree pulito** (altrimenti finirebbe in produzione codice che in git non esiste). Emergenza consapevole: `.\deploy.ps1 -AllowDirty`.
> ⚠️ Se il push fallisce **dopo** un deploy riuscito, la produzione è avanti rispetto a git: sanare subito con `git push origin main`.
> ⚠️ Il `Not authorized` di Vercel è **transitorio**: rilanciare prima di indagare.

> 🚫 **Mai `npx vercel` con `--cwd` o `--prefix`.** Deployando con `npx --prefix client-next vercel --cwd client-next --prod` **tutte le route dinamiche spariscono dal deployment**: `/r/[slug]`, `/s/[slug]` e ogni `/api/*/[id]` rispondono 404, mentre i segmenti statici (`/blog`) rispondono normalmente — quindi il guasto non si vede se non si prova una pagina cliente. Successo il 17/08/2026, siti giù ~10 minuti. Entrare in `client-next/` ed eseguire `npx vercel --prod --force --yes`, oppure usare `deploy.ps1`.
>
> 🚫 **Mai `npx vercel` dalla root.** Il file `.vercel/project.json` in root è ancora agganciato al vecchio progetto `stayapp` (`framework: vite`, `rootDirectory: client`) — un deploy da lì pubblicherebbe il frontend dismesso. Il progetto live è quello linkato dentro `client-next/`.

> ⚠️ Migration SQL: eseguire a mano su Supabase Dashboard → SQL Editor. Non sono automatiche.

**Account:** Supabase Pro ($25/mese), Vercel Pro ($20/mese), Cloudflare Free, Resend Free — tutti gestiti da Francesco. Railway dismesso (backend migrato su Vercel).

---

## Stack tecnico

| Layer | Tecnologia |
|---|---|
| Frontend | Next.js 15.5 (App Router) + React 19 |
| Backend | Route API Next in `client-next/app/api/` (nessun server separato) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Icone | lucide-react ^1.24.0 |
| Router | Next App Router (file-based) |
| Email | Resend (RESEND_API_KEY in env) |
| Pagamenti | Stripe — integrato per lo **shop**; booking/eventi ancora da fare |
| Hosting | **Vercel** (frontend + route API nella stessa app) — dominio live `https://oltrenova.com` |
| Cron | Vercel Cron → `client-next/vercel.json` (`/api/cron/*`) |

---

## Architettura repository

```
hospitality/
├── client-next/                    # TUTTO il codice live (frontend + backend)
│   ├── vercel.json                 # build Next + definizione dei cron
│   ├── middleware.js               # domini custom, redirect, lingua
│   ├── app/
│   │   ├── page.js                 # landing marketing OltreNova (hardcoded)
│   │   ├── admin/                  # pannello di gestione
│   │   ├── s/ · r/ · a/            # PWA ospite + minisiti pubblici per entità
│   │   └── api/                    # ~196 route API — il backend
│   │       ├── auth/ · users/ · aziende/ · properties/
│   │       ├── guest/              # endpoint pubblici (no auth)
│   │       ├── booking/ · eventi/ · shop/ · vetrine/ · pagine/ …
│   │       ├── cron/               # newsletter, automazioni, blog, backup
│   │       └── webhooks/ · resend-webhook/ · shop/webhook/stripe/
│   ├── components/ · context/ · hooks/
│   └── lib/                        # supabase, send-email, guest-data, blockTypes …
├── tests/                          # smoke test Playwright su produzione + sonde `probe-*.mjs`
└── supabase/migrations/            # 001–069, eseguire a mano su Supabase
```
> `client/` e `server/` non esistono più nel repo (vedi nota in cima). Se li vedi in locale sono residui: sono in `.gitignore` e vanno cancellati, non aggiornati.

**Sonde diagnostiche** (`tests/probe-*.mjs`, da lanciare a mano con `node`, non fanno parte dello smoke): misurano il layout **dal vivo** invece di dedurlo dal codice. Creano un utente admin effimero (`probe-auth.mjs`, stesso pattern di `global-setup.js`) e lo eliminano sempre. `probe-overflow` cerca overflow orizzontale nelle pagine admin; `probe-grid-stress` / `probe-guest-stress` iniettano un nome lunghissimo per vedere quali liste cedono (vedi nota 23); `probe-shot` / `probe-page-shot` fanno screenshot di una pagina admin/pubblica. Puntano a produzione: `$env:TEST_URL='http://localhost:3000'` per usarle sul dev locale.

---

## Convenzioni di codice

### Icone (lucide-react)
- `strokeWidth={1.5}` sempre
- `color={primary}` sempre
- Bottom nav inattiva: `opacity: 0.4`; attiva: `opacity: 1`

### Form e input in liste dinamiche
```jsx
function ItemForm({ item, onPatch }) {
  const [name, setName] = useState(item.name)
  return <input value={name} onChange={e => setName(e.target.value)} onBlur={() => onPatch({ name })} />
}
```
Testo: onChange locale → onBlur propaga. Select/toggle/file: onChange diretto.

### API calls
- `apiFetch(path, options)` — Bearer token, gestisce JSON
- `uploadMedia(endpoint, file)` — multipart, NON impostare Content-Type

### Hook pattern
- `useProperty()` — struttura corrente da `profile.property_id`
- `useRistorante(id)` / `useAttivita(id)` — by ID
- Tutti espongono: `{ data, loading, saving, saved, saveError, save }`

### Stile
- Tutto inline styles, nessun CSS framework
- Admin: sidebar 220px + main `#f5f5f5`
- Guest PWA: flex column con bottom nav fixed; scroll area `flex:1; overflow-y:auto`
- Desktop mockup guest: 390px, `border-radius:44px`, `overflow:hidden`

---

## Note importanti

1. **Slug**: generato al momento della creazione, non modificabile dopo. Conflitti → aggiunge `-{timestamp base36}`.

2. **cache-buster URL**: `?v={timestamp}` su tutti gli URL Storage. Non rimuovere.

3. **`slug` nella select guest**: tutti e tre gli endpoint guest (`/api/guest/:slug`, `/r/:slug`, `/a/:slug`) devono includere `slug` nella `.select()`. Senza, i link privacy/cookie nel minisito restano `undefined`.

4. **CookieBanner**: usa `createPortal(document.body)` per evitare problemi di stacking context in Firefox. Key localStorage: `cookie_consent_v2`.

5. **vercel.json**: `client-next/vercel.json` definisce build Next + i cron. Nessun rewrite SPA: il routing è file-based e le pagine pubbliche sono SSR.

6. **Deploy**: sempre `.\deploy.ps1` dalla root (mai `npx vercel` dalla root — vedi sopra). GitHub auto-deploy **non** collegato per scelta: il deploy è manuale, così gira sempre lo smoke test. Ordine: deploy Vercel → `git push` → smoke; lo script si rifiuta di partire fuori da `main` o con modifiche non committate. **`push` ≠ pubblicare**: il push scrive su GitHub (archivio), è il deploy che aggiorna `oltrenova.com`.

7. **Dev locale**: un solo processo, `npm run dev` in `client-next/` → `:3000`. Se la porta è occupata da un'istanza precedente: `Stop-Process -Id <PID> -Force`.

8. **Supabase service role**: le route API usano la service role key → **bypassano RLS**. La sicurezza multi-tenant dipende quindi dai controlli applicativi in ogni route (vedi `SECURITY.md` §0). La RLS resta come secondo muro per le query client-side (AuthContext, useProperty).

9. **Discriminazione booking vs richieste**: prenotazioni salvate in `requests` con `message` che inizia con `[Prenotazione attività]`, `[Prenotazione escursione]` o `[Interesse offerta: nome]`. `BookingsPage` filtra con `message.startsWith('[Prenotazione') || message.startsWith('[Interesse offerta')`, `RequestsPage` le esclude.

10. **Newsletter — double opt-in**: `POST /api/contatti/subscribe` salva con `iscritto_newsletter: false` + invia email conferma `/confirm-subscription?token=uuid`. Token azzerato su conferma.

11. **Cron (Vercel)**: gli invii schedulati non girano più con `setInterval` in un processo sempre acceso. Sono route in `app/api/cron/*` invocate da Vercel Cron secondo `client-next/vercel.json` (newsletter e automazioni ogni minuto, blog ogni ora, **domini ogni 15 minuti**, backup alle 3). Ogni route è **protetta da `CRON_SECRET`** via header `Authorization: Bearer` — nuove route cron devono fare lo stesso controllo. La logica sta in `lib/` (es. `runScheduledSends` in `lib/newsletter-send.js`).

12. **Pageview tracking**: landing page fanno `POST /api/guest/pageview` al mount, deduplicato con `sessionStorage` key `pv_{entity.id}`. 1 visita per sessione browser.

13. **Route handler**: ogni handler con try-catch e ritorno JSON esplicito; un'eccezione non gestita in una route Next diventa un 500 opaco.

18. **⚠️ Supabase Redirect URLs**: aggiornare ad ogni cambio dominio in `Supabase Dashboard → Authentication → URL Configuration → Redirect URLs`:
    ```
    https://www.oltrenova.com/admin/reset-password
    https://www.oltrenova.com/admin/accept-invite
    https://stayapp-henna.vercel.app/admin/reset-password
    http://localhost:3000/admin/reset-password
    http://localhost:3000/admin/accept-invite
    ```
    Site URL: `https://oltrenova.com` (senza www — impostato su Supabase Dashboard)
    > ⚠️ Le voci `localhost` erano su `:5173` (vecchio dev server Vite). Il dev locale ora è su `:3000`: **da correggere a mano sul Dashboard Supabase**, altrimenti reset password e accept-invite in locale non tornano indietro.

19. **⚠️ Supabase Grant espliciti — obbligatori da ottobre 2026**: ogni migration futura deve includere:
    ```sql
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.nuova_tabella TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.nuova_tabella TO service_role;
    -- Solo per tabelle pubbliche (/api/guest/* senza auth):
    -- GRANT SELECT ON public.nuova_tabella TO anon;
    ALTER TABLE public.nuova_tabella ENABLE ROW LEVEL SECURITY;
    ```

22. **⚠️ Drag & drop con componenti React inline**: definire un componente React DENTRO un altro componente causa unmount/remount ad ogni render (nuova identità di funzione) → interrompe il drag. **Fix**: usare funzione normale `renderXxx()` chiamata direttamente `{renderXxx(item)}`. Applicato a `renderMenuRow` in `SitoPage.jsx`. Stesso vale per qualsiasi altro editor drag & drop futuro.

23. **⚠️ Liste in `display:grid` e nomi lunghi**: senza `gridTemplateColumns`, la colonna implicita si dimensiona sul **contenuto** → un nome lungo (dato del cliente!) allarga la riga oltre la scheda e spinge fuori campi e pulsanti. Vale anche per `1fr`, che equivale a `minmax(auto, 1fr)` e conserva il minimo automatico. **Fix**: `gridTemplateColumns: 'minmax(0, 1fr)'` sulla lista, più `overflowWrap: 'anywhere'` sul testo che può essere una parola sola lunghissima (senza spazi né trattini il browser non può andare a capo da solo). Applicato a `RistoranteMenuPage` (11/08), poi a `PropertiesPage` / `RistoranteListPage` / `AttivitaListPage` e alla card check-in di `GuestApp` (12/08). Le sonde `tests/probe-grid-stress.mjs` e `probe-guest-stress.mjs` verificano il difetto dal vivo.

24. **⚠️ Domini (sottodominio incluso + dominio del cliente)** — `lib/vercel-domains.js` è l'**unico** punto che parla con l'API Vercel; `lib/domini-manutenzione.js` tiene allineato il DB alla realtà di rete. Regole apprese sul campo (17/08/2026), da non violare:
    - **Mai scrivere valori DNS nel codice.** Gli IP di Vercel cambiano: l'IP hardcodato `76.76.19.19` oggi **non risponde più**, e ogni cliente con dominio apex che seguiva le istruzioni restava offline. I record si chiedono a `GET /v6/domains/{d}/config` (`recommendedIPv4`/`recommendedCNAME`).
    - **Il wildcard `*.oltrenova.com` su Vercel NON basta**: senza registrare il singolo hostname sul progetto, Vercel non emette il certificato e il browser riceve un errore TLS (525 dietro Cloudflare). Ogni sottodominio va registrato davvero (`assicuraSottodominio`).
    - **Apex e www vanno in coppia**: chi collega `miosito.it` deve trovare online anche `www.miosito.it` (registrato come redirect, colonna `variante_dominio`).
    - **Apex ≠ "due punti"**: `miosito.co.uk` è una radice. L'apex si legge da `apexName` nella risposta Vercel (Public Suffix List), l'euristica in `apexDiRipiego` è solo il ripiego.
    - **`domini.entity_slug` è una cache, non la verità**: lo slug dell'entità è modificabile, quindi `resolve-domain` legge sempre lo slug vivo via `entity_id` e riallinea la copia. Senza questo, rinominare un'entità mandava il dominio su un 404.
    - **`stato` non si dichiara, si misura**: `diagnosticaDominio` combina stato Vercel + DNS reali + **una GET HTTPS vera** all'indirizzo. Vercel può dire `verified` e `misconfigured:false` mentre il sito è irraggiungibile.

25. **🔐 Secondo fattore e passkey** — `require_2fa` è **attivo su tutte le aziende** e il default della colonna è `true` (migration 072): ogni azienda nuova nasce protetta. L'enforcement sta in `enforceMfa` (`lib/server-auth.js`) e vale per ogni route che passa da `requireAuth`.
    - Le **passkey sono un metodo di accesso**, non un fattore MFA: `mfa.enroll({factorType:'webauthn'})` resta "disabled" ed è normale. Si usano con `auth.registerPasskey()` / `auth.signInWithPasskey()`, che richiedono `createClient(..., { auth: { experimental: { passkey: true } } })`.
    - Producono una sessione **`aal1`** con `amr: [{method:'passkey'}]`: `enforceMfa` la accetta come autenticazione completa, perché quella credenziale è legata al dominio e un sito civetta non può rigiocarla — chiedere in più un codice significherebbe pretendere il metodo debole da chi ha usato il forte.
    - ⚠️ Se cambia il dominio del pannello vanno aggiornati **Relying Party ID e Origins** su Supabase (oggi ID `oltrenova.com`, origins con **e senza** `www`: il pannello gira su `www`), altrimenti le passkey esistenti smettono di funzionare.
    - Sonde: `tests/probe-mfa-bypass.mjs` (una sessione a un fattore non deve poter disattivare il TOTP né leggere dati), `probe-passkey.mjs` (flusso completo con autenticatore virtuale), `probe-onboarding-2fa.mjs` (chi si trova il 2FA imposto riesce ad attivarlo).

26. **👁️ Anteprima delle bozze — solo con token firmato** (23/08/2026). `?preview=1` mostrava a **chiunque** pagine, home ed elementi vetrina non pubblicati: listini e campagne non ancora usciti, con URL indovinabile. Ora il permesso è un token HMAC nell'URL (`lib/preview-token.js`), legato a tipo+entità e con scadenza 2h; lo rilascia `GET /api/pagine/preview-token` solo a chi passa `requireEntityAccess`.
    - **Il controllo sta in `getPagina` / `getElementoVetrina`** (`lib/guest-data.js`): un solo punto che copre insieme le pagine SSR e la route API. Aggiungendo un contenuto con stato bozza, passare di lì — non reintrodurre un flag booleano `preview`.
    - ⚠️ **L'anteprima si apre in `window.open` e in un `<iframe>`**: sono navigazioni del browser e **non possono portare un header Bearer**. Per questo il permesso viaggia nell'URL firmato: pretendere il token di sessione spegnerebbe l'anteprima ai clienti.
    - Il segreto è `CRON_SECRET` (ripiego `SUPABASE_SERVICE_ROLE_KEY`), già presente in produzione: nessuna env var nuova.
    - Stessa sessione: catalogo shop pubblico con select esplicita (un `select('*')` su route pubblica pubblica da solo ogni colonna futura), saldo fedeltà che non rivela più se un'email è cliente, codici gift card da `crypto.randomBytes` e non `Math.random()`.
    - Sonda `tests/probe-security-sweep.mjs`: prova **tutte** le route API con nessun token / token di un'altra azienda, e verifica che nessuna lista perda dati altrui. Da rilanciare quando si aggiungono route.

27. **🪝 Gli URL dei webhook vanno registrati su `www`, mai sull'apex** (23/08/2026). `https://oltrenova.com/...` risponde **308** verso `www`, e **un 3xx è un fallimento di consegna**: Svix (il motore che Resend usa per i webhook — header `svix-*`) non segue i redirect, per non trascinare gli header di firma su un altro host. Risultato: il webhook bounce di Resend è rimasto muto **dal 9 luglio al 23 agosto 2026** e Resend lo ha disattivato da solo.
    - Vale per **tutti** i fornitori: verificato che `resend-webhook`, `shop/webhook/stripe`, `whatsapp/webhook` e `webhooks` danno **308 sull'apex e rispondono solo su `www`**.
    - Sintomo ingannevole: l'endpoint provato a mano su `www` funziona benissimo, quindi sembra tutto a posto. Il guasto si vede **solo** provando l'URL esattamente com'è registrato dal fornitore.
    - Conseguenza silenziosa di un webhook bounce morto: le email inesistenti non vengono più marcate `email_non_valida`, si continua a scrivere a caselle morte e la reputazione del dominio peggiora — senza nessun errore visibile.

28. **🔇 Guasti silenziosi: due forme, due difese** (24/08/2026). Il webhook dei rimbalzi muto 45 giorni e il chatbot che rispondeva *"Entità non trovata"* su due verticali su tre hanno lo stesso padre: **niente gridava**.
    - **Quando qualcosa fallisce** → `logError(source, err, { alert: true })` manda un'email, deduplicata a 1/ora per sorgente. Lo fanno **tutti e sei i cron** (prima due su sei scrivevano solo in console, il backup nemmeno quello). Il destinatario è `ERROR_ALERT_EMAIL`, con ripiego su `DEMO_NOTIFY_EMAIL`.
    - **Quando qualcosa smette di girare** → `try/catch` è cieco: *nessuno lancia un'eccezione se una funzione non viene mai chiamata*. Serve accorgersi di un'**assenza**. `lib/cron-battito.js` + migration `077`: ogni cron chiama `battitoEControllo(nome)` a fine giro riuscito; chi gira dopo verifica che gli altri non siano fermi oltre la loro soglia e avvisa. Nessun guardiano dedicato: basta che **uno qualsiasi** sia vivo.
    - Soglie generose rispetto alla cadenza (newsletter 15 min, backup 30 ore): meglio accorgersi tardi che avere falsi allarmi a ogni rallentamento di Vercel.
    - **`/admin/diagnostica`** (solo super_admin) mostra tutto: destinatario degli allarmi + pulsante per **provarli davvero**, battito dei processi, uso reale dei moduli, errori. ⚠️ Sullo storico errori dice esplicitamente che **non viene conservato**: una lista vuota si leggerebbe come "nessun errore" mentre significa "non li registriamo".
    - Giro periodico: `tests/probe-e-vivo.mjs` distingue **viva / spenta (nessun dato: non è un guasto) / rotta**.

29. **👑 Un solo super_admin, garantito dal database** (24/08/2026, migration `076`+`078`). È la chiave che apre i dati di **tutte** le aziende, e la piattaforma ha un unico proprietario.
    - La route rifiuta `role: 'super_admin'` con 403 — anche a un super_admin. E il trigger `trg_un_solo_super_admin` lo impedisce comunque, **anche alla service_role**, perché le route bypassano la RLS e una route futura scritta distrattamente non deve poter aggirare la regola.
    - ⚠️ **Le sonde non possono più crearsi un super_admin effimero.** Unica eccezione: il dominio finto `@playwright.internal`, che serve all'utente CI degli smoke (la `076` da sola aveva **rotto l'intera suite**, da qui la `078`).
    - **Recupero dell'accesso**: `ALTER TABLE profiles DISABLE TRIGGER trg_un_solo_super_admin;` → promuovi → riattiva. Dal SQL Editor: un gesto deliberato, non una spunta nel pannello.

30. **🖼️ Le immagini si comprimono al caricamento** (24/08/2026, `lib/upload-helper.js`). Le foto arrivavano dal telefono del cliente e finivano online tali e quali: media **1 MB**, punte di 3,9 MB. Le pagine rispondevano in 640 ms e poi il browser scaricava quattro megabyte — su rete mobile, dieci secondi di pagina bianca. **Il numero del server diceva "veloce", l'esperienza reale diceva il contrario.**
    - Ora: lato lungo max 1920px, riscrittura in **WebP** q82, orientamento EXIF rispettato (altrimenti le foto da telefono restano coricate). Le GIF si saltano (ucciderebbe l'animazione) e se la compressione non guadagna nulla si tiene l'originale. Se fallisce si pubblica comunque: è un miglioramento, non un requisito.
    - `sharp` era già una dipendenza. Le immagini **già online** sono state ricompresse una tantum con `tests/probe-comprimi-esistenti.mjs` (23,3 MB → 5,4 MB): quello script mantiene formato e percorso originali, così gli URL nel DB non cambiano — e **simula soltanto** se non gli si passa `--esegui`.
    - ⚠️ Dopo una sostituzione, la CDN serve ancora la vecchia copia finché la cache non scade: per verificare, aggiungere un parametro nuovo all'URL.

31. **🧩 UNA SOLA TABELLA `entita`** (25/08/2026, migration `079`–`081`). Le tre tabelle `properties`, `ristoranti` e `attivita` non esistono più per il codice: tutto legge e scrive da `entita`. **Il tipo non limita più nessuna funzione** — decide solo l'indirizzo pubblico (`/s/`, `/r/`, `/a/`) e il preset iniziale; cosa un cliente può fare lo dicono i `moduli`. Un hotel può avere il menù, un ristorante i servizi, una palestra le prenotazioni.
    - **Perché**: OltreNova è nata come app per hotel e le altre due sono arrivate dopo ereditando solo una parte dei campi — 20 comuni e 17 esclusivi. Un hotel non poteva dichiarare gli orari (da cui il chatbot muto), un ristorante non poteva elencare i servizi, e `whatsapp` esisteva solo sugli hotel.
    - **`lib/entita.js` è l'unico punto di accesso.** `allaFormaStorica` / `dallaFormaStorica` traducono verso i nomi che il pannello usa da sempre (`modules`, `pwa`, e per le attività `tipo` = descrizione del settore). ⚠️ **Sono un debito con scadenza**: quando l'interfaccia userà i nomi nuovi, i tre alias si tolgono in un colpo.
    - `tipo` = tecnico e chiuso · `settore` = libero ("Officina meccanica"), per AI e SEO, senza effetti tecnici. Confonderli fa sparire i siti dal routing: è già successo in corsa.
    - Lo **slug è unico fra tutte le entità**, non più dentro il tipo.
    - Le vecchie tabelle restano come rete finché non si esegue la migration di dismissione. I trigger `081` le sincronizzano verso `entita`, ma **nessuno ci scrive più**: sono ferme.
    - ⚠️ **Il `next build` NON segnala una funzione non importata** dentro un handler: è passato due volte con import mancanti, e la seconda ha mandato in 500 le tre route `/api/guest/*` in produzione. Dopo una modifica per script, verificare a mano che ogni file che usa una funzione la importi.
    - Sonde: `probe-entita-unificata.mjs` (copia corretta), `probe-sincronizzazione.mjs` (i trigger seguono), `probe-entita-ciclo.mjs` (crea/rileggi/modifica/pubblica sui tre tipi), `probe-confronto-siti.mjs` (i siti sono identici prima e dopo).
    - ✅ **Il pannello espone le funzioni fuori dal verticale** (25/08/2026). Il recinto sopravviveva in tre punti oltre ai dati, tutti rimossi: la whitelist dei campi scrivibili (una per verticale → `CAMPI_MODIFICABILI` in `lib/entita.js`), il menu laterale (tre liste → `SEZIONI_ENTITA` in `AdminLayout.jsx`) e i campi serviti alle pagine pubbliche (tre select → `CAMPI_ENTITA` in `lib/guest-data.js`, senza cui il dato non arrivava comunque al sito).

32. **🎛️ Le funzioni si accendono dal pannello** (25/08/2026, `lib/funzioni.js` + `FunzioniPage.jsx` → `/admin/<tipo>/[id]/funzioni`). `FUNZIONI` è il catalogo, **uno solo per tutti i tipi**; `funzioneAttiva(ent, chiave)` è l'unica risposta alla domanda "questa funzione è accesa?", e la usano sia il menu laterale sia le pagine.
    - Chiave **assente** nei `moduli` = mai deciso → vale `MODULI_PREDEFINITI[tipo]`, così chi c'era prima vede esattamente quello che vedeva. Chiave **presente** = scelta del cliente, e vince sempre.
    - `sempre: true` (Informazioni, Sito) = ossatura, non si spegne.
    - ⚠️ **Il catalogo NON sta in `lib/entita.js`**: quel file apre la connessione con la chiave di servizio, e importarlo dal pannello — che è codice di browser — ci trascina dentro il bundle client. Verificato il 25/08 che nessun segreto fosse esposto (Next inlina solo le `NEXT_PUBLIC_*`), ma il codice server c'era. Regola: **quello che legge il browser non importa mai un file che tocca `supabaseAdmin`.**
    - ✅ **Anche l'app del QR segue gli interruttori** (25/08/2026). `sezioniOspite(ent, contenuto)` decide cosa mostrare: funzione accesa **e** contenuto dentro (una scheda vuota è peggio di una assente). Le tre PWA restano tre file, ma la logica è una sola.
    - ⚠️ **I due vocabolari non si parlavano.** Nei dati veri la radice di `moduli` usa nomi propri — `gallery` sui ristoranti, `restaurant`/`chat` sulle strutture, tutto annidato dentro `.modules` sulle attività — mentre il catalogo nuovo scrive `galleria`, `menu`. Ora `funzioneAttiva` conosce gli **alias** e l'ordine è: chiave nuova → alias storico → `home_sections` → preset del tipo. `moduliDi` appiattisce l'annidamento. Aggiungendo una funzione al catalogo, **controllare se esiste già con un altro nome nei dati**.
    - ⚠️ **Le PWA sono codice di browser: il `next build` non le prova.** Un identificatore fuori scope non lo vedono né il build né una GET con curl — `AEsploraPage` non riceveva `surfaceBg` ed è emerso solo aprendo la pagina con Playwright. Dopo ogni modifica alle PWA: `probe-app-ospite.mjs`.
    - L'**assistente non ha un interruttore**: si accende nella sua pagina, dove si scrive anche cosa deve sapere. Un secondo interruttore che dice "acceso" mentre il bot è spento è una promessa falsa.
    - Sonde: `probe-funzioni-universali.mjs` (ogni tipo apre ogni sezione e ne salva i contenuti), `probe-entita-campi-sistema.mjs` (la whitelist allargata non lascia scrivere `azienda_id`, `tipo`, `plan`, `created_at`).

33. **📶 Le credenziali del WiFi escono solo dall'app dell'ospite** (25/08/2026). Misurato in produzione: la password WiFi di una struttura vera viaggiava nel payload di **ogni** pagina pubblica di quella struttura — sito, privacy, cookie, manifest — e nessuna diceva ai motori di ricerca di non indicizzarla.
    - Ora `getStruttura(slug)` **non** legge i campi wifi; li chiede solo il ramo che rende l'app del QR, con `getStruttura(slug, { ospite: true })`. Prima arrivavano ovunque e venivano tolti dopo: una difesa sola, che il prossimo ramo aggiunto avrebbe scavalcato in silenzio.
    - L'app dell'ospite è **noindex**: è quello che si apre inquadrando il QR in camera, non una pagina da motore di ricerca. Il minisito di marketing resta indicizzabile.
    - ⚠️ Cercare un segreto nell'HTML **confrontando pochi caratteri dà falsi positivi**: i primi 40 di un JWT sono l'header, uguale per tutti, e una password corta come `214` si trova dentro un path SVG. Confrontare la **coda** e guardare il contesto.
    - Sonda: `probe-wifi-privacy.mjs` (verifica sia che sparisca dove non serve, sia che **resti** dove serve).


34. **🛡️ La sicurezza non è una fotografia: gira a ogni deploy** (25/08/2026). Il Punto A del check era stato chiuso il 24; il 25 è saltata fuori la password WiFi di un cliente vero, esposta da una classe che nessuna delle otto sotto-fasi copriva. **Il catalogo delle classi non è chiuso**, quindi un controllo una tantum vale finché nessuno tocca il codice.
    - `deploy.ps1` lancia tre sonde dopo gli smoke: `probe-security-sweep` (204 route, con nessun token e con quello di un'altra azienda), `probe-rls-secondo-muro` (cosa legge un estraneo bussando al database, **tabelle e colonne**), `probe-colonne-pubbliche` (quali colonne escono dalle route senza login, con **elenco atteso fissato**: una colonna aggiunta domani fa scattare la segnalazione).
    - ⚠️ **Un allarme che suona sempre viene ignorato.** La sweep aveva 7 segnalazioni permanenti — route pubbliche per costruzione: guardate una per una e messe in allowlist con il motivo scritto. Ora è pulita, quindi quando suona vuol dire qualcosa.
    - **La RLS filtra le righe, non le colonne** (migration `082`): `entita` è leggibile senza sessione perché serve alle pagine pubbliche, e con la riga partivano `wifi_password`, `wifi_name` e `privacy_data` (codici fiscali dei titolari). Lo strumento sono i `GRANT SELECT (colonne)`. Da ora **ogni colonna nuova su `entita` nasce invisibile al ruolo pubblico**.
    - **La chiave che scrive i backup non deve poterli cancellare.** Sta su Vercel accanto a quella del database: se può cancellare, un solo furto porta via i dati e l'archivio. La pulizia dei file scaduti ora è facoltativa — se il permesso manca non è un errore — così la chiave può stare in sola scrittura e la scadenza diventa una regola del bucket.
    - **`tests/verifica-backup.mjs`**: apre un archivio scaricato da R2 e dice se da lì si torna in piedi. Confronta con la produzione, trova le tabelle mai esportate e guarda **dentro** i dati (slug, blocchi) — i conteggi da soli non bastano.
    - **`INCIDENTE.md`**: cosa fare alle tre di notte, da soli. Prima si chiude, poi si guarda. Comprese le **72 ore del GDPR**, che si pagano a parte a prescindere dalla violazione.

35. **🔑 Dopo `createUser` il profilo si scrive con `upsert`, mai `insert`** (25/08/2026). Alla creazione di un utente un trigger inserisce già la riga in `profiles` (ruolo `staff`, nessuna azienda). `/api/auth/signup` faceva un `insert`: chiave duplicata, 500, e il rollback cancellava utente e azienda appena creati — **la registrazione self-serve non poteva riuscire**. Non se n'era accorto nessuno perché le iscrizioni sono chiuse e ogni account è nato da invito.
    - Le sonde usavano `upsert` e quindi funzionavano: **provare in un modo diverso da come il codice gira nasconde il difetto invece di rivelarlo.**
    - `tests/probe-percorso-cliente.mjs` non legge il codice, **percorre** i passi di un cliente il primo giorno e segnala dove servirebbe una telefonata. Da rilanciare prima di aprire le registrazioni.

---

## Roadmap

### Completato
- Analytics, Newsletter (4 fasi), Booking risorse, Chatbot, Password reset, Sicurezza Fase 1+2, Gestione staff, Sistema pagine CMS (39 tipi blocchi, drag&drop, SEO, header/footer configuratore) ✅ 2026-05-14
- **Infra**: Supabase Pro ✅, Vercel Pro ✅, dominio **oltrenova.com** live (cutover) ✅, Railway freezato (tutto su Vercel) ✅
- **Multi-lingua IT/EN** ✅: sito, sotto-pagine, footer, privacy/cookie, form, blog, eventi, PWA ospite, menu ristorante — auto-traduzione ibrida (Claude Haiku) + URL /en + hreflang + override admin. Toggle lingua **inline nell'header** (non più pill flottante). DE non fatto.
- **Site-builder maturo** ✅ 2026-07-02: 8 template per verticale, hero slider + carosello + menù + 39 blocchi, sfondi sezione con testo adattivo, colore primario+secondario, varianti blocco, animazioni scroll, anteprima live in-editor, undo/redo, copia/incolla blocchi, header/footer per-pagina, immagini AI (Unsplash). "Livello Elementor" per il target SMB.
- **AI Site Builder unificato** ✅ 2026-07: un unico flusso lineare (Sito→Obiettivo→Business→Design), template = step design; **import da documento** ("Ho già i contenuti": incolla testo da ChatGPT + prompt pronto, una/più pagine, modello Sonnet per fedeltà). Editor sito unico in SitoPage (ritirata MiniSitoPage; tracking/pixel migrati).
- **Landing marketing OltreNova** ridisegnata ✅ 2026-07 (palette nero/bianco/petrolio/ocra + sfumato instagram, contatti + P.IVA).
- **Header sito pubblico** ✅ 2026-07: logo visibile in cima (anche con slider), menu **hamburger** su mobile, **logo negativo** per sfondi scuri (footer/header, colonna `logo_dark_url`).
- **Link a pagine interne nei blocchi** ✅ 2026-07-07: selettore "🔗 Pagine" (Home/pagine pubblicate/Privacy/Cookie) su tutti i campi URL dell'editor pagine + CTA header/footer sito (`components/admin/LinkPicker.jsx`). Link interni del renderer resi **lingua/dominio-aware** (`base` + `siteHref` in `LandingBlockRenderer`): su `/en` e domini custom i link puntano al target giusto. Restano IT-only i dettagli offerte/pacchetti.
- **Vetrine (Fasi 1+2+3)** ✅ 2026-07-08: motore generico "collezioni + elementi" (migration `065`, preset in `lib/vetrinePresets.js`, API + tab admin **Vetrine**). **Fase 1** = dati + admin (editor guidato dal preset). **Fase 2** = vetrina pubblica: blocco `vetrina` (griglia via `/api/guest/vetrina/[id]`) + dettaglio **SSR** `/{s|r|a}/[slug]/v/[itemSlug]` + sitemap. **Fase 3** = form lead del dettaglio → `POST /api/guest/contact` (`source:'vetrina'`) → **CRM `contatti`** (tag `vetrina`, progetto in nota, notifica titolare). Preset **flipping**, **auto** (nuovo/usato), **viaggi** (agenzie); `dati_privati` gated (0 leak verificato). Capability generiche: **filtri/ricerca server-side + paginazione + range** (barra auto-generata dal preset: pill stato col colore tema, tendine, fascia prezzo, range 2° numerico via colonne `num1/num2` migr.066), **tipi-campo** list/geo(mappa)/file (con `safeUrl`), filtro a livello di blocco (una vetrina → pagine "nuove"/"usate"), CTA guidata dal preset, WhatsApp per-elemento. Nuovo verticale = nuovo preset (~20-30 righe), zero migration. Vedi memoria `project_vetrine`.

- **AI Builder + dati entità** ✅ 2026-07-09: l'AI Site Builder (`ai-fill` live + `generate-site`) ora legge i **dati reali** dell'entità (`lib/ai-entity-context.js`, whitelist — mai `wifi_password`) → testi fedeli, meno digitazione nel wizard.
- **Domini: collegamento autonomo del cliente** ✅ 2026-08-17 — istruzioni DNS chieste a Vercel (mai hardcodate), sottodomini registrati davvero (certificato emesso), stato **misurato** con una GET HTTPS reale, apex+www in coppia con avviso se una delle due è spenta, rinomina non distruttiva (il vecchio indirizzo reindirizza al nuovo, QR salvi), UI in tre passi con diagnosi in chiaro e provider riconosciuto, manutenzione automatica ogni 15 min. Dettaglio → nota 24.
- **Sidebar admin riorganizzata** ✅ 2026-07-09: L1 barra principale in linguaggio umano (**Clienti & richieste** / **Contenuti & promo**); L2 menu entità raggruppato (**Contenuti / Sito & presenza / Impostazioni**) con **AI Site Builder** e QR nel menu. Solo `admin_azienda`; super/legacy invariati. Manca onboarding "Inizia qui" (backlog).

### Da fare (in ordine)
- [ ] 🎯 **Onboarding "Inizia qui"** — checklist primo accesso (completa i dati → genera il sito con l'AI → pubblica → dominio → primi contatti). **È il capitolo aperto più importante**: la sicurezza è fatta, quello che manca è che un cliente nuovo arrivi al sito pubblicato *da solo*.
- [ ] **Pagamenti Stripe** — checkout booking risorse ed eventi (colonne `pagamento_stato/pagamento_id` già su prenotazioni). NB: lo Stripe dello **shop** è già integrato (`app/api/shop/webhook/stripe`).
- [x] **Next 15.5 + React 19** ✅ 18/08/2026 — chiuse le 21 vulnerabilità su `next`. ⚠️ Prima di tentare la **16** vanno migrati i `params` sincroni (~102 occorrenze, codemod `next-async-request-api`): la 15 li tollera, la 16 no
- [ ] **Upgrade Next 16** — **manutenzione, non sicurezza** (triage 11/8: nessuno degli advisory high ci riguarda). Si farà per React 19 / Sentry / attualità. L'ostacolo `next-pwa` è stato rimosso, quindi ora è meno rischioso.
- [ ] **Import documento v2** — upload file PDF/DOCX + chunking per documenti lunghi
- [ ] **Multi-lingua DE** (IT/EN già fatti)
- [ ] **Notifiche real-time** — Supabase Realtime su `requests` (bassa priorità)
- [ ] Email reminder booking, QR Code con logo, PWA installabile da ri-abilitare (NetworkFirst, **mai** precache dello shell), Recensioni ospiti, Integrazione PMS

### Decisioni prese (NON sono "da fare")
- **GitHub → Vercel auto-deploy: NO, deliberato** (17/7). Il deploy resta manuale via `deploy.ps1` proprio perché così gira sempre lo smoke test integrato: è un valore, non un limite.
- **Sentry: rimosso** (23/7). Era installato ma inerte su Next 14. Il monitoring è **in casa**: `lib/observability.js` → log su Vercel + alert email via Resend. Riconsiderarlo semmai dopo l'upgrade di Next.
- **`SiteNav` condiviso: fatto** — l'header pubblico non è più duplicato.
- **Turnstile: resta SOFT per sempre** — lo strict bloccava clienti veri.

> Per il dettaglio completo vedere `FEATURES.md` nella root del repo.
