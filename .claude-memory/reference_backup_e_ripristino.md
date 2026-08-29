---
name: reference_backup_e_ripristino
description: La chiave che scrive i backup non deve poterli cancellare; e un archivio non provato non è un archivio — verifica-backup.mjs lo apre e lo confronta con la produzione
metadata:
  type: reference
---

**Il rischio peggiore non è che qualcuno legga: è che distrugga e non resti niente.**
Tutte le chiavi stanno insieme nelle variabili di Vercel — quella del database e quella di
R2. Il codice del backup usava R2 anche per cancellare i file scaduti, il che **obbliga**
quella chiave ad avere il permesso di cancellazione: un solo furto e si perde il database
**e** l'archivio.

**Chiuso il 29/08/2026 — ma NON come previsto.** R2 **non ha un permesso di sola
scrittura**: i livelli sono quattro (*Admin Read & Write*, *Admin Read only*, *Object
Read & Write*, *Object Read only*) e il più stretto che scrive include la cancellazione.
Il consiglio dato prima non era realizzabile.

La difesa che regge è un'altra: **Bucket lock** su Cloudflare R2 — gli oggetti non si
cancellano né si sovrascrivono per 30 giorni **a prescindere dalla chiave**, più una
regola di *lifecycle* a 31 giorni per la scadenza. Le regole di blocco **vincono sempre**
su quelle di scadenza. ⚠️ Col blocco attivo il bucket **non si può svuotare**.

⚠️ **La dashboard Cloudflare dice «successfully deleted» anche quando non cancella
niente** — difetto noto di Cloudflare. Provato: tre tentativi, messaggio di successo ogni
volta, file sempre lì. **Non fidarsi del messaggio: ricaricare e guardare.**

✅ **Archivio provato davvero il 29/08/2026**: `backup-2026-08-29.json.gz`, 51 tabelle,
**verde**. Le sei tabelle vitali identiche alla produzione, 26 pagine su 29 coi contenuti,
16 domini. Unico scarto `event_bookings` 6 vs 7 = una prenotazione arrivata dopo le 05:00.
⚠️ Da rifare ogni pochi mesi: provato una volta dice solo che funzionava *quel giorno*.

⚠️ **Il file scaricato è il database dei clienti in chiaro**: si cancella dal disco appena
finita la verifica. `backup/` e `*.json.gz` sono in `.gitignore` dal 29/08 — prima non lo
erano, e un `git add -A` l'avrebbe pubblicato su GitHub.

**`tests/verifica-backup.mjs`** — apre un backup scaricato da R2 e risponde a una domanda
sola: da qui si torna in piedi? Confronta riga per riga con la produzione, segnala le
tabelle che l'archivio **non nomina proprio** (il difetto del 24/08: la lista era rimasta
indietro e mancavano le pagine dei siti) e guarda dentro i dati — slug delle entità,
blocchi delle pagine. *Un archivio con i conteggi giusti e i contenuti vuoti passerebbe
qualunque controllo numerico.*
Provato in **entrambe** le direzioni: verde su archivio integro, rosso sui quattro modi
tipici di rompersi. Uno script che dice sempre verde è peggio di niente.

**`INCIDENTE.md`** (+ artifact per il telefono): cosa fare alle tre di notte, da soli.
Regola sopra tutte: **prima si chiude, poi si guarda**. Contiene le chiavi da rigenerare e
dove, l'ordine di ripristino delle tabelle (aziende → profiles → entita → pagine → domini
→ contatti) e le **72 ore del GDPR**, che si pagano a parte a prescindere dalla violazione.

⚠️ Supabase Pro ha backup automatici propri (Dashboard → Database → Backups): per un
ripristino completo sono più comodi del nostro file. Il nostro serve per recuperare **solo
alcune tabelle**, o quando è l'account Supabase stesso il problema.
