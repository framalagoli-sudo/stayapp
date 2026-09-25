---
name: reference-cancellazione-completa
description: "Cancellare azienda/entità porta via tutto (lib/cancellazione.js, migration 127); il buco dei domini di un'altra azienda; le cancellazioni dirette lasciano gli indirizzi su Vercel"
metadata:
  node_type: memory
  type: reference
  originSessionId: 814befb6-1136-4fe1-9412-3d749d356419
  modified: 2026-09-25T18:29:59.115Z
---

**`lib/cancellazione.js`**: `cancellaEntita(tipo, id, profile)` chiede «è sua?» PRIMA di qualunque effetto; `cancellaAzienda(id)` raccoglie (sola lettura) → cancella la riga (cascate migration 127) → poi file, traduzioni, ACCOUNT. Se la riga non si cancella non si perde niente.

**Il buco (24/09/2026, chiuso e mai sfruttato)**: DELETE `/api/ristoranti|attivita/:id` di un'altra azienda → filtro per azienda = 0 righe, nessun errore → staccava comunque i domini della vittima → 200. Una cancellazione filtrata che non trova niente NON è un rifiuto. SECURITY §0 invariante 20. Sonda in deploy: `probe-cancella-entita-altrui.mjs`.

**Account orfani**: `profiles.azienda_id` è SET NULL → cancellare un'azienda lasciava gli account vivi (Futura Vacanze). Ora li toglie `cancellaAzienda`. Invariante 21. Sonda in deploy: `probe-cancella-azienda.mjs` (resti cercati nello SCHEMA pubblicato da PostgREST `/rest/v1/`, non in un elenco a mano).

**`entity_translations`** non ha FK di proposito: `entity_id` indica entità, pagine, eventi, articoli, form.

**Indirizzi su Vercel**: un'entità creata da route in produzione riceve un sottodominio; cancellarla dal DB lascia l'hostname agganciato e invisibile. Il 25/09 erano 21 (`zz-…` sonde, `ci-sec-…` smoke di sicurezza quando il cron domini passa durante la corsa, `osteria-del-borgo`), staccati con `npx vercel api "/v9/projects/<id>/domains/<host>?teamId=<org>" -X DELETE --dangerously-skip-permissions`. Le sonde ora puliscono con `cancellaAziendaDiProva` (probe-auth.mjs). ⚠️ Lo smoke `security.spec.js` cancella ancora dal DB: può lasciarne.

Collegati: [[reference_domini_vercel]], [[reference_sonde_dati_in_produzione]].
