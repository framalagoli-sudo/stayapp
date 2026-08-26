---
name: todo_prossima_sessione
description: LEGGERE PER PRIMO — dove siamo e cosa si fa dopo (aggiornato 27/08/2026)
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-26T23:21:28.924Z
---

# Dove siamo (fine 27/08/2026)

Il **modello del catalogo a strati è deciso e scritto** in `CATALOGO.md`:
la cosa vive nella vetrina, sopra ci vanno gli strati *in offerta* e *in
vendita*. Vedi [[project_catalogo_strati]]. Gli eventi restano fuori.

## Il prossimo passo — Francesco deve scegliere da dove

Gliel'ho chiesto e non ha ancora risposto:

1. **Fase 1: il selettore «seleziona dalla vetrina» dentro Offerte** ← la mia
   raccomandazione. È il pezzo che si vede, e fa toccare con mano se il modello
   regge prima di investirci sopra.
2. **Fusione dello shop** — invisibile, ma **oggi costa zero**: `prodotti` ha
   ZERO righe. Ogni cliente nuovo con lo shop chiude questa finestra.

## A carico di Francesco (dalle sessioni precedenti, ancora aperto)

1. Chiave R2 **in sola scrittura** (Cloudflare → R2 → Manage API tokens) +
   scadenza 30 giorni come regola del bucket
2. Prova del backup: `node tests/verifica-backup.mjs <percorso>`
3. Secondo fattore su Vercel, Supabase, Cloudflare, GitHub → poi la data in
   `INCIDENTE.md`
4. Email mancante su `futura-club-spiagge-bianche` e
   `piano-editoriale-futura-vacanze` (obbligo GDPR)
5. Requisiti Stripe Connect per un ristoratore italiano

## Lavoro tecnico rimasto

- Le pagine vecchie **Attività** ed **Escursioni** (nel menu dell'entità)
  scrivono ancora nei campi vecchi, mentre il sito legge da `offerte`: due porte
  per la stessa stanza. Da spegnere e reindirizzare.
- Su `struttura-test` i contenuti sono in **entrambi** i posti (campi vecchi +
  offerte): è l'unica entità così, nessun cliente vero è migrato.
- C'è una riga «Evento» in `offerte` creata da Francesco provando: invisibile
  ovunque, da cancellare quando lo dice.
- La sezione dell'app ospite dove compaiono le offerte si chiama ancora
  **«Escursioni»** — nome ereditato, sbagliato per un'inaugurazione. Come
  chiamarla è una decisione di Francesco, gliel'ho chiesta.
- Stripe Connect Standard per «acquista» (l'editor avvisa già che non è
  collegato).
- Onboarding «Inizia qui» — resta il capitolo aperto più importante del
  prodotto (`/admin/onboarding` è 404).
