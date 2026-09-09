---
name: todo-prossima-sessione
description: "Da dove riprendere — l'offerta del Furgone da confermare col cliente, Garage 22 e il nome su Stripe, poi il primo incasso vero"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-09T17:19:47.058Z
---

# Si riprende da qui

## ✅ Archivio completo — resta da provare il ripristino

Chiuso il 09/09 pomeriggio: nel backup ora ci sono i **15 account di accesso**
e le **62 immagini** dei clienti, più una copia mensile tenuta un anno. Provato
in produzione. Due difetti trovati strada facendo: il pulsante «esegui backup
adesso» era rotto dal 29/08 (il bucket lock vieta di riscrivere il file del
giorno) e il cron non dichiarava un tempo massimo.

**Il ripristino resta da provare** — ora però su un archivio completo, che era
il punto. Piano e prima domanda a cui rispondere in [[project_backup_lacune]].

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
