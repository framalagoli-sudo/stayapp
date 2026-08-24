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
