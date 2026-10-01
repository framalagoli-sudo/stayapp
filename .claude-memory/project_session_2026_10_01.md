---
name: project-session-2026-10-01
description: "Sessione 01/10: bug segnalato da Francesco su Garage 22 — chi apriva la cassa Stripe e non pagava restava prenotato; corretto (pending, cassa a 31 min, cron che chiude e dice perché); 5 non pagate annullate su sua decisione"
metadata:
  type: project
---

- **Segnalazione** (Francesco): «se paghi sei prenotato, invece restano tutte le prenotazioni che inviano al carrello di Stripe». Luca Zesi Live Show: 20 posti «occupati», 17 mai pagati.
- **Corretto e live** → [[reference-eventi-chi-non-paga]], nota 44 di CLAUDE.md, SECURITY inv. 11. Sonda `tests/probe-eventi-pagamento.mjs` (solo locale).
- La prenotazione di prova del 22/09 (di Francesco) liberata al primo giro del codice nuovo.
- **Le 5 vecchie non pagate annullate** su decisione di Francesco («annullale»), passandole a `pending` e lasciando lavorare il cron in produzione (che chiude prima la cassa): posti occupati 20 → 3, tutti pagati. Email partite ai quattro clienti + Francesco.
- ⚠️ Stefania Cricco aveva una prenotazione non pagata (2) e una pagata (1): l'email di annullamento può farle credere di aver perso anche il posto pagato. Detto a Francesco.
- ⚠️ Mio errore di forma: avevo scritto «lasciarle annullare domani, come succederebbe a chiunque non paghi» — falso, per chiunque nuovo sono 30 minuti; le 24 ore valevano solo per le vecchie. Francesco l'ha notato. Non mescolare la regola nuova e il caso ereditato nella stessa frase.
- Il guardiano del deploy ha bloccato un deploy per uno script temporaneo lasciato in `tests/`: cancellare sempre i `_tmp_*`.
- Nessuna migration: ferme alla **129**.
