---
name: todo-prossima-sessione
description: "Da dove riprendere — l'offerta del Furgone da confermare col cliente, Garage 22 e il nome su Stripe, poi il primo incasso vero"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-15T09:01:34.300Z
---

# Si riprende da qui

## ▶️ 15/09/2026 — fatto stamattina

- **Diagnosi domini chiusa**: il gemello (con/senza www) dice `manca` →
  «aggiungi», `altrove` → «sostituisci» col record da cancellare,
  `certificato` → niente da fare. Prima diceva sempre «manca un record».
- **Rete di sicurezza del redirect, che il 14/09 avevo dichiarato e NON
  esisteva** (il cron rimisurava solo i pendenti). Opzione A di Francesco →
  [[reference_un_sito_un_indirizzo]]. Anche: un dominio attivo non viene più
  declassato da una prova a vuoto aprendo la pagina Domini.
- ⚠️ **Correzione a quanto scritto ieri**: `fondaconarni.com` NON ha lo stesso
  guasto di metodotvb. Lì il record A dell'apex **manca** (va aggiunto); su
  metodotvb c'è e punta ad Aruba (va sostituito).

### ✅ Migration 117 eseguita (15/09) e lavoro pubblicato
Migration eseguite: fino alla **117**. Live e provato: punto focale sulla
copertina del sito (striscia dell'app del QR), forma + punto focale sul blog
(senza forma resta la fascia da 340px; con forma la foto entra intera nello
schermo), valori ostili → null in creazione, modifica e PATCH entità.
`prodotti.immagine_focal` esiste ma NON è usata: aspetta la vetrina dello shop.

### 🛒 PROSSIMO LAVORO PROPOSTO (non iniziato): la vetrina dello shop
Nell'editor del sito NON esiste un blocco Shop/Prodotti, e `ShopWidget` non è
montato da nessuna parte (ultimo tocco: migrazione a Next, giugno). Pannello,
ordini, pagamento Stripe e pagine esito ci sono; un visitatore non può vedere
né comprare. Da fare: blocco nell'editor + render + PROVA DI UN ACQUISTO VERO
(serve Francesco: pagamenti reali). Poi forma schede + punto focale prodotti.

### ✅ Fatto il 15/09 pomeriggio (live)
- **Una sola galleria** (`GalleriaFoto`) al posto di 5 copie: riordino, Unsplash,
  4 MB, errori nella pagina, un file sbagliato non ferma gli altri.
- **Miniature** (piatto, attività, escursioni): `useCaricaFoto`, stessa logica,
  aspetto invariato. Attività ed escursioni non controllavano il peso affatto.
- ⛔ **Le foto dei prodotti non si erano MAI potute caricare**: la route
  `minisito-image` non conosceva `entity_type=prodotto` (400). Corretto.

### ⚠️ Da dire / decidere con Francesco
- **Lo shop non ha una vetrina sui siti.** `ShopWidget` esiste ma nessuna pagina
  né blocco lo monta: pannello, carrello, pagamento e ordini ci sono, il catalogo
  pubblico no. È una funzione che un cliente non può usare davvero.
- Punto focale per singola foto nelle gallerie: richiede di cambiare la forma dei
  dati (elenco di indirizzi) letta da più punti → va chiesto prima.
- `RestaurantSection.jsx` ha ancora il limite a 2 MB ma nessuna route lo monta.

## ▶️ 14/09/2026 — SI RIPARTE ESATTAMENTE DA QUI

Tutto quello di oggi è **live e verificato in produzione**. Migration eseguite:
fino alla **116**. Nessuna migration in sospeso.

### La domanda aperta, da fare a Francesco appena si riprende
Il gruppo "libero" dei formati foto è finito. Restano **tre strade**, lui sceglie:

1. **Il secondo componente condiviso** — per le **gallerie a più foto**
   (prodotti shop, risorse prenotabili, gallery entità) e le **miniature dentro
   liste fitte** (foto del piatto nel menu, 56×56 in una riga densa).
   ⚠️ NON infilarci dentro `CampoImmagine`: snaturerebbe la pagina in cui il
   cliente lavora ogni giorno. Serve una forma diversa. Vedi
   [[reference_caricamento_foto]].
2. **Le migration per i formati mancanti** — servono a me le colonne per:
   copertina dell'entità (`cover_focal`/`formato` su `entita`), copertina del
   blog, foto dei prodotti. `cover_focal` oggi esiste **solo** su `eventi`
   (migration 083). Le migration le esegue lui.
3. **Il messaggio impreciso della diagnosi domini** (rimasto in coda due volte,
   lui ha detto «poi vediamo»): dice «manca un record nei DNS» anche quando il
   record **c'è ma punta altrove** — è successo su `metodotvb.it`, che punta ad
   Aruba invece che a Vercel, e ha fatto dubitare Francesco del pannello.
   Da far dire: «c'è un record ma porta da un'altra parte», col valore trovato.

### ⚠️ In attesa di Francesco (dominio)
**`metodotvb.it` senza www NON funziona**, e non è propagazione: il nameserver
autoritativo di Aruba pubblica **un solo** record A → `62.149.128.40` (Aruba,
risponde IIS sulla porta 80 e rifiuta la 443). Il `www` è giusto (CNAME Vercel,
200). Deve sostituire quel record A con i **due** che chiede Vercel — le due
righe che gli sembravano un doppione nel pannello **non lo sono**, servono
entrambe. Valori da leggere in `Admin → metodotvb → Domini` (li chiede a Vercel
dal vivo, mai scriverli nel codice). Stesso identico problema su
**`fondaconarni.com`** (apex irraggiungibile, www a posto). Garage22 è a posto.
Quando dice che ha salvato → rifare il giro dai tre resolver.
⚠️ Il resolver locale di Telecom **falsifica `nslookup`**: usare
`https://dns.google/resolve?name=…&type=A`. Vedi [[reference_un_sito_un_indirizzo]].

### Fatto oggi, tutto live
- **Un sito, un indirizzo** — se il cliente ha un dominio, il nostro percorso e
  il sottodominio ci mandano lì (307, query preservata, app del QR compresa), e
  il **QR si incide sul suo dominio**. Sistemate sitemap ed email che
  dichiaravano un indirizzo diverso dal canonical. → [[reference_un_sito_un_indirizzo]]
- **Caricamento foto**: `CampoImmagine` (campo unico) su copertina blog, logo +
  logo negativo + copertina delle Info dei tre tipi, Foto+Testo. Il peso massimo
  è **4 MB misurati** (sopra risponde 413 la piattaforma). Trovato che **solo le
  strutture non avevano il campo del logo negativo**, pur avendo colonna, route
  e sito. → [[reference_caricamento_foto]]
- **La forma la sceglie il cliente**: selettore condiviso su evento, **Team**
  (niente più cerchio obbligatorio), Foto+Testo, Carosello, Card paragrafi.
  ⚠️ Senza scelta resta il rapporto storico: i siti online non cambiano faccia.
- **Difetto ricorrente trovato due volte**: la foto si poteva solo *incollare*
  come indirizzo (blocco Team, poi Card paragrafi). Guardare gli altri blocchi.
- **Test reso meno fragile**: `public-render.spec.js` chiedeva `/r/garage22` sul
  nostro dominio → dal 14/09 fa 307, quindi due avvii a freddo, e gli smoke
  partono 15s dopo il deploy. A freddo una pagina impiega ~9s, a caldo ~1s, e il
  timeout era 10s: ha bocciato un deploy sano. Ora chiede l'indirizzo vero.

### Lezione da non ripetere
[[feedback_vincolo_o_scelta]] — avevo scritto che il formato «non avrebbe senso»
sul Team «perché la cornice è un cerchio fisso». Era una riga di CSS, non un
vincolo: una scelta di prodotto, che spetta a lui.

---

## ✅ RIPRISTINO PROVATO E RIUSCITO (13/09/2026)

Dettaglio in [[reference_backup_e_ripristino]] e INCIDENTE.md §3.2.
✅ **Migration `078b` e `115` eseguite in produzione il 13/09** e verificate:
4 tabelle e 12 colonne al loro posto, dati invariati, servizio in piedi. Da qui
le migration descrivono di nuovo la realtà. **Migration eseguite: fino a 115
(+078b).**

**Chiuso davvero il 13/09 sera**: rifatto su un secondo progetto e passata per
intero la lista di `tests/verifica-ripristino.mjs` — **24 controlli su 24**,
scritture comprese (un ospite manda una richiesta, il pannello crea e modifica,
il contenuto compare sul sito). Francesco ha anche guardato a mano.
Produzione mai sfiorata: righe invariate, zero tracce, sito 200.

**Resta:**
1. **Francesco**: cancellare il progetto Supabase di prova (autorizzato il
   13/09) e svuotare `tests/.env.ripristino`. Contiene una copia completa dei
   dati personali dei clienti.
2. ✅ **Immagini provate leggendo dall’archivio su R2** (13/09): copia dei file
   **e riscrittura degli indirizzi nel database**, senza la quale un ripristino
   vero riporta i siti con le foto morte. **Niente resta non provato.**


## ▶️ (storico) PROVA DI RIPRISTINO — come si è arrivati qui (12/09/2026)

Lo script c'è ed è provato: **`tests/ripristino.mjs`** (schema → account →
dati → verifica, tutto cronometrato; la sicura che rifiuta la produzione è
stata provata in tre casi). Manca solo quello che richiede l'account di
Francesco. **Claude non può fare questi due passi**: le chiavi R2 non esistono
in locale (`vercel env pull` scrive `[SENSITIVE]`) e nessuna route del pannello
scarica gli archivi — l'unica che esiste li *crea*.

**Passo 1 — Francesco: l'archivio.** Cloudflare → R2 → bucket → l'ultimo
`backup-*.json.gz` → Download. Poi dire a Claude il percorso del file.
→ Claude lancia `node tests/verifica-backup.mjs <file>`.
⚠️ Finito, **cancellare il file**: è il database dei clienti in chiaro.

**Passo 2 — Francesco: il progetto di prova.** Supabase → New project, piano
gratuito, regione EU (`oltrenova-ripristino`). Segnare la password del database
(si vede una volta sola). Creare `tests/.env.ripristino` — è in .gitignore,
**i valori non passano dalla chat**:
```
RIPRISTINO_SUPABASE_URL=https://xxxxx.supabase.co      (Settings → API)
RIPRISTINO_SERVICE_ROLE_KEY=...                        (Settings → API)
RIPRISTINO_DB_URL=postgresql://postgres:PWD@db.xxxxx.supabase.co:5432/postgres
                                                       (Settings → Database → URI)
```

**Passo 3 — Claude**: `node tests/ripristino.mjs <archivio> ` (simula) e poi
`--esegui`. Poi **la prova vera**, che non è «le righe sono entrate»: puntare
l'app locale al progetto ripristinato (env var) e **aprire il sito di un
cliente ed entrare nel pannello**.


Domanda a cui la prova risponde (aperta da luglio): **si può imporre l'id a un
account ricreato?** Se no, il ripristino deve riscrivere gli id nei profili e
in tutto ciò che li riferisce. Lo script lo misura e lo dichiara.
Vedi [[project_backup_lacune]], [[reference_backup_e_ripristino]].

## ✅ Migration 114 eseguita (12/09), e provata in produzione

Cambio indirizzo dal pannello → il vecchio risponde **308** verso il nuovo,
l'inesistente **404**. Provato con un evento di prova, poi cancellato.
Migration eseguite: fino alla **114**. Vedi [[reference_eventi_conclusi]].

⚠️ Da proporre a Francesco: l'evento di Garage22 «A cena con Chiara e Daniele»
ha ancora indirizzo `a-cena-con-sara-e-chiara`. Ora si può correggere senza
rompere niente — è un dato di un cliente, quindi si chiede prima.

## Fatto l'11/09 (live, verificato in produzione)

- **Eventi**: un evento finisce alla sua fine (non all'inizio), dopo non si
  prenota più (route + pagina), e il blocco eventi del sito mostra i **passati,
  acceso di default** (deciso da Francesco). → [[reference_eventi_conclusi]]
- **Orari che scivolavano**: modulo evento e newsletter programmate perdevano
  2h a ogni salvataggio. Corretto → [[reference_fuso_orario]].

### ⚠️ Da chiedere ai clienti (orari già scivolati: il DB non si ripara da solo)
- **Garage22, «Listening con Federico» del 17/09**: in DB 18:00–21:30. È l'ora
  giusta? Se era stato salvato più volte potrebbe essere scivolato (es. 20:00).
- **inLingua, Open Week**: 14/09 14:51 → 18/09 14:52 — minuti strani, sembrano
  l'ora di creazione. Chiedere orari veri: dalla fine dipende quando si chiude.
- **Offerte**: variante del difetto non corretta (istante sbagliato di 2h ma
  stabile). Decisione di Francesco se sistemarla — cambia l'ora mostrata.

### Email degli eventi: ora giusta (11/09, live) — manca la prova sull'email vera
Le route funzionano in produzione, ma **nessuno ha letto un'email vera**. Prova
di Francesco: evento di prova nell'azienda StayApp Development alle 20:30 →
prenotarlo con la sua email → la conferma deve dire «alle ore 20:30».
Poi cancellare evento e prenotazione.

### Fatto il 12/09
- **Email di conferma provata davvero**: evento di prova alle 20:30 → email a
  Francesco. Nella nota CRM scritta dalla produzione: «alle ore 20:30» (prima
  18:30). Tutto cancellato dopo, contatto rimesso com'era.
  ⚠️ La scrittura nel CRM avviene in `after()`, **dopo** la risposta: una
  pulizia fatta subito non trova ancora la riga.
- **Categoria orari chiusa + guardia** → [[reference_fuso_orario]] §12/09.
- **Blog automatico**: cercava `start_date` (colonna inesistente) → corretto.
- Garage22 ha corretto l'orario: il Listening ora è 20:30–23:30, salvato col
  codice nuovo. inLingua Open Week era **di prova**: nessuna telefonata.

### Trovato e NON toccato
- **Le due offerte già in archivio** hanno l'istante spostato di 2h (salvate col
  vecchio modo). Il codice ora salva giusto; quelle due righe no. Sono
  «Week end di Natale sconto 30%» e «Nuova offerta», entrambe con aria di
  prova: da guardare con Francesco prima di toccarle.
- **Avviso React «unique key prop»** sull'app di `deborahresinart`, solo in
  modalità sviluppo. Verificato il 12/09 che **non** viene dalle modifiche di
  oggi (provato con e senza, stesso dev): è preesistente, in
  `LandingBlockRenderer`.

## ✅ Archivio completo — resta da provare il ripristino

Chiuso il 09/09 pomeriggio: nel backup ora ci sono i **15 account di accesso**
e le **62 immagini** dei clienti, più una copia mensile tenuta un anno. Provato
in produzione. Due difetti trovati strada facendo: il pulsante «esegui backup
adesso» era rotto dal 29/08 (il bucket lock vieta di riscrivere il file del
giorno) e il cron non dichiarava un tempo massimo.

**Il ripristino resta da provare** — ora però su un archivio completo, che era
il punto. Piano e prima domanda a cui rispondere in [[project_backup_lacune]].

⚠️ **Due verifiche piccole prima di considerarlo chiuso davvero:**
1. **Francesco**: scaricare l'ultimo `backup-*.json.gz` dal bucket R2 su
   Cloudflare e lanciare `node tests/verifica-backup.mjs <file>` — nessuno ha
   ancora aperto un archivio **vero** fatto dal codice nuovo (in locale le
   chiavi R2 non si possono avere: `vercel env pull` le maschera). Poi
   cancellare il file: è il database dei clienti in chiaro.
2. La notte fra il **9 e il 10 settembre** è la prima volta che il cron gira col
   codice nuovo. Se fallisce arriva un'email.

Sessione chiusa il **9 settembre 2026** (sera). Tutto live e provato in
produzione; migration eseguite l'8: **112**, **113** — il 9 **nessuna**, niente
da eseguire su Supabase. Dettaglio in [[project_session_2026_09_08]].

## Fatto il 09/09

- **sharp non è più una fortuna.** Era una `optionalDependency` di Next: npm poteva
  saltarla **senza errore** e la compressione delle immagini sarebbe morta muta.
  Ora è dichiarata, e `tests/probe-compressione-immagini.mjs` se ne accorge —
  provata anche al contrario, togliendo sharp. Vedi [[reference_guasti_silenziosi]].

- **Il forfait vale solo per le sue date.** Il ponte 5→9 a €850 veniva applicato
  anche a chi ne prenotava due giorni: pagava €850 invece di €240. Ora solo le
  date esatte lo prendono, e chi ne sceglie una parte vede un riquadro con le
  date giuste e il prezzo, che tocca per impostarle. Vedi
  [[reference_offerte_risorse]].
- **I domini non si perdono più, da nessuna delle quattro porte.** La riga in
  `domini` spariva anche quando Vercel non era stato liberato, e l'hostname
  restava agganciato e invisibile. Corretto cancellando un'entità, cancellando
  un'**azienda** (che porta via tutto in cascata) e nel giro del cron. Chiusa
  anche la radice: i sottodomini nascono **`attivo`** e la manutenzione guardava
  solo i pendenti, quindi le righe orfane non le vedeva nessuno.
  **Pulizia**: erano 77 hostname su Vercel contro 15 righe nel database — 56
  staccati, residui delle sonde più `futura-club-spiagge-bianche`. Ora zero
  orfani, e il ciclo si richiude da solo. Vedi [[reference_domini_vercel]].
- **Patch di sicurezza**: `next 15.5.24` + `sharp 0.35.4`. Un RCE non
  autenticato che **questa volta ci riguardava davvero** — `/_next/image` era
  vivo e processava AVIF anche se `next/image` non è importato da nessuna parte.
  Vedi [[reference_triage_next_vulns]] §09/09.

## 🗑️ Futura Vacanze Spa — da cancellare (deciso da Francesco il 09/09)

Dentro c'è **una sola entità**, `piano-editoriale-futura-vacanze` (attività),
con 0 pagine, 0 offerte, 0 contatti, 0 eventi, 0 prenotazioni. E il suo
indirizzo `piano-editoriale-futura-vacanze.oltrenova.com`, che ora viene
staccato da Vercel **prima** che l'azienda sparisca.

Due cose da sapere (la terza è già fatta: `futura-club-spiagge-bianche` è stato
staccato da Vercel il 09/09 insieme agli altri 55 orfani):
1. L'indirizzo dell'entità viene staccato **prima**, e se Vercel non risponde la
   cancellazione si blocca invece di perderlo.
2. I **6 account restano attivi** e possono ancora entrare: Futura
   (admin_azienda), FV Hotels, Francesca Del Monte, Giulia Valletta, Fra Del
   Monte, Angela Salgarelli. Si tolgono da `/admin/users`, anche dopo la
   cancellazione. Vedi [[reference_domini_vercel]].
3. Se Vercel non risponde la cancellazione **si blocca** con un messaggio: è
   voluto, si riprova.

## ⚠️ Da chiedere a un cliente

1. **L'offerta «Ponte dell'8 dicembre» del Furgone (Automax).** È su «per tutto
   il periodo»: dal 5 al 9 dicembre costa **€850** invece di €600 di listino, e
   ora vale **solo** per quelle date esatte. **Confermare col cliente che
   intendesse €850 per tutto il ponte** e non €850 al giorno.

2. **Garage 22 e Stripe.** Prima corregge il nome dal pannello Stripe
   (Impostazioni → Dati dell'attività) con la ragione sociale **esatta della
   visura**, poi carica la visura. Rifare l'iscrizione dal nostro pannello senza
   correggere il nome riporta al punto di partenza — è già successo due volte.
   Vedi [[reference_stripe_onboarding_campo]].

3. **Il nome pubblico su Stripe** (`Impostazioni → Dati dell'attività` e
   `Impostazioni → Connect → Branding`, nome **e** logo): chi si iscrive legge
   «FRANCESCO MALAGOLI» mentre sta per consegnare IBAN e documento.

4. **Il primo incasso vero non è mai avvenuto.** Quando Garage 22 sarà attivo:
   una prenotazione da due euro, pagata davvero. Tre verifiche: soldi sul suo
   cruscotto Stripe · email di conferma · prenotazione che risulta pagata.

## Fatto l'08/09 (live e provato)

- **Lista d'attesa eventi** completa (iscrizione, promozione, conferma che parte).
- **La conferma di prenotazione non partiva per nessuno** — era spenta su tutti
  e quattro gli eventi veri. Migration **112**.
- **Booking a giornate**: il calendario nascondeva le prenotazioni e lo stesso
  furgone si vendeva due volte nello stesso giorno →
  [[reference_intervalli_date_booking]]. E «notti» ora segue la risorsa.
- **Offerte sulle risorse**: valevano solo per gli slot orari →
  [[reference_offerte_risorse]]. Migration **113**.
- **Eventi**: contatti nel CRM con tag, bottoni comprensibili, pannello degli
  invii con testo e spunte, descrizione formattabile.
- **15 contatti storici recuperati** nel CRM (`tests/recupera-contatti-eventi.mjs`).
  ⚠️ **Non iscritti alla newsletter**, deciso da Francesco: la formula che
  avevano accettato diceva «per gestire questa prenotazione», e 5 non hanno
  nemmeno quella. Se servirà: invito col double opt-in, che esiste già.

## Poi

**Il ripristino del backup non è mai stato provato**, e viene **dopo** aver
completato l'archivio (vedi la priorità in cima): `verifica-backup.mjs` dimostra
che l'archivio è leggibile e completo *rispetto alle tabelle che elenca*, non
che da lì si torna in piedi. Piano della prova già concordato in
[[project_backup_lacune]]. Vedi anche [[reference_backup_e_ripristino]].

**L'onboarding** ([[project_onboarding_mappa]]) resta il capitolo che vale di
più, tenuto per ultimo da Francesco perché vuole ragionarci di marketing.

Il **voto Google** ([[reference_voto_google]]) aspetta solo
`GOOGLE_PLACES_API_KEY` su Vercel.

## Fermo, e dipende da Francesco

- **Meta**: verifica business bloccata; restiamo Tech Provider, non BSP.
- **Termini e privacy** a un avvocato; le 10 aziende devono accettarli.
- **2FA** su Vercel, Supabase, Cloudflare, GitHub.
- **Ripristino del backup** mai provato (l'archivio però ora è completo).
- Le **13 prenotazioni storiche** degli eventi restano «in attesa»: nessuno le
  ha mai confermate e non le tocchiamo.
- ⚠️ Gli hostname staccati da Vercel **continuano a rispondere 200** finché il
  certificato già emesso resta valido: il routing passa dal wildcard
  `*.oltrenova.com`. Uno mai registrato dà 525. Quanto duri non è misurato.

## In coda, nessuno urgente

Next 16, multilingua DE, import documento v2, QR con logo, PWA installabile,
notifiche realtime, PMS, TripAdvisor (in attesa di Terra).
