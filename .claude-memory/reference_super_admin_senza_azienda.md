---
name: reference-super-admin-senza-azienda
description: Il super_admin non ha azienda_id — una guardia scritta su quel campo lo blocca in cima e rende irraggiungibile il ramo che lo gestiva più sotto
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-01T12:52:22.997Z
---

**`if (!profile?.azienda_id) return 403` blocca il super_admin.** Non avere
un'azienda propria è la sua condizione normale, non un difetto del suo profilo:
è la chiave che apre i dati di tutte le aziende, quindi non ne possiede nessuna.

Il difetto è insidioso perché nelle stesse route, **più sotto**, c'è già il ramo
che lo gestisce:

```js
if (!profile?.azienda_id) return 403          // ⛔ lo ferma qui
...
if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)   // mai raggiunto
```

Chi ha scritto quel secondo `if` aveva capito il caso. La guardia in cima lo
rende irraggiungibile — e **un ramo mai raggiunto non dà errore, dà silenzio**.

## Perché continua a ricapitare

È il difetto di `project_session_2026_06_15` («fix sistemico super_admin
azienda_id»), del «nessuna azienda» nella pagina Pagamenti, e il 01/09 di nuovo
sulle automazioni. Ricapita perché **si sviluppa e si prova da un ruolo diverso
da quello di Francesco**: da `admin_azienda` tutto funziona. Lui è super_admin,
quindi trova la funzione spenta proprio chi amministra la piattaforma.

## Come si corregge

Non si toglie la guardia: si separa **avere un'azienda** da **poter agire**.

- La guardia diventa `if (!profile || (profile.role !== 'super_admin' && !profile.azienda_id))`.
- Dove serve scrivere `azienda_id`, si prende **dall'entità** con
  `getEntityAziendaId(tipo, id)`, non dal profilo: `entitaDellaAzienda` ha già
  verificato che un non-super_admin tocchi solo le proprie, quindi per lui le due
  coincidono — mentre per il super_admin la seconda non esiste.

## ⚠️ Restano da sistemare (misurate il 01/09/2026)

La stessa riga esatta è in **10 route**. Corrette le 4 di `automazioni/`.
**Ancora da guardare**: `recensioni/`, `recensioni/[id]`,
`recensioni/genera-link`, `webhooks/`, `webhooks/[id]`, `webhooks/[id]/test` —
cioè, da super_admin, Recensioni e Webhook sono verosimilmente spenti.

Vedi [[feedback_multitenant_authz]], [[feedback_cercare_tutti_i_punti]].
