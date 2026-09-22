---
name: reference_documento_che_mente
description: "PROGETTO.md diceva «Stripe mai collegato» mentre incassava da tre settimane: un documento vivo ha bisogno di qualcosa che lo contraddica, come ce l'ha il codice"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-22T14:48:08.123Z
---

**Il fatto** (22/09/2026). Francesco ha chiesto una cosa semplice — «con quale
account ho creato Stripe per OltreNova?» — e in `PROGETTO.md` ha trovato scritto
che **Stripe non era mai stato collegato, nessuna chiave su Vercel**. Le chiavi
erano in produzione dal 31 agosto, e la stessa riga falsa stava anche in
`CLAUDE.md`, in contraddizione con la sua stessa roadmap 300 righe più sotto.
Sue parole: *«ma per quale cazzo di motivo non abbiamo i file di progetto
aggiornati?»*.

**Why**: alla chiusura di ogni sessione aggiornavo `CLAUDE.md`, `FEATURES.md`,
la memoria e il promemoria di ripresa. `PROGETTO.md` **non l'ho mai aggiornato,
nemmeno una volta** — l'unica istruzione era «a ogni nuovo collegamento
esterno», che è una condizione che nessuno verifica. E nessun controllo poteva
accorgersene: `verifica-regole.mjs` confronta le **variabili usate nel codice**
con quelle documentate, e lì le variabili erano documentate. Era il **fatto** a
essere falso, non l'elenco.

⛔ È il documento che legge chi subentra in emergenza — un erede, un socio, un
acquirente, o Francesco alle tre di notte. Una riga falsa lì vale più di un bug:
un bug si vede, una riga falsa viene creduta.

**How to apply**:
- `PROGETTO.md` entra nella chiusura di sessione insieme agli altri quattro.
  Scritto in `CLAUDE.md` accanto al link, non lasciato alla memoria.
- `tests/probe-documenti.mjs` (in `deploy.ps1`) confronta le **affermazioni** del
  documento con le chiavi vere su Vercel: fornitore dato per spento che ha le sue
  chiavi, chiave documentata che non esiste, chiave in produzione che nessun
  codice legge. Distingue **promemoria dichiarati** da **problemi**: un allarme
  che suona sempre si smette di leggerlo (`SENTRY_DSN` è il primo caso).
- La regola generale: **quando un documento afferma un fatto verificabile, si
  scrive il controllo che lo contraddice.** Vale per costi, fornitori, account.

Vedi [[reference_documento_progetto]], [[reference_sonda_misura_sbagliata]],
[[feedback_verificare_il_contesto]].
