---
name: todo_prossima_sessione
description: LEGGERE PER PRIMO — dove siamo e cosa si fa dopo (aggiornato 27/08/2026 sera)
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-27T14:30:33.347Z
---

# Dove siamo (fine 27/08/2026)

Il **modello a strati è completo e live** — vedi `CATALOGO.md` e
[[project_catalogo_strati]]:

```
                       ┌─ in vendita  → «Vendi» → Shop
Prodotti (il catalogo) ─┤
  esiste, si mostra     └─ in offerta  → «Crea offerta» → Offerte
```

Funziona nei due versi, verificato in produzione. Gli eventi restano fuori,
per scelta.

## ⏭️ IL PROSSIMO LAVORO: il calendario del booking

Chiesto da Francesco il 27/08 sera, **non ancora fatto**. Cinque punti, i primi
due chiusi:

- [x] «60min» su una risorsa a giornate (era il default della colonna)
- [x] il blocco booking passava `primary` invece di `primaryColor`
- [ ] **Calendario admin come quello del Piano editoriale** — gli piace quello.
      Caselle **verde chiaro** = disponibile, **rosso chiaro** = occupato.
      Clic su un giorno libero → si prenota. Clic su un giorno prenotato →
      dettagli, poi **modifica** e **cancella** (li vuole espressamente).
- [ ] **Scelta del mese** (avanti/indietro, non solo la settimana corrente)
- [ ] **Front-end**: il cliente vede il calendario e prenota cliccando su una
      data libera — oggi ci sono due campi data, che funzionano ma non mostrano
      quali giorni sono liberi.

⚠️ Il modello da copiare è `components/admin/PianoEditorialePage.jsx`.
Il calendario booking attuale è `components/admin/booking/BookingCalendarioPage.jsx`.

## 🔴 Il capitolo più grosso ancora aperto: Stripe Connect

«Acquista ora» sulle offerte lo dice onestamente all'utente («per ora si
comporta come Prenota»), ma **lo shop incassa sullo Stripe della piattaforma**,
non su quello del cliente. È l'opposto di quello che Francesco ha deciso: *«io
non voglio stare nel flusso di denaro»*. Serve **Stripe Connect Standard**, dove
il cliente è merchant of record.

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
  stessa stanza. Da spegnere.
- Su `struttura-test` i contenuti sono in entrambi i posti. Nessun cliente vero
  è migrato.
- La sezione dell'app ospite dove compaiono le offerte si chiama ancora
  **«Escursioni»**: nome ereditato, sbagliato per un'inaugurazione. Come
  chiamarla è una decisione di Francesco, già chiesta e non ancora data.
- C'è una riga «Evento» in `offerte` creata provando: invisibile ovunque.
- `prodotti` (shop) ha ZERO righe: la vecchia tabella resta come rete, lo shop
  ora legge anche dal catalogo.
