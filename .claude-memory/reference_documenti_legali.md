---
name: reference_documenti_legali
description: "Termini di servizio e informativa privacy di OltreNova: non esistevano affatto, creati il 31/08/2026. Il consenso è una prova (quando + versione), non una spunta."
metadata:
  type: reference
---

Scoperti mancanti mentre si costruivano i pagamenti: dal momento in cui i
clienti **incassano denaro dai loro clienti**, da qualche parte deve essere
scritto che quel denaro non è nostro. Tecnicamente lo era già; ma davanti a una
contestazione vale ciò che è scritto, non com'è configurato un account.

## Cosa mancava davvero

- **`/termini` non esisteva**: nessuna pagina, nessun riferimento nel codice.
- **`/privacy` non esisteva** — c'erano quelle *dei clienti* per i loro siti,
  generate dalla piattaforma, ma non la nostra. E raccogliamo email, dati
  aziendali e, come responsabili, i contatti dei clienti dei clienti.
- **Il form di iscrizione non aveva NESSUNA spunta**: si creava un account senza
  accettare niente.

Trovato il secondo per caso, mettendo il link ai Termini nel pannello: `/privacy`
dava 404. ⚠️ È il difetto che continua a tornare — *un link scritto senza aprire
la destinazione*.

## Le due cose che li rendono utili

**Termini §3** — il conto è del cliente, noi non riceviamo né deteniamo quel
denaro, nessuna commissione; consegne, resi, rimborsi, contestazioni e tasse
sono suoi.

**Privacy §2** — distingue i **dati di cliente OltreNova** (titolare noi) dai
**dati che lui raccoglie** con la piattaforma (titolare lui, noi responsabili).
Senza quella distinzione un'informativa SaaS non dice niente di utile.

L'elenco dei fornitori che toccano i dati è scritto guardando `PROGETTO.md`,
cioè la realtà: **se se ne aggiunge uno va aggiunto anche lì**.

## Il consenso è una prova

Il controllo sta **nella route** — 400 se `accetta_termini !== true`, e la
stringa `"si"` viene rifiutata — e si salva **quando** e **quale versione**
(`VERSIONE_TERMINI`, oggi `2026-08-31`). Cambiando il testo si cambia anche
quella: è il modo per sapere cosa ha accettato chi.

⚠️ **Le 10 aziende esistenti restano senza accettazione, di proposito**: non
hanno mai accettato niente perché il documento non c'era. Segnarle come
consenzienti sarebbe una bugia scritta nel database.

## Cosa resta

- **Farli rivedere a un avvocato**: il contenuto rispecchia il sistema — ed è la
  parte che richiede di conoscerlo — ma clausole vessatorie, codice del consumo
  e foro competente non si improvvisano.
- Far accettare i Termini alle aziende già esistenti, al primo accesso.

Vedi [[reference_stripe_connect]], [[reference_consenso_dati_personali]].
