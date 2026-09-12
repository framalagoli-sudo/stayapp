---
name: reference-eventi-conclusi
description: "Quando un evento è finito (fine = date_end, o l'inizio se manca) — una regola in lib/evento-concluso.js; i passati si vedono sul sito ma non si prenotano"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-12T09:07:29.874Z
---

**Regola unica: `lib/evento-concluso.js`** (nessun import, lo legge anche il
browser). Fine = la più tarda fra `date_start` e `date_end`; senza `date_end`
l'evento finisce quando comincia. `soloAperti` / `soloConclusi` sono gli stessi
predicati come filtri PostgREST (due `.or()` nella stessa query vanno in AND:
postgrest-js fa `searchParams.append` — provato sul DB l'11/09).

Chi la usa: `/api/guest/eventi` (default = non finiti; `?quando=passati` = gli
ultimi 12 conclusi), le route `book` e `lista-attesa` (400 «già concluso»),
`EventoPage` (riquadro «Evento concluso» al posto del modulo), elenco admin
(«In corso» / «Concluso»).

## Cosa c'era prima (fino all'11/09/2026)
- Si guardava solo `date_start`: un evento di più giorni spariva dal sito il
  **primo** giorno (l'Open Week di inLingua 14→18/09 sarebbe sparita lunedì).
- Per prenotare la data non la guardava nessuno: un vecchio link a un evento
  passato accettava prenotazioni. L'unico muro era «Chiudi prenotazioni» a mano.
- `book` non filtrava `published`/`active`: bozze ed eventi spenti si
  prenotavano conoscendone l'id.

## Eventi passati sul sito — deciso da Francesco l'11/09: SÌ di default
Il blocco `eventi` mostra sotto il programma gli ultimi conclusi (`d.limit` o 6),
schede grigie con «Concluso» e «Dettagli →». Interruttore nel blocco
`mostra_passati`: **assente = acceso**, così vale anche sui blocchi già esistenti.
Senza eventi in programma il titolo predefinito diventa «Eventi» (non
«Prossimi eventi»). **Solo sul sito**: l'app del QR mostra ancora solo i prossimi.

⚠️ La regola dipende dagli orari salvati bene: vedi [[reference_fuso_orario]],
il modulo evento li faceva scivolare di 2 ore a ogni salvataggio.

## 🔗 Indirizzo pubblico di un evento (12/09/2026)

`/eventi/<slug>`, non più `/eventi/<uuid>`. Lo slug **esisteva già** in tabella
dal 2026 (unico, obbligatorio): mancava usarlo.

- **`lib/evento-indirizzo.js` è l'unico punto che risolve un indirizzo**: slug
  attuale → serve la pagina; **id** o **slug vecchio** → 308 verso quello buono.
  I link già pubblicati non muoiono mai.
- Le route che **scrivono** (book, lista-attesa) lavorano per **id**: la pagina
  prenota con `evento.id`, non con quello che c'è nell'URL.
- L'indirizzo si corregge dal pannello; il vecchio resta valido grazie a
  `slug_precedenti` (**migration 114**). Serviva davvero: «A cena con Chiara e
  Daniele» aveva indirizzo `a-cena-con-sara-e-chiara`, perché lo slug si
  congela alla creazione e il titolo poi cambia.
- ⛔ Un indirizzo inesistente rispondeva **200** (la pagina guscio si carica e
  l'errore lo scrive il browser): ora `notFound()`. Vale per ogni pagina dove
  il contenuto arriva via fetch dal client — il 200 è il difetto tipico.
- **SEO**: dati strutturati `Event` scritti dal server (`lib/evento-schema.js`),
  eventi nella sitemap dell'entità, `/robots.txt` e `/sitemap.xml` che
  riconoscono il dominio (prima 404: la sitemap c'era e non la trovava nessuno,
  perché il link lo aggiungeva JavaScript). Il middleware deve lasciar passare
  quei due percorsi, o sul dominio del cliente diventano `/r/slug/robots.txt`.
