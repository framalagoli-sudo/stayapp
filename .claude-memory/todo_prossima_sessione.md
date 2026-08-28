---
name: todo_prossima_sessione
description: "LEGGERE PER PRIMO — dove siamo e cosa si fa dopo (aggiornato 28/08/2026, fine seconda sessione)"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-28T15:27:12.677Z
---

# Dove siamo

⚠️ **Prima di scrivere codice**, due regole che nascono da errori veri:
- [[feedback_verificare_il_contesto]] — le quattro domande **e l'ultimo
  miglio**: apro col browser il punto da cui ci arriva Francesco. Se non l'ho
  aperto, è «scritto, non provato», e lo dico con quelle parole.
- [[feedback_cercare_tutti_i_punti]] — quando trovo un difetto di **categoria**,
  cerco tutti i punti che fanno la stessa cosa. Il consenso privacy è mancato in
  **tre** posti perché ogni volta correggevo solo dove me lo segnalava lui.

E: **quando serve il suo aiuto, glielo chiedo** dicendo il percorso preciso —
quale pagina, cosa cliccare, cosa deve succedere (in `CLAUDE.md`).

## Da provare, con il percorso esatto

Francesco stava facendo il giro e si è fermato qui:
1. **Offerte** → cambia azienda in cima su **StayApp Development**: ci sono
   «Padel» e «Degustazione» pubblicate, più le 3 migrate in bozza. Su
   **TVB Investment** c'è «Nuo cas».
2. Apri una pagina in **Sito web → Pagine**, aggiungi il blocco **Offerte** e
   cliccaci sopra: deve chiedere «Quali mostrare» ed elencare i titoli.
3. Stessa cosa col **Widget prenotazione**: deve dire «Si potranno prenotare: …»
   o avvisare che resterà invisibile.
4. Prenota di nuovo dal sito: ora c'è la spunta del consenso.

Sua nota: **il design del modulo di prenotazione è grezzo**, ci metteremo mano.

## ⏭️ Il lavoro tecnico che resta

1. **Le risorse booking dentro le offerte.** I tre campi sono già nel database
   (migration 095). Restano: migrare le 2 risorse (di prova), portare la
   disponibilità nell'editor offerte, far leggere al `BookingWidget` le offerte,
   togliere «Risorse» dal menu.
2. **Shop → Ordini e Clienti**, come Shopify (deciso da Francesco).
3. **Le pagine vecchie Attività ed Escursioni** nel menu dell'entità: scrivono
   ancora nei campi vecchi mentre il sito legge da `offerte`. Stesso difetto già
   chiuso su shop e promozioni.
4. Quando Francesco vuole: togliere il blocco «Promozioni» dalle pagine e
   pubblicare le offerte migrate al suo posto.

Poi, a sua decisione: **Stripe Connect** (in attesa) e **onboarding «Inizia
qui»** (`/admin/onboarding` è 404, resta il capitolo che sposta di più).

## Decisioni ferme (non ridiscuterle da solo)

- **Gli eventi restano fuori** da offerte e prenotazioni unificate: *«catalogo →
  offerte → shop sono consequenziali, l'evento no»*.
- **Shop = Ordini + Clienti**: un ordine non occupa un posto nel tempo, occupa
  stock.
- **Offerte a campo libero**, niente elenchi di tipi decisi da noi.
- Il catalogo a strati: `CATALOGO.md` e [[project_catalogo_strati]].
- `azienda_id` nell'HTML **resta**: serve al blog, e apre solo ciò che è già
  pubblico (misurato, `probe-azienda-id-esposto.mjs`).

## A carico di Francesco (aperto da giorni)

1. Chiave R2 **in sola scrittura** + scadenza 30 giorni come regola del bucket
2. Prova del backup: `node tests/verifica-backup.mjs <percorso>`
3. Secondo fattore su Vercel, Supabase, Cloudflare, GitHub → poi la data in
   `INCIDENTE.md`
4. Email mancante su `futura-club-spiagge-bianche` e `piano-editoriale-futura-vacanze`
5. Requisiti Stripe Connect per un ristoratore italiano

## Altri debiti noti

- La sezione dell'app ospite si chiama ancora «Escursioni»: decisione di
  Francesco, chiesta due volte e non ancora data. **Ora che esiste il blocco
  Offerte, si può risolvere.**
- Il booking non compare da solo sul sito: va aggiunto il blocco alla pagina.
- Le 3 prenotazioni vecchie senza consenso restano in archivio (sono di prova).
