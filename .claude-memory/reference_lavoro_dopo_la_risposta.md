---
name: reference-lavoro-dopo-la-risposta
description: "Su Vercel il lavoro non atteso dopo il return non è garantito — serve after() di Next; e l'ora della visita è letta nel fuso del server (UTC), non in quello dell'attività"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-01T14:19:17.360Z
---

## Quello che una route fa dopo aver risposto non è garantito

`faiQualcosa().catch(e => console.error(e))` seguito da `return Response.json(...)`
sembra innocuo: la risposta parte subito e il lavoro «continua da solo». Su
Vercel **non è vero**: la funzione può essere congelata appena risposto, e
quello che era rimasto in volo riprende quando l'istanza viene risvegliata — o
mai più.

**Misurato in produzione il 01/09/2026**, cinque prenotazioni identiche:

```
dopo ~3s:  4 righe su 5      ← una mancava
dopo ~30s: 5 righe su 5      ← è arrivata, con mezzo minuto di ritardo
```

Il rimedio è `after()` di `next/server` (stabile dalla 15.1): il lavoro esce
dalla risposta — chi prenota non aspetta — ma la piattaforma tiene viva la
funzione finché non è finito. Applicato in `app/api/booking/public/prenota`.
E dentro `after` l'errore va a `logError(..., { alert: true })`: una riga in
console non la legge nessuno, ed è la stessa classe di
[[reference_guasti_silenziosi]].

⚠️ **È il tipo di difetto che una sonda "fortunata" dichiara sano.** La prima
corsa aspettava 2,5 secondi ed era passata; ripetuta, falliva. Quando una prova
è verde una volta e rossa la successiva **senza che il codice sia cambiato**, la
risposta non è «rilanciamo»: è che si sta misurando qualcosa di non
deterministico. Sonda: `tests/probe-coda-automazioni.mjs`.

⚠️ Il rate limit delle prenotazioni è **12/ora per IP**: due corse di seguito
danno 429 e i conti sembrano peggiorati mentre il codice va benissimo.

## ⏰ Il fuso orario: CHIUSO il 01/09/2026

Qui era annotato come aperto — «10:00» letto nel fuso del server invece che in
quello dell'attività. È stato corretto con la migration 104 (fuso IANA
sull'azienda) e verificato in produzione. Dettaglio in [[reference_fuso_orario]].
