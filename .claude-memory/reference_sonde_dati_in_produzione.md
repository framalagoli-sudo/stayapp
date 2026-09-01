---
name: reference-sonde-dati-in-produzione
description: Le sonde girano sul database vero — la pulizia va fatta per azienda, non per gli id raccolti, o una sonda interrotta lascia residui per sempre
metadata:
  type: reference
---

**Le sonde girano sul database di produzione: quello che creano e non cancellano
resta lì per sempre.** Non è un rischio teorico — il 01/09/2026 sono state
trovate **tre aziende `ZZ-`** in produzione, con dentro prenotazioni, contatti e
automazioni.

## Perché la pulizia «ordinata» non basta

Lo schema abituale — un array di id via via che si creano, e il `finally` che li
ripercorre — copre solo ciò che è stato **registrato**. Se la sonda si ferma a
metà (un `throw`, un 429, un timeout), tutto quello che è nato dopo l'ultimo id
raccolto resta orfano. E il `delete` sull'azienda **fallisce comunque** per
chiave esterna, perché quei figli sono ancora lì.

## La forma giusta

`tests/pulizia-prove.mjs` → `svuotaAzienda(id)`: cancella **per azienda**,
nell'ordine che le chiavi esterne accettano (prima chi punta, poi chi è
puntato). Le sonde la importano nel `finally`.

Come strumento a mano: `node pulizia-prove.mjs` mostra soltanto,
`--esegui` cancella. ⛔ Il criterio è **solo** il marchio `ZZ-` che le sonde si
danno da sole: mai un filtro più largo, qui ci sono clienti veri.

## ⚠️ Due trappole trovate scrivendolo

1. **Un file che esporta una funzione e insieme fa qualcosa al caricamento è una
   trappola.** La prima versione faceva anche la ricerca, col suo
   `process.exit(0)`: importarla da una sonda la spegneva **prima ancora che
   cominciasse**, senza dire perché. Ora lo script parte solo se lanciato a mano.
2. **`process.exit()` col client Supabase ancora aperto** fa uscire Node con un
   «Assertion failed … src\win\async.c» di libuv, su Windows. Sembra un guasto e
   non lo è: si lascia finire il programma da solo.

Vedi [[feedback_sandbox_non_e_live]].
