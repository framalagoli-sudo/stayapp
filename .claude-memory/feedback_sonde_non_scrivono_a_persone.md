---
name: feedback-sonde-non-scrivono-a-persone
description: Una sonda non deve mai toccare un cliente vero — il 02/09 ha mandato email con una recensione finta a un cliente reale; si crea sempre la propria azienda e la propria entità
metadata:
  type: feedback
---

**Il 02/09/2026 una mia sonda ha mandato email vere a clienti veri.**

`probe-recensioni.mjs` usava «la prima entità attiva che trovo» — cioè un
cliente. E il caso «due stelle» fa partire per posta un avviso al titolare: sono
arrivate email con una recensione inventata di «ZZ Scontento» a
`info@borgodellago.com` e a Francesco. Il proprietario ha chiamato.

**Why:** un'email mandata non si richiama indietro. Non basta che la sonda
pulisca il database dopo: il danno è già uscito, ed è arrivato a una persona che
non sa cos'è una sonda. Vale per ogni effetto che esce dal database — email,
WhatsApp, webhook, pagamenti.

**How to apply:**
- Una sonda **si crea la propria azienda e la propria entità**, e le cancella.
  Mai «la prima che trovo». L'azienda finta ha un'email `@playwright.internal`,
  l'entità nasce `active: false` e non compare da nessuna parte.
- Prima di scrivere una sonda, chiedersi: **cosa esce da qui verso il mondo?**
  Se il codice provato manda qualcosa a qualcuno, il destinatario dev'essere
  finto **per costruzione**, non per fortuna.
- Il marchio `ZZ-` sui nomi, e la pulizia **per azienda** — vedi
  [[reference_sonde_dati_in_produzione]].

## ⚠️ Guardare i risultati aveva rotto la pulizia

Quattro recensioni finte erano rimaste in produzione, **due delle quali
pubbliche** sul sito di un cliente. Il motivo non era nel codice della sonda:

```powershell
node probe-recensioni.mjs | Select-Object -First 20   # ⛔
```

PowerShell chiude il tubo dopo N righe e **ammazza node**: il blocco `finally`
non gira mai. Lo stesso vale per `head` in bash. Il modo in cui leggevo l'output
impediva la pulizia — e non lasciava alcun segno.

**Per leggere l'output di una sonda lunga**: scrivere su file e poi leggere il
file (`node sonda.mjs *>&1 > out.txt`), mai troncare il tubo.

Vedi [[feedback_sandbox_non_e_live]].
