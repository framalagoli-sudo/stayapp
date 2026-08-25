---
name: feedback_sicurezza_priorita
description: La sicurezza non si raccomanda ogni volta — è un gate automatico prima di ogni deploy + 8 regole in cima a CLAUDE.md; se serve che Francesco lo ricordi, il sistema è rotto
metadata:
  type: feedback
---

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
