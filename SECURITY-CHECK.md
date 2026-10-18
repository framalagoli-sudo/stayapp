# Check di sicurezza — punto A ✅ COMPLETO

> **Chiuso il 24/08/2026**: tutte e otto le sotto-fasi verificate, ogni buco trovato è corretto, live e
> ricontrollato in produzione. Il prossimo passo è il punto **B**: la revisione funzionale area per area
> (cosa manca o non torna per un cliente vero).
> Criterio deciso con Francesco: **massima protezione e privacy dei dati** quando la scelta è di prodotto
> e non tecnica.

Ogni sottopunto risponde a una domanda diversa. Sono separati perché **un metodo non trova i buchi di un
altro**: la sonda che verifica i permessi è cieca sugli abusi fatti con richieste perfettamente legittime,
ed è esattamente lì che si nascondeva il problema del loyalty.

---

## A1 — Autorizzazione e isolamento multi-tenant ✅ FATTO (23/08)

**Domanda**: chi può entrare dove non dovrebbe?

Sonda `tests/probe-security-sweep.mjs`: due aziende effimere che bussano a tutte le route con nessun
token e con il token dell'altra azienda. Copertura 202 route su 202.

**Esito**: il muro regge. 92 liste interrogate da un'azienda estranea, zero perdite; nessuna risorsa
altrui leggibile, modificabile o cancellabile.

**Chiuso in corsa**: `?preview=1` mostrava a chiunque pagine, home ed elementi vetrina in bozza
(→ nota 26 in `CLAUDE.md`); `select('*')` sul catalogo shop pubblico; saldo fedeltà che rivelava se
un'email fosse cliente.

⚠️ **«Nessuna risorsa altrui cancellabile» era vero per le RIGHE, non per gli EFFETTI** (trovato il
24/09/2026 leggendo il codice, non dalla sonda). `DELETE /api/ristoranti|attivita/:id` di un'altra
azienda cancellava 0 righe — quindi la sweep lo vedeva «respinto» — e poi staccava comunque i domini
della vittima da Vercel: sito offline, risposta 200. Una sonda che guarda cosa **esce** da una route
non vede cosa **succede**. Chiuso (`cancellaEntita`, SECURITY §0 invariante 20), mai sfruttato (registro
dal 14/05), e ora una sonda dedicata in `deploy.ps1` verifica l'effetto sulla vittima:
`probe-cancella-entita-altrui.mjs`. La classe da cercare altrove: **route che fanno qualcosa dopo un
filtro senza controllarne l'esito** (invio di email, chiamate a fornitori, file).

---

## A2 — Logica di valore: denaro, crediti, posti ✅ FATTO (23-24/08)

**Domanda**: si può creare valore dal nulla, o distruggere quello di un altro, **senza mai violare un
permesso**? È la classe che A1 non vede, perché ogni singola richiesta è legittima.

**Fatto (23/08)** — shop e fedeltà: punti e gift card venivano consumati alla *creazione* dell'ordine,
non al pagamento. Ordini mai pagati fabbricavano punti; chi conosceva un codice gift card lo azzerava
senza pagare; lo sconto non arrivava nemmeno a Stripe. Ora tutto passa da `finalizzaLoyaltyOrdine`,
idempotente, agganciata al pagamento accertato. Sonda: `tests/probe-loyalty-denaro.mjs`.

**Fatto (24/08)** — gli altri flussi dove qualcosa vale denaro o è limitato:
- [x] **Booking risorse**: si può occupare o liberare uno slot altrui? Prenotare oltre la capienza?
      Cancellare la prenotazione di un altro conoscendo un id? Doppia prenotazione dello stesso slot
      inviata in parallelo (corsa)?
- [x] **Eventi**: i posti (`event_bookings`) si esauriscono davvero? Il controllo "posti disponibili"
      regge a richieste simultanee, o due persone prendono l'ultimo posto?
- [x] **Preventivi**: il token pubblico di accettazione è indovinabile? Si può accettare o modificare
      il preventivo di un altro?
- [ ] **Stripe booking/eventi** (quando verrà collegato): stessa regola del loyalty — nessun valore
      consumato prima del pagamento accertato.

**Perché conta ora**: shop e loyalty sono a zero utilizzo, ma il booking **è usato**.

---

## A3 — Campi privilegiati e mass assignment ✅ FATTO (24/08)

**Domanda**: posso cambiare *quale* record scrivo, o *chi sono*, infilando un campo in più nel corpo
della richiesta?

**Trovato e chiuso — l'entità altrui.** `azienda_id` era protetto ovunque da `resolveAziendaId`
(invariante 3 rispettato), ma **`entity_id` no**: arrivava dal client validato solo come UUID. Un'azienda
poteva creare un proprio evento puntandolo all'entità di un'altra, e **l'evento compariva sul sito
pubblico della vittima** — titolo, descrizione, immagine e prezzo arbitrari sulla pagina di un altro
cliente, con le prenotazioni dirottate all'attaccante. Verificato sfruttabile in produzione su **eventi**
e **risorse booking**.

Fix: primitiva `entitaDellaAzienda(profile, tipo, id)` in `lib/server-auth.js`, applicata dove l'entità
arriva dal corpo — eventi (POST+PATCH), risorse booking (POST+PATCH), recensioni, automazioni, blog,
newsletter. Difesa in profondità: `/api/guest/eventi` ora filtra il primo ramo della `.or()` anche per
azienda, così un record già sporco resta invisibile; e `entity_tipo` è whitelistato prima
dell'interpolazione nel filtro, come già si faceva in `/api/collegamenti`.

**Verificato integro — l'escalation di ruolo.** Provato dal vivo: un `admin_azienda` non riesce a
promuoversi `super_admin` (403), non riesce a spostarsi nell'azienda di un altro (403), e un invito con
`role: 'super_admin'` + `azienda_id` altrui produce comunque uno **staff nella propria azienda**. In
`/api/users/[id]` `role` e `azienda_id` sono scrivibili solo da super_admin; in `/api/users/invite` il
ruolo è hardcoded.

Sonda: `tests/probe-mass-assignment.mjs` — prova anche i casi **legittimi** (propria entità), perché un
controllo che blocca tutto non è un fix ma un guasto. Tre test in `security.spec.js`.

---

## A4 — Injection nei filtri e XSS nei contenuti ✅ FATTO (24/08)

**Domanda**: un dato scritto da un utente può cambiare il senso di una query o eseguire codice nel
browser di qualcun altro?

**Verificato integro, nessun intervento necessario**:
- **Filtri PostgREST**: `contatti` sanifica i metacaratteri `,()\*` prima della `.or()`, `blog/public`
  valida l'UUID, `collegamenti` whitelista il tipo, e `getCollegamenti` riceve solo stringhe letterali e
  id **letti dal database** — mai input utente. L'unico punto scoperto era `guest/eventi`, chiuso con A3.
- **XSS**: DOMPurify sul contenuto del blog; il blocco HTML dell'editor gira dentro un `<iframe srcDoc>`
  con `sandbox` **senza `allow-same-origin`** (origine opaca: non tocca cookie né DOM del sito);
  `safeUrl` è una allowlist di schemi che blocca `javascript:` e `data:`; il CSS della landing è statico.
- **Prompt injection**: il system prompt del chatbot contiene solo dati pubblici del business.
  `wifi_password` è esclusa dalla select — provato a farla dire al modello, non trapela.

**Trovato invece un guasto funzionale, cercando altro**: la query del chatbot chiedeva le stesse colonne
a tutte e tre le tabelle, ma `properties` non ha `schedule` e `ristoranti` non ha `services`. La select
falliva e l'errore usciva come *"Entità non trovata"*: il chatbot era **muto su due verticali su tre**,
in silenzio, e nessuno se ne era accorto. Ora i campi sono elencati per tipo — e restano espliciti
proprio perché un `select('*')` porterebbe `wifi_password` dentro il prompt.

---

## A5 — Abuso a volume e costi ✅ FATTO (24/08)

**Domanda**: quanto può costarci, in denaro o reputazione, qualcuno che ripete una richiesta lecita un
milione di volte?

**Il presupposto, verificato per primo**: `getClientIp` prende il **primo** valore di
`x-forwarded-for`. Se il proxy appendesse invece di sostituire, chiunque si sceglierebbe l'identità a
ogni richiesta e **ogni limite della piattaforma sarebbe decorativo**. Misurato dal vivo: il proxy impone
l'IP reale, l'header falsificato viene ignorato — 0 richieste su 12 passate cambiando IP a ogni colpo.
I limiti sono veri (`tests/probe-rate-limit.mjs`).

- [x] **Chatbot AI pubblico**: già protetto — 40/ora per IP, modello Haiku, 300 token, storico troncato
      agli ultimi 10 messaggi da 800 caratteri. È l'unica route AI raggiungibile senza login.
- [x] **Route pubbliche che spediscono email** — tre erano scoperte:
      **`guest/book`** (la più concreta, perché è in uso: scriveva nel CRM del cliente, gli mandava
      un'email e faceva scattare le sue automazioni, senza alcun limite → 10/ora, soglia larga perché gli
      ospiti condividono il WiFi);
      **`auth/signup`** (ogni chiamata creava utente + azienda + email a un indirizzo scelto da chi
      chiama; latente perché `signup_enabled=false`, ma si aprirà con l'onboarding self-serve → 3/ora);
      **`guest/recensione/[token]`** — non un limite mancante ma un **difetto di logica**: la guardia
      contro il reinvio stava su `pubblica`, che resta `false` proprio quando il voto è basso, quindi una
      recensione **negativa** si reinviava all'infinito spedendo ogni volta un'email al titolare. Guardia
      spostata su `verificata`.
      `form-builder/public/submit` sembrava scoperta a una prima scansione: ha invece 5/ora + Turnstile.
- [ ] **Storage**: caricamenti ripetuti che riempiono lo spazio — rimandato ad **A6**, dove si guardano
      i file nel loro insieme.
- [x] **⛔ Riaperto e chiuso il 15/09/2026 — l'AI dietro il login.** A5 aveva guardato solo il chatbot
      pubblico, «l'unica route AI raggiungibile senza login». Ma chi ha il login **è** un cliente, e le
      credenziali erano già in mano a più clienti: delle 13 chiamate all'AI, quattro avevano un «limite
      mensile» tenuto in una `new Map()` (su Vercel riparte da zero a ogni istanza: decorativo) e otto
      nessuno — compreso l'import da documento con Sonnet fino a 15 chiamate in parallelo. Nessuna
      registrava la spesa. Ora passano tutte da `lib/ai-consumi.js`: tetto mensile **in dollari per
      azienda** (`aziende.ai_budget_mensile_usd`, predefinito nel codice), spesa scritta in
      `ai_consumi` coi token veri della risposta, avviso a Francesco all'80% e al 100%, migration `119`.
      `verifica-regole.mjs` segnala ogni chiamata ad Anthropic fatta da un altro file. Trovato per strada:
      `ai/blog-auto` accettava l'entità di un altro cliente (solo login, niente `requireEntityAccess`).
      **La lezione della classe**: «raggiungibile senza login» non è l'unico perimetro dei costi — un
      cliente autenticato che gioca spende quanto uno sconosciuto.

Sonde: `probe-rate-limit.mjs`, `probe-abuso-volume.mjs`. Un test in `security.spec.js`.

---

## A6 — File e caricamenti ✅ FATTO (24/08)

**Domanda**: cosa entra davvero quando qualcuno carica un file?

**Trovato e chiuso**: le route di upload non scrivono solo il file, **aggiornano anche il record**
(`cover_url`, `logo_url`). Tre di esse — `attivita-cover`, `attivita-logo`, `event-cover` — lo facevano
**senza controllo di proprietà**: un'azienda poteva cambiare copertina e logo sul sito di un'altra.
Defacement, non solo spazio occupato. Aggiunte `requireEntityAccess`/`requireRecordAccess`;
`attivita-gallery` scopata per lo storage. Le route di struttura e ristorante già controllavano.

**Verificato integro**:
- [x] Tipo e dimensione **server-side**: allowlist MIME→estensione, tetto 5 MB. Estensione e
      content-type salvati derivano dall'allowlist, **mai** dal client (falsificabile).
- [x] Niente SVG (può contenere `<script>`), più il rifiuto dei file che iniziano con `<`.
- [x] `/api/upload` è uno **stub che risponde 404**: porta chiusa, non dimenticata.
- [x] Storage: i caricamenti passano tutti da route autenticate e ora scopate.

Sonda: `tests/probe-upload-altrui.mjs`, che prova anche il caricamento **legittimo** sulla propria
entità. Un test in `security.spec.js`.

---

## A7 — Segreti, webhook e cron ✅ FATTO (24/08)

**Domanda**: chi può far eseguire alla piattaforma qualcosa fingendosi un servizio esterno?

**Verificato integro, nessun intervento necessario**:
- [x] **Cron**: tutte e sei le route rifiutano sia senza segreto sia con un segreto inventato (401),
      provato dal vivo in produzione.
- [x] **Firma dei webhook**: Stripe, Resend (svix, con finestra anti-replay di 5 minuti e confronto a
      tempo costante) e WhatsApp (HMAC + `timingSafeEqual`).
- [x] **Token**: nascono tutti da `gen_random_uuid()` o `randomUUID()` — preventivi, disiscrizione,
      conferma newsletter, recensioni, cancellazione prenotazione, form, survey. Il `Math.random()` delle
      gift card era **un caso isolato, non un pattern**: gli altri usi nel codice sono nomi di file
      pubblici, scelte casuali di foto e id di interfaccia, nessuno è un segreto.
- [x] **Segreti**: nessuna env non pubblica nei componenti client, nessuna chiave nei chunk serviti.

**Trovato e chiuso** (preventivi): l'accettazione controllava `stato = 'scaduto'`, uno stato che **nessuno
scrive mai** — non esiste un cron che lo imposti. Un preventivo oltre la data di scadenza restava quindi
accettabile per sempre, a un prezzo di mesi prima. Ora si guarda la **data**, non lo stato.

- [ ] ⚠️ Resta a carico di Francesco: **gli URL registrati presso Stripe e Meta** vanno provati come sono
      scritti là, non a mano su `www`. L'apex risponde 308 e per Svix un 3xx è una consegna fallita — è
      così che il webhook bounce di Resend è morto dal 9/7 al 23/8 (nota 27 in `CLAUDE.md`).

---

## A8 — Account e sessione ✅ FATTO (24/08)

Il grosso era stato chiuso il 18/08 (2FA obbligatorio su tutte le aziende, passkey, sonde di bypass).

**Verificato integro il resto** (`tests/probe-sessioni.mjs`). Il token è firmato e vive fino alla
scadenza, quindi la domanda era se i controlli si fidassero di quanto c'è scritto dentro. **Non lo
fanno**: il profilo si rilegge a ogni richiesta.
- [x] **Permesso revocato** → effetto **immediato** sulla sessione già aperta (403), senza aspettare che
      scada.
- [x] **Persona tolta dall'azienda** → non vede più i dati di quell'azienda.
- [x] **Utente eliminato** → il token non vale più (401).

---

## Cosa ha insegnato questo giro

**Le classi separate servivano davvero.** Ogni sotto-fase ha trovato cose che le altre non potevano
vedere: la sonda sui permessi (A1) è cieca sugli abusi fatti con richieste legittime, ed è lì che si
nascondevano i due problemi più gravi — il valore consumato senza pagamento (A2) e il contenuto
agganciato al sito di un altro (A3). Fossimo rimasti ad A1, avremmo dichiarato tutto a posto.

**Quello che regge non va toccato.** Metà delle sotto-fasi si sono chiuse senza modifiche: escalation di
ruolo, filtri PostgREST, XSS, cron, firme dei webhook, token, sessioni. Verificarlo dal vivo è servito
comunque: adesso è misurato, non presunto.

**Ogni fix va provato anche al contrario.** Le sonde verificano sempre il caso legittimo — la prenotazione
che deve passare, l'anteprima che deve funzionare, l'upload sulla propria scheda. Un controllo che blocca
tutto non è un fix, è un guasto peggiore del problema.

**Il sintomo inganna.** Due volte ho quasi accusato la cosa sbagliata: un invio email fallito sembrava un
webhook morto, e un 429 da rate limit sembrava un difetto della capienza. Prima di dare la colpa a
qualcosa, conviene togliere di mezzo ciò che gli sta davanti.

## Resta aperto

- ⚠️ **A carico di Francesco**: verificare che gli URL dei webhook registrati su **Stripe e Meta** siano
  su `www` e non sull'apex (vedi A7).
- 📌 **Loyalty**, per quando verrà acceso: mostrare il saldo solo a chi dimostra di possedere quell'email.
- 📌 **Stripe su booking ed eventi**, quando si collegherà: vale l'invariante 11 — nessun valore consumato
  prima del pagamento accertato.

Ogni buco chiuso è diventato un test in `tests/smoke/security.spec.js`, così non torna (Strato 1 di
`SECURITY.md` §0). Le sonde `tests/probe-*.mjs` si rilanciano a mano quando si tocca l'area relativa.

**Prossimo: il punto B** — revisione funzionale a lotti di 3-4 aree, prima quelle che i clienti usano
(Contatti, Richieste, Prenotazioni, Sito), poi quelle mai verificate sul campo (Loyalty, Shop, Survey,
Piano editoriale).

---

## Dopo il Punto A — 25/08/2026

**Il check una tantum non basta, e questa è la prova**: il Punto A è stato chiuso il 24
agosto. Il 25 è emersa la password WiFi di un cliente vero, leggibile da chiunque. Non era
un difetto di autorizzazione: nessuna delle otto classi lo copriva. **Il catalogo delle
classi non è chiuso** — averne battute otto non dice quante ne restano.

### Difetti trovati e chiusi il 25/08

| Cosa | Come usciva | Rimedio |
|---|---|---|
| Password WiFi, nomi rete, codici fiscali dei titolari | chiave **anon** (nel bundle di ogni pagina) → `select wifi_password from entita` | migration **082**: `GRANT SELECT` per colonna |
| Registrazione self-serve | `insert` su un profilo che un trigger aveva già creato → 500 + rollback | `upsert` con `onConflict: 'id'` |
| Backup distruggibili | la chiave che li scrive poteva cancellarli, ed è accanto a quella del database | pulizia facoltativa; chiave in sola scrittura |
| `landing-seo` | `select('*')` su route pubblica | colonne elencate |

### Classi esaminate in questa passata

- ✅ **Tabelle leggibili da un estraneo** — 26 chiuse, nessuna tabella privata esce
- ✅ **Colonne leggibili da un estraneo** — *era il buco*, ora chiuso
- ✅ **Segreti nei log di Vercel** — nessun valore stampato, solo etichette
- ✅ **Segreti nel bundle del browser** — nessuno (verificato confrontando la **coda** della
  chiave: i primi 40 caratteri di un JWT sono uguali per tutti e danno falsi positivi)
- ✅ **Codice server importato da componenti client** — nessuno
- ✅ **Campi jsonb serviti al pubblico** — 111 chiavi nei dati reali, nessuna sospetta
- ✅ **`select('*')` su route senza login** — 4 casi, nessuno restituisce il dato al client
- ✅ **Multi-tenant su 204 route** — nessuna perdita

### Trovato il 23/09/2026 — indirizzi di ritorno aperti

Cercando un errore di hydration: `?back=` finiva grezzo in `router.push` (evento, articolo) e in un
`href` (articolo). Un link con `back=https://altro-sito` faceva portare «Indietro» fuori dal sito, sotto
il nostro nome: un *open redirect*, la classe che A4 non aveva guardato (A4 cercava `javascript:`, non
destinazioni esterne). Chiuso con `lib/percorso-interno.js` — solo percorsi di questo sito — e provato
dal vivo col caso ostile (`back=//sito-malevolo.com` ignorato). SECURITY §0 invariante 19. Cercati gli
altri punti con `get('back')`: erano questi due.

### Classi che restano da guardare

- Cosa finisce nei log dei **fornitori** (Resend, Stripe, Meta), non solo nei nostri
- Il contenuto dei **file caricati** (un PDF con dati altrui in uno Storage pubblico)
- **Enumerazione**: quali endpoint rivelano l'esistenza di una risorsa dal codice di stato
- **Catena delle dipendenze**: Dependabot copre gli avvisi noti, non un pacchetto compromesso
- Un **attaccante che non conosce il sorgente** — è il limite strutturale di chi ha scritto
  il sistema, e la ragione per cui un pentest esterno non è sostituibile da me

### Il cambio di impostazione

Le sonde non si lanciano più a mano: `deploy.ps1` esegue `probe-security-sweep`,
`probe-rls-secondo-muro` e `probe-colonne-pubbliche` a **ogni deploy**. L'ultima ha un
elenco atteso di colonne fissato: **una colonna aggiunta domani a una tabella pubblica fa
scattare la segnalazione da sola**, che è il modo esatto in cui questi difetti sono nati.

---

## Aggiornamento 05/10/2026 — trovati rifacendo i contatti, non dalle sonde

Nessuno di questi era visibile alla sweep, che guarda cosa **esce** da una route con il token
sbagliato: qui il token era giusto e mancava il controllo successivo.

| Cosa | Com'era | Ora |
|---|---|---|
| Collaboratori senza permesso «Contatti» | la voce di menu era nascosta, la route rispondeva con la rubrica | controllo nella route |
| STOP su WhatsApp | toglieva il consenso al numero in tutte le aziende | solo nell'azienda che ha ricevuto il messaggio (⚠️ non provato dal vivo: serve Meta) |
| Conto delle disiscrizioni | l'id della newsletter arrivava dall'indirizzo, senza controllo | solo se è della stessa azienda, una volta sola |
| `/api/guest/book` | pubblica, senza consenso, mai chiamata | rimossa |
| `image_url` nelle newsletter | grezzo dentro `src` | `safeUrl` |
| «Anonimizza» | puliva solo la scheda | pulisce anche prenotazioni e invii dei moduli |
| Blocco di email rifiutato dal fornitore | contato fra le inviate, in silenzio | non contato, con allarme |

Dettaglio negli invarianti 22 e 23 di `SECURITY.md`. **Da fare**: una sonda in `deploy.ps1` per i
permessi dei collaboratori (oggi la sweep prova «un'altra azienda», non «stessa azienda, ruolo
senza permesso»): è la classe che ha lasciato passare il primo caso.

## Aggiornamento 10/10/2026

| Punto | Com'era | Com'è |
|---|---|---|
| Blocco «Form contatti» nell'editor | al super_admin proponeva i moduli di tutte le aziende: si poteva agganciare al sito di un cliente il modulo di un altro | `/api/form-builder?entity_tipo=&entity_id=` limita all'azienda del sito aperto |
| Anteprima dal vivo dell'editor | non esisteva | `postMessage` accettato solo dalla finestra madre, stessa origine, stesso percorso (invariante 24) |
| Posti e locandine nello slider eventi | — | forma e numero di schede da catalogo chiuso; destinazione del pulsante da `safeUrl` (provato con valori ostili) |
| Pannello Domini | dichiarava «Online» se rispondeva un server qualsiasi, e ci mandava i visitatori | ✅ 11/10: vale solo una risposta nostra (`rispondeDaNoi`); un dominio passato a un altro server fa sospendere il redirect |

Lavoro fuori dal codice, stesso giorno: la posta in arrivo di `oltrenova.com` è passata a un
inoltro Cloudflare. Chi controlla quell'account Cloudflare ora legge anche la posta di `info@`,
che riceve le email di Meta e di recupero di alcuni fornitori: un motivo in più per la chiave di
sicurezza fisica già in elenco (`SECURITY.md` §6).

## Aggiornamento 14/10/2026

| Punto | Com'era | Com'è |
|---|---|---|
| Caricamento immagini (`sharp`) | `sharp` riconosce il formato dal contenuto, non dal tipo dichiarato: un SVG compresso (svgz) sarebbe arrivato al suo lettore SVG (GHSA-wq5f-xc86-pv6w) | `firmaImmagine` in `parseUpload` fa passare solo byte con la firma di un formato ammesso; `sharp` portato alla 0.35.5. Provato con due caricamenti ostili (`probe-compressione-immagini.mjs`) — CLAUDE.md nota 30 |
| Regia del Club e consigli | — | route `/api/club/regia*` con `requireSuperAdmin` (404 agli altri); il filtro di cosa vede un cliente sta nella route (`clubPer`), non nel componente; le bozze dei consigli non escono dalla route a chi non è super_admin; pulsanti da catalogo chiuso (`AZIONI`), mai un indirizzo salvato |
| Cruscotto | — | escono solo conteggi e somme, mai nomi; lo staff riceve 403 |

Aperto: `next` 15.5.24 ha un advisory sull'ISR descritto come «self-hosted». Da verificare se
riguarda un deploy su Vercel prima di decidere il passaggio alla 15.5.28.
→ **Chiuso il 16/10** (vedi sotto).

## Aggiornamento 15/10/2026

| Punto | Com'era | Com'è |
|---|---|---|
| `/api/messages` (chat con la reception) | scrittura **pubblica senza limite** in qualunque struttura, e lettura di una conversazione per `session_id`, mentre nessuna pagina la usava più | **tolta** con tutta la chat (decisione di Francesco). Una porta pubblica che nessuno usa è solo superficie esposta. La tabella `messages` resta, vuota |
| Microfono | `Permissions-Policy: microphone=()` ovunque | `microphone=(self)` **solo su `/admin/*`** (`next.config.js`), per «Dimmi cosa cambiare»; i siti dei clienti restano senza. Verificato dalla sonda leggendo l'intestazione da pannello e da un sito |
| «Dimmi cosa cambiare» (`/api/pagine/[id]/ai-comando`) | — | `requireEntityAccess` (404 alla pagina di un'altra azienda), frase e pagina controllate **prima** di pagare l'AI, tetto dell'azienda (`chiamaAI`). All'AI non arrivano id né percorsi; la risposta è ricostruita da un catalogo chiuso (`ripulisciMosse`) e l'editor la applica con i controlli della scrittura sulla pagina. La route non scrive nel database. Provato con frasi ostili (`probe-interprete.mjs --vero`) |
| Resoconti per email | — | route `/api/resoconti*` con `requireSuperAdmin`; l'anteprima non contiene nomi; «Mandala a me» scrive solo alla casella di chi preme |
| Pagamento online promesso | `puoIncassare` diceva sì appena esisteva un conto Stripe, anche a metà | chiede a Stripe lo stato vero del conto (memoria 10 minuti) |

## Aggiornamento 16/10/2026

| Punto | Com'era | Com'è |
|---|---|---|
| `next` | 15.5.24, due avvisi Dependabot «medi» (GHSA-4jqv-mc3x-m676, GHSA-mcj8-r9mp-w47p) | **15.5.27**. Nessuno dei due ci colpiva: il primo vale solo per il Pages Router su un server proprio (Vercel escluso dall'avviso), il secondo per una pagina «prendi-tutto» alla radice insieme a pagine statiche o ISR — non ne abbiamo (niente `pages/`, niente `generateStaticParams`/`revalidate`). Aggiornato lo stesso: un avviso sempre acceso smette di essere letto. Scelta la 15.5.27 (30/09) e non la 15.5.28, uscita da due giorni. `npm audit`: 0 |
| `SENTRY_DSN` su Vercel | residuo di un servizio rimosso il 23/07, nessuna riga lo leggeva | tolto da produzione e anteprima; tolto da `PROGETTO.md` (`probe-documenti`: il documento corrisponde) |
| Backup notturno | le tabelle del Club non erano esportate (corretto il 15/10) | il giro del 16/10 alle 03:00 è finito «ok» col codice nuovo. Il contenuto dell'archivio non è stato aperto: la chiave che legge R2 di proposito non sta su questo PC |

### Enumerazione — la classe «resta da guardare» del 25/08, guardata il 16/10

Sonda nuova **`tests/probe-enumerazione.mjs`** (in `deploy.ps1`): per le 104 porte con un
identificativo nell'indirizzo, chiede come l'azienda B e come chi non ha fatto login, con un
identificativo inventato e con uno vero dell'azienda A, e pretende due risposte identiche. Sulle
porte pubbliche il confronto si fa con una cosa non pubblicata. In più fotografa i dati di A
prima e dopo (cancellati? modificati?), cerca righe nuove dell'azienda B nate da oggetti di A
(«duplica», «pianifica», commenti) e controlla il rovescio: il titolare di A legge le sue cose.

| Punto | Com'era | Com'è |
|---|---|---|
| `POST /api/users/[id]/resend-invite` | 🔴 controllava solo che chi chiama fosse un titolare: **chiunque** poteva far partire un'email «imposta la password» verso l'account di qualunque utente della piattaforma (il link arrivava alla vittima, non a chi chiede: niente furto dell'account, ma email a nome nostro a chiunque e un modo per sapere quali utenti esistono) | un titolare rimanda l'invito solo agli utenti della sua azienda; gli altri ricevono la stessa risposta di un utente che non esiste. **Se sia mai stato usato non si può dire da qui**: gli invii non lasciano traccia nel nostro database. La cronologia sta su Resend (Emails, oggetto «Il tuo link per accedere a OltreNova»), per il tempo per cui la conserva; il buco richiedeva comunque un account titolare e l'identificativo dell'utente da colpire |
| `POST /api/piano-editoriale/[id]/commenti` | si poteva agganciare un commento al post di un'altra azienda (non lo vedeva nessuno: restava con l'azienda di chi scrive) | il post dev'essere della propria azienda, altrimenti 404 |
| `GET /api/guest/vetrina/[id]` + dettaglio di un elemento | una vetrina in **bozza** mostrava a chiunque il suo titolo; i suoi elementi pubblicati si aprivano dalla pagina di dettaglio | in bozza risponde come una che non esiste, anche nel dettaglio (salvo l'anteprima firmata) |
| Pagine, sezioni, vetrine, elementi, versioni del sito, traduzioni, «Chiedi/Riscrivi/Dimmi» dell'AI | cercavano l'oggetto **prima** del login e rispondevano «Pagina non trovata» a un id inventato, «Non trovato» o «Non autorizzato» a uno vero: da fuori si capiva cosa esiste | `requireEntityRecordAccess(request, tabella, id)` in `lib/server-auth.js`: prima il login, poi «esiste ed è tuo?» con una risposta sola. `verifica-regole` la riconosce |

Nessun dato di A è risultato letto, modificato, cancellato o copiato da B in produzione prima
della correzione. Non coperte di proposito (scritte nella sonda col motivo): i link con un segreto
(token di modulo, preventivo, recensione), le pagine pubbliche di un sito, i domini (una riga di
prova la prenderebbe il giro di manutenzione), le porte della sola piattaforma.

## Aggiornamento 17/10/2026 — primo giro dell'agente che prova a entrare

Chiesto da Francesco (la sicurezza è la priorità assoluta, [[feedback_sicurezza_priorita]]): un agente
che prova a **entrare** nel sistema vivo come un attaccante, non solo a leggere il codice. Primo giro
con Ettore come cervello (la chiave AI non è su questo PC: un loop LLM autonomo è il passo dopo, da
valutare col costo — [[project_agente_attaccante]]). Bersaglio: il **dirottamento** (mass-assignment
visto da chi attacca), che le sonde non coprivano. Due aziende di prova A e B; B prova a scrivere in A.

| Punto | Com'era | Com'è |
|---|---|---|
| `POST /api/newsletter` | 🟠 non validava `entity_id`: l'azienda B poteva creare una propria newsletter mettendo l'`entity_id` di A. L'archivio pubblico (`/api/newsletter/archive/[tipo]/[id]`, che l'ospite apre) filtra **solo per entità**, non per azienda: una volta inviata (status 'sent'), il contenuto di B sarebbe comparso nelle pagine pubbliche del sito di A. Non furto di dati di A — pubblicazione del contenuto di B sul suo sito, come il buco form-builder (nota 60) e eventi/risorse (24/08). Il **PATCH** della stessa route lo controllava già; il POST no | `resolveAziendaId` + `entitaDellaAzienda` nel POST, come ovunque: `entity_id` fuori dalla propria azienda → 404. Mai sfruttato: nessuna newsletter con entità di un'altra azienda nei dati |

Provato e **non** ceduto (la sonda li tiene): B non crea contatti/eventi/risorse/sezioni/offerte/
recensioni/articoli/automazioni/moduli nell'azienda o sul sito di A; B non si fa super_admin, non cambia
la propria azienda, non si mette `plan`/`tipo` di sistema sull'entità, non si alza il budget AI; le liste
(`?azienda_id=`, `?entity_id=`) non escono dall'azienda di chi chiede (il ramo query vale solo per
super_admin). E il titolare di A crea le sue cose (la difesa non chiude il caso buono). Sonda
`tests/probe-dirottamento.mjs`, in `deploy.ps1`.

⚠️ Il primo giro ha anche mostrato un difetto della **sonda** prima che del codice: un marcatore condiviso
fra A e B dava tre falsi allarmi (B leggeva le proprie liste, che il test stesso aveva riempito). Corretto
con un marcatore scritto solo in A. Una sonda che misura la cosa sbagliata è rumore, non difesa.

## Aggiornamento 17/10/2026 — secondo giro: codice ostile nell'HTML altrui (XSS stored)

Classe **XSS stored** (gravità 3 nell'ordine di Francesco: codice ostile nell'HTML di chi apre il sito).
Un'azienda mette un payload in un campo di un blocco, in un URL o nel corpo di un articolo; se scappasse,
girerebbe nel browser del visitatore. **Nessun buco trovato — le difese reggono su tutte le vie pubbliche.**

| Via pubblica | Difesa, confermata leggendo e provando dal vivo |
|---|---|
| Testo dei blocchi (ricco) | `lib/testo-ricco.js`: escapa tutto e riaccende solo b/strong/i/em/u/s/br/small/sup/sub/mark, **senza attributi** → niente `href`, niente `on*` |
| URL dei blocchi (CTA, hero, pulsanti) | `safeUrl`/`siteHref` (`LandingBlockRenderer`): whitelist http/https/mailto/tel/`/`/`#`; `javascript:`/`data:` → `#` |
| Video | `getEmbedUrl`: estrae **solo** l'ID YouTube/Vimeo con regex e ricostruisce un URL fisso; altro → nessun iframe |
| Blocco «Codice incorporato» | `<iframe srcDoc sandbox="allow-scripts allow-popups allow-forms allow-presentation">` **senza `allow-same-origin`**: lo script gira isolato, non tocca il nostro DOM/cookie/sessione. Provato con uno script che tenta `top.__pwned` e il titolo della pagina madre: fallisce |
| Corpo del blog (HTML ricco vero) | `sanitize-html` (`lib/articolo-pubblico.js`): niente `script`/`iframe`/`form`/`on*`, schemi solo http/https/mailto/tel, `style` ristretto con regex (niente `url()`/`position`) |

Sonda nuova **`tests/probe-xss-pubblico.mjs`**, in `deploy.ps1`: crea un'azienda `ZZ`, mette i payload,
apre le pagine **col browser vero** (nessun `alert`, `window.__xss` assente, nessun errore), controlla il
**DOM renderizzato** (nessun `<a>`/`<iframe>` verso `javascript:`/`data:`, CTA ostile a `#`, nessun iframe
del video), verifica l'embed murato, e prova il blog sulla funzione vera col caso ostile.

⚠️ **Non si cerca un payload nel corpo grezzo con un grep**: i dati dei blocchi viaggiano anche nel pacchetto
serializzato per il browser (JSON inerte) e un testo reso da React compare escapato — `alert('…')` e
`onerror=` ci stanno come **testo**. La prima stesura della sonda dava 6 falsi rossi proprio per questo:
corretta a misurare il browser e il DOM. Terza volta che una sonda misurava la cosa sbagliata (note 36, 45).
