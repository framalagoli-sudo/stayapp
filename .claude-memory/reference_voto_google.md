---
name: reference-voto-google
description: Il voto reale da Google sui siti dei clienti — costa solo se supera 1000 letture/mese, e la cadenza si autoregola per non superarle mai; TripAdvisor rimandato perché la sua API è stata dismessa
metadata:
  type: reference
---

**Il punteggio Google arriva dalla fonte, non da un campo di testo.** Prima
l'unico modo di mostrare «4,8 su Google» era scriverlo a mano: vero il giorno
che lo scrivi, falso il mese dopo, e chi legge non ha modo di saperlo. Era il
dubbio di Francesco sui pulsanti — *«se dicono il vero»* — e la risposta non è
fidarsi: è **non far scrivere il numero a nessuno**.

Live dal 02/09/2026 (migration `105`). ⚠️ **Serve `GOOGLE_PLACES_API_KEY` su
Vercel**: finché manca, il pannello lo dice e il blocco non compare.

## I pezzi

- `lib/recensioni-esterne.js` — l'unico posto che parla con Google. Fornitore
  **sostituibile**, come per i domini.
- `/api/recensioni/esterne` — cerca la scheda, collega, scollega.
- `/api/cron/recensioni-esterne` — rilegge (cron alle 4).
- Blocco **«Voto su Google»** nel site builder; il dato arriva alle pagine
  perché `recensioni_esterne` è in `CAMPI_ENTITA` di `guest-data.js`.

## 💶 I costi: gratis, e non per fortuna

Dal **marzo 2025** Google non ha più il credito unico da 200 $: **ogni livello
ha la sua quota e le quote non si sommano**. `rating` e `userRatingCount` cadono
in **Enterprise** → **1.000 letture gratis al mese**, poi ~35 $ ogni mille.

Una lettura = un'attività aggiornata una volta. Con 15 attività al giorno: 450.

⛔ **Con una cadenza fissa il costo si accenderebbe da solo alla 34ª attività
collegata** — mentre si vendono clienti, cioè nel modo peggiore. Per questo
`scadenzaOre(n)` calcola l'intervallo sul numero di schede collegate:

```
  15 → ogni giorno    ·  100 → ogni 3 giorni  ·  500 → ogni 15 giorni
```

Le letture restano **≤ 1000/mese comunque vada**. Un punteggio di tre giorni fa
è comunque vero e datato. Per sforare di proposito: `LETTURE_GRATUITE_AL_MESE`.
Il cron risponde con `letture_stimate_al_mese` accanto a `gratuite_al_mese`.

## ⚠️ Le cose da non rompere

- **La data non è un dettaglio, è la funzione.** Un punteggio senza data finge
  di essere di adesso. Il blocco la mostra, e `daMostrare()` restituisce `null`
  se manca.
- **Nell'editor non esiste un campo dove digitare il voto**, deliberatamente: se
  ci fosse, tornerebbe il problema da cui siamo partiti.
- **Se una lettura fallisce il valore vecchio RESTA**, con l'errore accanto:
  cancellarlo farebbe sparire il voto dal sito di un cliente per un problema di
  rete.
- **La maschera dei campi decide quanto costa**: chiedere a Google più di
  quello che serve alza il livello di prezzo.

## TripAdvisor: rimandato di proposito

La loro **Content API è stata dismessa il 31/08/2026** e la sostituta (**Terra**)
ha tempi di migrazione ancora incerti. Costruirci sopra oggi vorrebbe dire
rifarlo fra un mese. La struttura lo accoglie senza toccare né il database né
chi legge: un fornitore in più in `FORNITORI` e una funzione `leggi`.

Vedi [[reference_recensioni]], [[reference_documento_progetto]] (tabella costi in §8).
