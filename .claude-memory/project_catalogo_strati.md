---
name: project_catalogo_strati
description: "Vetrine/Offerte/Shop sono TRE cataloghi per la stessa cosa (2 su 3 vuoti) — modello a strati deciso il 27/08, dettaglio in CATALOGO.md"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-26T23:16:50.198Z
---

Deciso con Francesco il **27/08/2026**: la cosa (prodotto o servizio) vive in un
posto solo — la **vetrina** — e sopra ci vanno gli **strati**: *in offerta*
(posti, date, finisce) e *in vendita* (stock, pagamento). Dettaglio in
`CATALOGO.md` nella root del repo.

**Il fatto che rende la scelta facile**: `vetrina_elementi` 1 riga, `offerte` 3
di prova, `prodotti` (shop) **0**. Tre cataloghi con le stesse colonne, due
vuoti. Non ci sarà mai un momento più economico per unificare.

**L'idea è di Francesco ed è migliore di quella che avevo proposto io** (un
flag «prenotabile» sull'elemento di vetrina): in Offerte si sceglie *seleziona
dalla vetrina* oppure *nuovo* — e «nuovo» porta a crearlo in vetrina e torna con
l'offerta impostata. Un flag avrebbe fatto sparire l'idea che **un'offerta è un
atto con un inizio e una fine**, mentre il prodotto resta. Le voci di menu
restano tutte.

⚠️ **Gli eventi NON entrano**: restano a parte, con la loro voce e la loro
pagina pubblica — vedi [[reference_eventi_aziendali]] e le decisioni prese in
`CLAUDE.md`. Sono l'unica cosa che i clienti usano davvero (4 eventi, 6
prenotazioni).

**Why**: tre posti dove mettere la stessa cosa costringono il cliente a chiedersi
«questo va in Vetrine, Offerte o Shop?», e ogni feature nuova va scritta tre
volte.

**How to apply**: prima di aggiungere un posto dove il cliente mette le sue cose,
verificare che non ce ne sia già uno. Vedi anche [[project_vetrine]], che è il
motore collezioni+elementi già maturo (filtri, ricerca, paginazione, lead→CRM) e
ha già un preset «viaggi» per le agenzie.
