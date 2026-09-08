---
name: reference_accendere_non_e_finire
description: "Una funzione nuova vale solo da quando è live: chi c'era prima resta fuori e il cliente vede vuoto: serve sempre il recupero dello storico"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-08T20:59:22.573Z
---

Quando si collega una funzione nuova a un flusso esistente, quella funzione
**vale dal momento del deploy**. Tutto quello che era già in archivio non ci
passa, quindi il cliente apre il pannello e **non vede niente** — e conclude,
giustamente, che non funziona.

Tre volte lo stesso errore, e la seconda e la terza dopo averlo già scritto in
un commento:

- **Promemoria automatici**: si programmano quando uno prenota. Le 27 persone
  che avevano prenotato prima non erano in nessuna coda. Risolto con un pulsante
  «mandalo adesso a chi c'è».
- **Recensioni**: il motore esisteva, zero richieste inviate in tutta la storia
  del progetto. Vedi [[reference_motore_senza_porta]].
- **CRM eventi (08/09/2026)**: `registraContatto` collegato alla route di
  prenotazione. Francesco: *«in contatti non vedo nulla!»*. 15 persone su 17
  erano fuori, perché avevano prenotato prima. Recuperate con
  `tests/recupera-contatti-eventi.mjs`.

**Come si applica:** insieme al codice che accende la funzione, si scrive lo
script che porta avanti lo storico — e si guarda **il dato vero prima di
dichiarare fatto**, non la sonda su un caso nuovo. Una sonda che crea una
prenotazione nuova e la trova nel CRM è verde su un sistema che per il cliente
è vuoto.

Lo script di recupero:
- **simula** senza `--esegui` (come `probe-comprimi-esistenti.mjs`);
- è **idempotente** (salta chi è già a posto), perché si rilancia;
- salta gli indirizzi `@playwright.internal` — vedi
  [[feedback_sonde_non_scrivono_a_persone]].

⚠️ Un recupero che scrive nei dati di clienti veri si fa **autorizzare prima**,
mostrando la simulazione: vedi [[feedback_autorizzare_cambi_importanti]].
