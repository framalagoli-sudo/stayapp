---
name: feedback_sicurezza_priorita
description: "La sicurezza è la PRIORITÀ ASSOLUTA (ribadito 16/10) — gate automatico prima di ogni deploy + regole in cima a CLAUDE.md + un agente che prova a entrare come un attaccante; se serve che Francesco lo ricordi, il sistema è rotto"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 6f9bd65f-b088-450b-a68e-2f83f514299f
  modified: 2026-10-16T20:33:42.259Z
---

**Francesco, 16/10/2026**: *«continua con la sicurezza: segna in memoria, è sempre la nostra
priorità assoluta, e dobbiamo creare un agente AI che gira per tentare di entrare»* — come lo
farebbe un bot o un malintenzionato, ma sul **nostro** sistema e solo sulle aziende di prova.
**Come si applica**: davanti a una scelta fra una funzione nuova e un controllo di sicurezza
aperto, viene prima il controllo. Le sonde sono il muro che conosco; l'agente serve a cercare
quello che non so di dover cercare (vedi [[project_agente_attaccante]]).

**Francesco, 25/08/2026**: *«ogni volta non posso raccomandarmi per la sicurezza. Puoi
aggiornare il tuo setup in modo che ogni operazione o scrittura di codice sia iper sicura
e in linea con le nostre policy?»*

**Perché aveva ragione**: le regole c'erano, ma in `CLAUDE.md` la sicurezza era un
**rimando** (`→ SECURITY.md §0`), e un rimando richiede che io decida di seguirlo. Niente
scattava da solo *prima* di scrivere. Infatti in quella sessione mi sono ricordato della
sweep solo perché me l'ha chiesto lui.

**Come si applica adesso** — tre livelli, nessuno dipende dalla memoria:
1. **`CLAUDE.md` §"Prima di scrivere qualsiasi codice"** — 8 regole operative in cima,
   ognuna nata da un guasto vero. Non un rimando: la regola stessa.
2. **`tests/verifica-regole.mjs`** — legge il codice e trova le violazioni meccaniche.
   Gira **prima** del deploy in `deploy.ps1` e **lo blocca**. Un'eccezione si dichiara con
   un commento `regola-ok: <motivo>` sopra la riga, e il motivo deve esserci davvero
   (>12 caratteri): zittire l'allarme senza spiegare non è previsto.
3. **Le tre sonde dopo il deploy** — provano il sistema vivo
   ([[project_sicurezza_continua]]).

⚠️ **Il principio che tiene insieme tutto**: un allarme che suona sempre viene ignorato,
ed è peggio che non averlo. Quando una segnalazione è legittima va **guardata una per una
e dichiarata col motivo**, mai zittita in blocco.

⚠️ E il limite da dire sempre: questi controlli trovano ciò che è meccanico. Non dicono che
il codice è sicuro — dicono che non viola le regole che sappiamo controllare da soli.
Il resto è pensiero, e un pentest esterno resta un'altra cosa.
