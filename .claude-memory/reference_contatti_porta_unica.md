---
name: reference-contatti-porta-unica
description: "Contatti dal 04/10/2026: una porta sola (registraContatto), registro contatti_attivita, liste CALCOLATE, Trattative; e le trappole (pipeline_stage ha 'lead' come predefinito, limit(1) non maybeSingle, i tag automatici restano nei dati, cinque tabelle puntano al contatto)"
metadata:
  node_type: memory
  type: reference
  originSessionId: 83de693b-bb51-4ae3-be58-46648e944853
  modified: 2026-10-05T17:00:08.762Z
---

Dettaglio completo in `CLAUDE.md` nota 56. Qui quello che serve prima di toccare qualcosa.

- **Chi raccoglie un recapito passa da `registraContatto`** (`lib/crm.js`): riconosce da email o da `telefono_e164`. Mai un insert diretto in `contatti`. Se email e numero indicano due persone diverse vince l'email e NON si uniscono.
- **`contatti_attivita`**: una riga per cosa fatta, con `origine_id` (su cui si fa la lista) e `riferimento` (la stessa non entra due volte). Mai dati personali lì dentro. Il riepilogo sul contatto lo tiene un trigger.
- **Le liste si calcolano** (`lib/contatti-liste.js`, senza dipendenze: lo usa anche il browser). Stesso calcolo per pagina Contatti, destinatari della newsletter (`lib/newsletter-destinatari.js`) e menu dell'editor.
- **Trattative**: `pipeline_stage` vuoto = non in trattativa. ⚠️ La colonna ha `'lead'` come predefinito: chi inserisce un contatto scrive `pipeline_stage: null` ESPLICITO (anche nelle sonde), o tutti tornano trattative.
- ⚠️ Per cercare un contatto `limit(1)`, non `maybeSingle()`: con due doppioni dà errore e ne nasce un terzo.
- ⚠️ I tag messi dal sistema restano nei dati (li usano le campagne WhatsApp via `tag_filter`); a schermo vanno solo quelli scritti a mano (`etichetteAMano`).
- ⚠️ Aggiungendo una tabella che punta ai contatti, aggiungerla a `PUNTANO_AL_CONTATTO` (`lib/contatti-cura.js`): unendo due schede le righe si spostano prima di cancellare.
- **Entrare fra i contatti non iscrive a niente.** Il sì è `promozioni === true`, con la frase che conosce il server e per l'email a cui è stato detto.
- 🔒 Il permesso dei collaboratori sta nella route (`staffPuoLeggereContatti`), non nel menu → SECURITY invariante 22.
- ⚠️ `GET /api/contatti` legge a pagine: oltre mille righe PostgREST taglia senza errore.
- WhatsApp nel webhook (contatto da chi scrive, STOP per azienda): scritto, NON provato dal vivo.

Sonde (a mano): `probe-contatti-attivita`, `-porte`, `-pagina`, `-cura`, `probe-consenso-e-liste`. Collegato: [[project-session-2026-10-03-05]], [[reference-consenso-dati-personali]].
