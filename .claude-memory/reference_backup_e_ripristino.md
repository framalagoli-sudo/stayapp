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

**Ora** (25/08/2026) la cancellazione si prova e, se il permesso manca, non è un errore:
`pulizia: 'non permessa (chiave in sola scrittura: corretto)'`. Questo permette di dare
alla chiave su Vercel il **solo permesso di scrittura** e spostare la scadenza su una
regola del bucket Cloudflare, dove serve un altro accesso per toglierla.
👉 La configurazione su Cloudflare è **a carico di Francesco**, il codice è pronto.

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
