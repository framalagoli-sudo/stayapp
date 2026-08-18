---
name: project_session_2026_08_17_domini
description: "Sessione 17/08/2026 — sistema domini rifatto (istruzioni DNS dinamiche, sottodomini registrati, slug vivo, UI in 3 passi) e dati di produzione riparati"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-17T19:20:35.878Z
---

Sessione del 17/08/2026. Francesco segnalava difficoltà a configurare un dominio cliente dalla voce "Domini". L'indagine ha trovato quattro difetti reali, tutti verificati dal vivo prima di toccare codice.

**Cosa era rotto** (dettaglio tecnico in [[reference_domini_vercel]]):
1. istruzioni DNS con IP hardcodato `76.76.19.19`, morto → clienti con dominio radice offline per sempre;
2. sottodomini marcati `attivo` senza essere registrati su Vercel → 4 su 11 irraggiungibili (525);
3. `entity_slug` copia disallineata dallo slug entità → 5 record puntavano a pagine inesistenti (404);
4. `PATCH /api/domini/[id]` scriveva `updated_at`, colonna inesistente → rinomina sempre 500.

**Cosa è stato fatto**: `lib/vercel-domains.js` (unico punto verso l'API Vercel + normalizzazione dominio + diagnosi), `lib/domini-manutenzione.js` (riallineamento, ricontrollo, passata di manutenzione), migration `070`, cron `/api/cron/domini` ogni 15 min, `/api/domini/manutenzione` (super_admin, `?tutti=1`), `resolve-domain` che legge lo slug vivo, propagazione slug/cancellazione dalle 3 route entità, UI rifatta (3 passi, diagnosi "punta a X / deve puntare a Y", provider riconosciuto dai nameserver con link al pannello, ricontrollo automatico ogni 45s).

**Stato finale misurato** con `tests/probe-domini.mjs` (nuova sonda, `--ripara` lancia la manutenzione): **14 domini, 0 irraggiungibili, 0 disallineati**. `www.garage22terni.it` era un cliente vero offline: aveva già messo il CNAME giusto, mancava solo la registrazione su Vercel. Rimossi a mano due record sporchi (`www.oltrenova.com` registrato come dominio custom della struttura di test, `struttura-test.stayapp.it` su dominio dismesso).

**Seconda parte della sessione**: rinominare l'indirizzo incluso non rompe più i QR stampati — il vecchio indirizzo resta come `tipo='alias'` con redirect 308 al nuovo (migration `071`, `redirect_a`), path e query conservati, alias precedenti ripuntati all'attuale per evitare catene. Provato dal vivo con `tests/probe-rinomina.mjs`.

**⚠️ Errore mio da non ripetere**: ho deployato con `npx --prefix client-next vercel --cwd client-next --prod` invece di entrare in `client-next` ed eseguire `npx vercel --prod --force --yes`. Con `--cwd` **tutte le route dinamiche spariscono dal deployment**: `/r/[slug]`, `/s/[slug]` e ogni `/api/*/[id]` rispondevano 404 — i siti dei clienti giù per circa dieci minuti, mentre i segmenti statici (`/blog`, `/api/domini/manutenzione`) rispondevano normalmente. Risolto rideployando dalla directory corretta. **Il deploy si fa solo da dentro `client-next/`** (o con `deploy.ps1`), mai con `--cwd`/`--prefix`.

**Terza parte**: il pannello ora controlla anche **l'indirizzo gemello** (con/senza www) e lo segnala quando è spento, con i record pronti — prima diceva "Online" mentre chi digitava l'indirizzo a mano trovava un errore. La manutenzione aggancia il gemello su Vercel anche per i domini collegati prima. Riguardava due clienti veri: `fondaconarni.com` e `garage22terni.it` (entrambi DNS su **SiteGround**, funzionano solo con `www`). Attenzione alla distinzione: `oltrenova.com` è comprato su SiteGround ma i **nameserver sono Cloudflare**, quindi i suoi record si toccano su Cloudflare — e l'apex lì funziona già (308 → www).

**Dato sporco da sanare a mano**: la struttura `futura-club-spiagge-bianche` ("Hotel di prova due", creata 23/04/2026) ha `azienda_id` **NULL** — unica in tutto il DB. Non può avere un sottodominio (colonna NOT NULL) e compare nei `problemi` della manutenzione come `sottodominio_non_creato`. Decidere se assegnarle un'azienda o cancellarla.

**CodeQL fallito il 17/08 sui commit 17d2a876 e 8df6592d**: non è un finding. L'analisi girava completa (395/395 file, 0 diagnostiche) e fallivano *l'upload dei risultati* e l'inizializzazione con `No server is currently available to service your request` — guasto lato GitHub. Alert di code scanning: **0 aperti** (11 dismissed, 7 fixed). Nota operativa: CodeQL qui è il **default setup** di GitHub, non un workflow nel repo (`codeql.yml` non esiste) → `gh run rerun` risponde "cannot be retried"; l'analisi riparte da sola al push successivo.

**Aperti**:
- `fondaconarni.com` e `garage22terni.it` (apex): serve che il cliente aggiunga su SiteGround un record `A` con nome `@` verso gli IP che il pannello mostra (oggi `216.150.1.1` / `216.150.16.1` — **leggerli sempre dal pannello**, non da qui: cambiano).
- Rinominando l'indirizzo incluso il vecchio smette di funzionare (QR stampati si rompono): oggi la UI avvisa prima di salvare, un redirect dal vecchio indirizzo è da decidere.
- `deploy.ps1` muore in sessione Claude Code: il plugin Vercel scrive un hint su stderr e con `$ErrorActionPreference='Stop'` PowerShell lo tratta come errore terminante. Il deploy parte comunque (va verificato con `vercel ls --prod`). Nel terminale normale di Francesco il problema non si presenta.

**Seguito del 18/08/2026.** Francesco ha aggiunto su SiteGround il record per `garage22terni.it` (senza www): verificato, risponde **307 → www.garage22terni.it**. Due difetti di interfaccia emersi da lì, corretti:
- l'indirizzo secondario, **quando funzionava**, spariva dalla vista (restava solo l'inciso "Funziona anche…"): chi sistemava i DNS non aveva conferma. Ora la scheda elenca **entrambe le forme** con il proprio esito (apre il sito / porta all'indirizzo principale / non raggiungibile + record da aggiungere);
- lo stesso indirizzo compariva **due volte** (riga di stato + titolo del riquadro sottostante) — è questa la "voce doppia" segnalata: nel database non c'erano duplicati. Il riquadro ora parte da "Come farlo funzionare".
Aggiunte protezioni in `DominiPage`: dedup per id della lista e nessuna sostituzione con `undefined` quando un controllo non restituisce il record.
