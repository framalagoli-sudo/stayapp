---
name: project-session-2026-08-23-check-a
description: "Check sicurezza Parte A (23/08/2026): tutte le 202 route provate con credenziali sbagliate — multi-tenant integro, 4 buchi chiusi e deployati; resta la Parte B (revisione funzionale per aree)"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-23T16:33:08.391Z
---

Parte A del check completo di OltreNova, 23/08/2026 — **fatta e live** (commit `a8826530`, smoke 70 passed + 1 skip).

**Quello che regge**: sonda `tests/probe-security-sweep.mjs` — due aziende effimere che bussano a tutte le **202 route** con nessun token e con il token dell'altra azienda. **92 liste** interrogate da B: zero dati di A. Nessuna risorsa altrui leggibile, modificabile o cancellabile. Il muro multi-tenant tiene.

**I quattro buchi chiusi**:
1. `?preview=1` apriva le bozze a chiunque → token firmato, vedi [[reference_anteprima_bozze_token]]
2. catalogo shop pubblico con `select('*')` → campi espliciti (non perdeva nulla oggi, ma ogni colonna futura sarebbe finita online da sola)
3. saldo fedeltà rivelava che un'email è cliente di quel negozio e quanto ci spende → risposta identica per cliente reale ed email inventata
4. codici gift card da `Math.random()` (prevedibile, e valgono denaro) → `crypto.randomBytes`, 12 caratteri, alfabeto senza `0/O` e `1/I` perché si digitano a mano

**Decisione di Francesco**: «massima protezione e privacy dei dati» — vale come criterio quando una scelta è di prodotto e non tecnica.

**Debito lasciato scritto nel codice**: il modulo loyalty ha **zero programmi attivi**, quindi chiudere il saldo pubblico non ha tolto niente a nessuno; ma quando verrà attivato su un cliente vero serve il pezzo mancante — mostrare i punti solo a chi dimostra di possedere quell'email (link o codice inviato per posta).

**Prossimo passo: Parte B** — revisione funzionale a lotti di 3-4 aree, partendo da quelle che i clienti usano davvero (Contatti, Richieste, Prenotazioni, Sito) e poi da quelle mai verificate sul campo (Loyalty, Shop, Survey, Piano editoriale).

Vedi [[reference_security_audit]], [[project_session_2026_07_14]].
