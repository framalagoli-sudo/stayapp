---
name: todo_prossima_sessione
description: LEGGERE PER PRIMO — dove siamo e cosa si fa dopo (aggiornato 28/08/2026 sera)
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-27T20:57:56.930Z
---

# Dove siamo (fine 28/08/2026)

⚠️ **Leggere prima di mettere mano al codice**:
[[feedback_verificare_il_contesto]]. Francesco ha detto che ultimamente le
sbaglio tutte, e ha ragione: quattro «fix» di fila su cose consegnate da me
pochi giorni prima, tutte con la stessa radice.

## Chiuso oggi

- **Calendario booking**, tutti e cinque i punti chiesti: vista mensile stile
  piano editoriale, colori (verde/giallo/rosso con legenda), clic per prenotare
  o vedere chi c'è, azioni conferma/annulla/completa/elimina, scelta del mese,
  e sul **front-end** il cliente sceglie il periodo cliccando sul calendario.
- **Prenotazione a mano dal pannello** (`POST /api/booking/prenotazioni`): non
  esisteva, e il pulsante che avevo messo puntava al vuoto.
- **Flusso unificato**: lo shop non ha più una creazione propria, «Nuova
  offerta» chiede da cosa partire (prodotto esistente o nuovo).
- Route mancanti dello shop (`/admin/shop/nuovo`, `[id]`, `ordini/[id]`).

## ⏭️ Il prossimo lavoro

**Francesco ha detto di aspettare con Stripe.** Ha anche detto che *«in memoria
c'erano altri pezzi»* da riprendere: **all'inizio della sessione rileggere le
memory e fargli il punto di cosa resta aperto**, invece di scegliere da solo.

Candidati già noti:
- **Onboarding «Inizia qui»** — il capitolo aperto più importante del prodotto:
  un cliente nuovo deve arrivare al sito pubblicato da solo. `/admin/onboarding`
  è 404. Vedi [[project_onboarding_mappa]].
- **Stripe Connect** (in attesa): oggi lo shop incassa sullo Stripe della
  piattaforma, l'opposto di quello che Francesco ha deciso — *«io non voglio
  stare nel flusso di denaro»*.
- **Menu semplificato**: deciso tempo fa, mai fatto.

## A carico di Francesco (aperto da giorni)

1. Chiave R2 **in sola scrittura** + scadenza 30 giorni come regola del bucket
2. Prova del backup: `node tests/verifica-backup.mjs <percorso>`
3. Secondo fattore su Vercel, Supabase, Cloudflare, GitHub → poi la data in
   `INCIDENTE.md`
4. Email mancante su `futura-club-spiagge-bianche` e `piano-editoriale-futura-vacanze`
5. Requisiti Stripe Connect per un ristoratore italiano

## Debiti tecnici noti

- Le pagine vecchie **Attività** ed **Escursioni** (menu dell'entità) scrivono
  ancora nei campi vecchi mentre il sito legge da `offerte`: due porte per la
  stessa stanza, da spegnere. **È lo stesso difetto appena chiuso sullo shop.**
- La sezione dell'app ospite dove compaiono le offerte si chiama ancora
  «Escursioni»: nome ereditato, sbagliato per un'inaugurazione. Come chiamarla
  è una decisione di Francesco, chiesta due volte e non ancora data.
- C'è una riga «Evento» in `offerte` creata provando: invisibile ovunque.
- `prodotti` (shop) resta come rete: zero righe, lo shop legge dal catalogo.
- Il booking **non compare da solo sul sito**: va aggiunto il blocco «Widget
  prenotazione» alla pagina. Un cliente non può indovinarlo.
