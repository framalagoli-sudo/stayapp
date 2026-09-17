---
name: reference-molti-indirizzi
description: "La stessa pagina risponde da 15 hostname: sui non-nostri il middleware la riscrive sotto l'entità e la pagina di piattaforma non esiste. /admin dava 404 sul dominio di un cliente"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-17T19:55:22.794Z
---

Il 17/09/2026 `https://www.garage22terni.it/admin` rispondeva **404**, davanti a un cliente. Non era una regressione del giorno: era così da sempre, e nessuna prova lo toccava.

**Il meccanismo**: su un hostname che non è il nostro, il middleware legge ogni percorso come una pagina del sito di quell'entità — `/admin` diventa `/r/garage22/admin`, che non esiste. Dal sottodominio peggio: dal 14/09 il 307 di «un sito, un indirizzo» porta sul dominio del cliente, quindi il 404 compariva **sul suo indirizzo**. Stessa sorte per `/termini`, `/cancellazione-dati` e `/checkout`.

**La decisione**: il pannello vive su **un dominio solo**, ed è sicurezza, non comodità — le passkey sono legate a `oltrenova.com` (Relying Party ID), i Redirect URL di Supabase sono una lista chiusa, e **il DNS del dominio di un cliente non è nostro**: se scade e lo compra un altro, si ritrova la nostra pagina di accesso sul suo dominio. Quindi `PERCORSI_PIATTAFORMA` in `middleware.js` (`/admin`, `/termini`, `/cancellazione-dati`) rimanda 307 a `www.oltrenova.com`, **prima** della risoluzione del dominio (nessuna chiamata di rete). `/checkout` fa l'opposto: resta sul sito del cliente, perché chi ha appena pagato non deve cambiare indirizzo — ed è in `Disallow` nel robots.

**La radice per cui nessuno se n'era accorto**: gli smoke provano **un hostname**, `www.oltrenova.com`. La piattaforma ne ha 15. → `tests/probe-molti-indirizzi.mjs` legge gli indirizzi vivi dal database (un cliente nuovo entra da solo) e su ognuno verifica home, pannello, pagine di piattaforma, ritorno dal pagamento, robots e sitemap. Gira in `deploy.ps1`. Regola 9 di `CLAUDE.md`.

⚠️ Due trappole di misura viste scrivendola, la seconda è la stessa di [[reference_sonda_misura_sbagliata]]:
- cercare «This page could not be found» nell'HTML dà **falsi positivi**: quel testo sta nei dati di Next anche in pagine sane. Il segnale vero è il **`<title>`**.
- il pannello si disegna nel browser: nell'HTML grezzo il modulo di accesso non c'è.
- una **sitemap vuota** è corretta per un sito spento o `indicizzabile=false`: pretenderla piena farebbe suonare l'allarme sempre.

Vedi [[reference_un_sito_un_indirizzo]], [[reference_visibilita_motori]], [[feedback_verificare_il_contesto]].
