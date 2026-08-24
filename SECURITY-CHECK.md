# Check di sicurezza — roadmap del punto A

> Stato al 23/08/2026. Il punto **A** è la revisione di sicurezza; il punto **B**, che viene dopo, è la
> revisione funzionale area per area (cosa manca o non torna per un cliente vero).
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

## A2 — Logica di valore: denaro, crediti, posti 🔶 PARZIALE

**Domanda**: si può creare valore dal nulla, o distruggere quello di un altro, **senza mai violare un
permesso**? È la classe che A1 non vede, perché ogni singola richiesta è legittima.

**Fatto (23/08)** — shop e fedeltà: punti e gift card venivano consumati alla *creazione* dell'ordine,
non al pagamento. Ordini mai pagati fabbricavano punti; chi conosceva un codice gift card lo azzerava
senza pagare; lo sconto non arrivava nemmeno a Stripe. Ora tutto passa da `finalizzaLoyaltyOrdine`,
idempotente, agganciata al pagamento accertato. Sonda: `tests/probe-loyalty-denaro.mjs`.

**Da fare** — gli altri flussi dove qualcosa vale denaro o è limitato:
- [ ] **Booking risorse**: si può occupare o liberare uno slot altrui? Prenotare oltre la capienza?
      Cancellare la prenotazione di un altro conoscendo un id? Doppia prenotazione dello stesso slot
      inviata in parallelo (corsa)?
- [ ] **Eventi**: i posti (`event_bookings`) si esauriscono davvero? Il controllo "posti disponibili"
      regge a richieste simultanee, o due persone prendono l'ultimo posto?
- [ ] **Preventivi**: il token pubblico di accettazione è indovinabile? Si può accettare o modificare
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

## A4 — Injection nei filtri e XSS nei contenuti ⬜ DA FARE

**Domanda**: un dato scritto da un utente può cambiare il senso di una query o eseguire codice nel
browser di qualcun altro?

- [ ] **Filter injection PostgREST**: input grezzo dentro `.or()`, `.filter()`, `.ilike()`,
      `dati->>${chiave}` — le vetrine hanno filtri costruiti dinamicamente dai preset, è il posto più
      esposto.
- [ ] **XSS**: blocchi HTML/embed dell'editor pagine, contenuti del blog, campi liberi che finiscono nel
      sito pubblico. Verificare che `safeUrl` e DOMPurify coprano ogni percorso, non solo quelli noti.
- [ ] **Prompt injection** nel chatbot e nell'AI builder: un contenuto ostile del cliente può far dire
      o fare al modello qualcosa che non deve (es. rivelare dati di contesto).

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

## A6 — File e caricamenti ⬜ DA FARE

**Domanda**: cosa entra davvero quando qualcuno carica un file?

- [ ] Tipo e dimensione verificati **server-side** (non solo nel browser).
- [ ] Un SVG con script dentro, servito dallo stesso dominio, diventa XSS.
- [ ] Il percorso di destinazione è scopato per azienda, o si scrive nella cartella di un altro?
- [ ] `/api/upload` risulta senza autenticazione: capire se è uno stub morto o una porta aperta.

---

## A7 — Segreti, webhook e cron ⬜ DA FARE

**Domanda**: chi può far eseguire alla piattaforma qualcosa fingendosi un servizio esterno?

- [ ] Ogni route `cron/*` controlla davvero `CRON_SECRET`? (la convenzione c'è, va verificata una per una)
- [x] I webhook verificano la **firma**: Stripe ✅ e Resend ✅ (svix, con finestra anti-replay di 5
      minuti e confronto a tempo costante); resta WhatsApp.
- [ ] ⚠️ **Gli URL registrati presso i fornitori** vanno provati come sono scritti là, non a mano su
      `www`: l'apex risponde 308 e per Svix un 3xx è una consegna fallita — è così che il webhook bounce
      di Resend è morto dal 9/7 al 23/8 (nota 27 in `CLAUDE.md`). Da ricontrollare per Stripe e Meta.
- [ ] Nessun segreto raggiunge il browser né compare in una risposta di errore.
- [ ] I token in tabella (preventivi, disiscrizione, conferma newsletter) sono generati con
      `crypto`, non con `Math.random()` — l'errore trovato oggi nelle gift card **va cercato altrove**:
      è un pattern, non un caso isolato.

---

## A8 — Account e sessione 🔶 IN GRAN PARTE FATTO

Il grosso è stato chiuso il 18/08 (2FA obbligatorio su tutte le aziende, passkey, sonde di bypass).

**Resta da guardare**:
- [ ] Recupero password e inviti: il link scade? è riutilizzabile? cambiare email annulla le sessioni?
- [ ] Che succede alle sessioni attive quando un utente viene rimosso dall'azienda o gli si tolgono i
      permessi — restano valide fino alla scadenza?

---

## Ordine consigliato

1. ~~**A3** (mass assignment)~~ ✅ fatto 24/08 — l'escalation di ruolo reggeva, l'entità altrui no.
2. ~~**A5** (abuso a volume)~~ ✅ fatto 24/08 — i limiti sono veri; scoperte 3 route email senza freno.
3. **A2 restante** (booking ed eventi) — il booking è l'unico di questi moduli davvero in uso. ← **prossimo**
4. **A7** (token da `Math.random`) — ricerca del pattern, veloce.
5. **A4** e **A6** — più lunghi, meno probabili nell'uso attuale.
6. **A8** — completamento.

Ogni buco chiuso diventa un test in `tests/smoke/security.spec.js`, così non torna (Strato 1 di
`SECURITY.md` §0).
