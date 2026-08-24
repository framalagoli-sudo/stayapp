---
name: reference_entita_dal_corpo
description: "entity_id che arriva dal corpo va verificato con entitaDellaAzienda: azienda_id era protetto, entity_id no → si pubblicava contenuto sul sito di un'altra azienda"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-24T08:24:02.909Z
---

Chiuso il 24/08/2026 (sotto-fase A3 di [[project_check_sicurezza_punto_A]]).

**Il difetto**: l'invariante 3 (`resolveAziendaId`) proteggeva `azienda_id` ovunque, ma **`entity_id` no** — arrivava dal client validato solo come UUID. Un'azienda poteva creare un **proprio** evento puntandolo all'entità di un'**altra**: il record restava suo, ma l'evento **compariva sul sito pubblico della vittima**, con titolo, descrizione, immagine e prezzo arbitrari — e le prenotazioni raccolte lì arrivavano all'attaccante. Verificato sfruttabile in produzione su eventi e risorse booking.

**La regola**: ovunque l'entità arrivi dal corpo della richiesta, va verificata con

```js
if (!(await entitaDellaAzienda(profile, tipo, id)))
  return Response.json({ error: 'Entità non valida' }, { status: 404 })
```

(`lib/server-auth.js`). `entity_id` assente resta valido: è il contenuto "aziendale", visibile su tutte le proprie entità. Applicata a eventi (POST+PATCH), risorse booking (POST+PATCH), recensioni, automazioni, blog, newsletter.

**Perché la sonda dei permessi non lo vedeva**: la richiesta è **legittima** — sto creando un mio record — è il campo a puntare altrove. È la stessa cecità che nascondeva il buco del loyalty.

**Difesa in profondità**: `/api/guest/eventi` filtrava il primo ramo della `.or()` per sola entità, senza azienda; ora include `azienda_id`, così un record già sporco resta invisibile. E `entity_tipo`, che finisce interpolato nel filtro PostgREST, è whitelistato prima — come si faceva già in `/api/collegamenti`, che era l'esempio corretto da cui copiare.

⚠️ Vale anche per gli **upload**: quelle route non scrivono solo il file, aggiornano il record (`cover_url`, `logo_url`). Tre lo facevano senza controllo → si cambiava la copertina sul sito di un altro.

Sonda: `tests/probe-mass-assignment.mjs` (prova anche il caso legittimo), `tests/probe-upload-altrui.mjs`.
