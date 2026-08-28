---
name: todo_prossima_sessione
description: "LEGGERE PER PRIMO — dove siamo e cosa si fa dopo (aggiornato 28/08/2026, chiusura seconda sessione)"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-28T08:23:58.299Z
---

# Dove siamo

⚠️ **Prima di scrivere codice**: [[feedback_verificare_il_contesto]] — le
quattro domande da farsi. Gli errori recenti hanno una radice sola.

**Lavoro in corso**: l'unificazione delle prenotazioni.
Tutto il contesto, l'analisi e le decisioni stanno in
[[project_prenotazioni_unificate]] — **leggerlo prima di riprendere**.

## ⏭️ Riprendere da qui, in quest'ordine

1. **Le risorse booking dentro le offerte.** I tre campi mancanti
   (`anticipo_ore`, `cancellazione_ore`, `conferma_auto`) sono **già nel
   database**, migration 095 eseguita. Restano: migrare le 2 risorse (di
   prova), portare i campi di disponibilità nell'editor offerte, far leggere al
   `BookingWidget` le offerte invece delle risorse, togliere «Risorse» dal menu.
2. **Shop → Ordini e Clienti**, come Shopify. Deciso da Francesco: un ordine
   non occupa un posto nel tempo, occupa stock.
3. **Le pagine vecchie Attività ed Escursioni** nel menu dell'entità: scrivono
   ancora nei campi vecchi mentre il sito legge da `offerte`. **È lo stesso
   difetto già chiuso sullo shop** — due porte per la stessa stanza.

Poi, quando Francesco lo dice: **Stripe Connect** (in attesa per sua scelta).
Oggi lo shop incassa sullo Stripe della piattaforma, l'opposto di quello che ha
deciso: *«io non voglio stare nel flusso di denaro»*.

## Da provare insieme

Francesco non ha ancora fatto il giro completo del lavoro di oggi. Il percorso
è: crea un'offerta → la pubblichi → prenoti dal sito → la vedi in
**Prenotazioni**, con i posti che calano.

## Decisioni ferme (non ridiscuterle da solo)

- **Gli eventi restano fuori** da offerte e dalle prenotazioni unificate.
  Motivo di Francesco: *«catalogo → offerte → shop sono consequenziali,
  l'evento no»*. In `CLAUDE.md`, decisioni prese.
- **Offerte a campo libero**: niente elenchi di tipi decisi da noi.
- **Il catalogo a strati**: la cosa vive nei Prodotti, sopra vanno *in offerta*
  e *in vendita*. Vedi `CATALOGO.md` e [[project_catalogo_strati]].

## A carico di Francesco (aperto da giorni)

1. Chiave R2 **in sola scrittura** + scadenza 30 giorni come regola del bucket
2. Prova del backup: `node tests/verifica-backup.mjs <percorso>`
3. Secondo fattore su Vercel, Supabase, Cloudflare, GitHub → poi la data in
   `INCIDENTE.md`
4. Email mancante su `futura-club-spiagge-bianche` e `piano-editoriale-futura-vacanze`
5. Requisiti Stripe Connect per un ristoratore italiano

## Altri debiti noti

- La sezione dell'app ospite dove compaiono le offerte si chiama ancora
  «Escursioni»: nome ereditato, sbagliato per un'inaugurazione. Decisione di
  Francesco, chiesta due volte e non ancora data.
- Il booking **non compare da solo sul sito**: va aggiunto il blocco «Widget
  prenotazione» alla pagina. Un cliente non può indovinarlo.
- C'è una riga «Evento» in `offerte` creata provando: invisibile ovunque.
- Onboarding «Inizia qui»: `/admin/onboarding` è 404. Resta il capitolo aperto
  più importante del prodotto — vedi [[project_onboarding_mappa]].
