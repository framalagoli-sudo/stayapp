---
name: project-check-sicurezza-punto-a
description: "Punto A (sicurezza) chiuso il 24/08/2026: 8 sotto-fasi, 6 con buchi veri corretti; il metodo per classi separate è ciò che li ha fatti emergere — dettaglio in SECURITY-CHECK.md"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-24T08:23:47.791Z
---

Check di sicurezza completo di OltreNova, **chiuso il 24/08/2026**. Documento vivo: `SECURITY-CHECK.md` nel repo. Tutto live e ricontrollato in produzione; smoke passato da 66 a 75 test.

## Perché il metodo per classi ha funzionato

Ogni sotto-fase rispondeva a una domanda diversa, e **ognuna ha trovato cose che le altre non potevano vedere**. La sonda sui permessi (A1, 202 route) diceva che il muro multi-tenant regge — ed è vero — ma è **cieca su tutto ciò che passa da richieste legittime**. I due problemi più gravi stavano proprio lì: valore consumato senza pagamento (A2) e contenuto agganciato al sito di un altro (A3). Fermandosi ad A1 si sarebbe dichiarato tutto a posto.

## I buchi veri, in ordine di gravità

1. **Contenuto sul sito di un altro** (A3): `entity_id` arrivava dal client validato solo come UUID → un'azienda creava un proprio evento puntato all'entità di un'altra e **compariva sul sito della vittima**, con le prenotazioni dirottate. → [[reference_entita_dal_corpo]]
2. **Valore consumato senza pagamento** (A2, 23/08): punti e gift card scalati alla creazione dell'ordine. → [[reference_valore_a_pagamento_accertato]]
3. **Capienza sfondata** (A2, 24/08): il controllo posti non era atomico (4 prenotazioni su 1 posto) e il **booking non aveva alcun controllo di disponibilità** — gli slot liberi li calcolava solo la pagina.
4. **Defacement via upload** (A6): tre route aggiornavano `cover_url`/`logo_url` senza controllo di proprietà → si cambiava copertina e logo sul sito di un'altra azienda.
5. **Bozze visibili a chiunque** (A1, 23/08): `?preview=1`. → [[reference_anteprima_bozze_token]]
6. **Route email senza limite** (A5) e **recensione negativa reinviabile all'infinito** (la guardia stava su `pubblica`, che resta false proprio quando il voto è basso).
7. **Disdetta su una GET** eseguita al caricamento: bastava che il client di posta seguisse il link in anteprima e la prenotazione spariva, senza traccia del perché.
8. **Preventivi scaduti sempre accettabili**: si controllava `stato='scaduto'`, uno stato che **nessuno scrive mai**.

## Verificati integri (nessuna modifica)

Escalation di ruolo, filtri PostgREST, XSS (DOMPurify + iframe sandboxed senza `allow-same-origin` + `safeUrl`), cron (tutti 401), firme dei webhook, generazione dei token (tutti da `gen_random_uuid`), sessioni (permesso revocato = effetto immediato), e i limiti di frequenza (**non** aggirabili con `x-forwarded-for`: il proxy impone l'IP reale).

## Le due regole di metodo da tenere

- **Ogni fix va provato anche al contrario**: le sonde verificano sempre il caso legittimo (la prenotazione che deve passare, l'anteprima che deve funzionare). Un controllo che blocca tutto è un guasto peggiore del problema.
- **Il sintomo inganna**: un invio email fallito sembra un webhook morto; un 429 da rate limit sembra un difetto della capienza. Prima di accusare qualcosa, togliere di mezzo ciò che gli sta davanti.

**Prossimo: il punto B** — revisione funzionale per aree, vedi [[todo_prossima_sessione]].
