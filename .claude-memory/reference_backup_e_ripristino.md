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

## ⚠️ 09/09/2026 — l'archivio è incompleto fuori dallo schema `public`

Guardando `lib/backup.js` per pianificare la prova di ripristino: mancano gli
**account di accesso** (`auth.users`) e le **immagini dei clienti** (Supabase
Storage). La verifica del 29/08 non poteva accorgersene, perché confronta
l'archivio con le tabelle — e quelle due cose non sono tabelle di `public`.
Da un ripristino non entrerebbe nessuno e i siti avrebbero le foto rotte.
Priorità della prossima sessione → [[project_backup_lacune]].

## ✅ IL RIPRISTINO È STATO PROVATO (13/09/2026)

Su un progetto Supabase vuoto, con l'archivio della notte prima. Strumenti:
`tests/verifica-backup.mjs` (l'archivio è sano) e **`tests/ripristino.mjs`**
(schema → account → dati → verifica; `--azzera` rifà da vuoto; la sicura che
rifiuta la produzione è provata). Credenziali in `tests/.env.ripristino`
(gitignored). **Meno di un minuto**: schema 6s, account 3s, dati 4s.

**Risposta alla domanda aperta da luglio: SÌ, l'id di un account si può
imporre** (`auth.admin.createUser({ id })`) — 14/14 conservati, quindi i
profili restano attaccati.

⛔ **La scoperta grossa: le migration NON ricostruivano il database.** Mancavano
4 tabelle e 12 colonne aggiunte a mano dal pannello negli anni. Tutto partiva da
`properties.whatsapp`, che fa fallire la `079` e con lei dieci migration in fila
— cioè `entita`, la tabella centrale. Corretto con `078b` (gira PRIMA della 079)
e `115`. Dopo: **117/117**, siti dei clienti aperti, pannello dentro.

⚠️ **Cosa NON torna da solo** (in INCIDENTE.md §3.2): le immagini — e non basta
ricaricarle, **gli indirizzi salvati nel database contengono la sigla del
progetto vecchio e vanno riscritti**; i fattori 2FA (`auth.mfa_factors` non è
nell'archivio: tutti riattivano al primo accesso); le password (di proposito:
si entra da «Password dimenticata»); un'azienda doppia seminata dalla `006`.

⚠️ Un progetto ripristinato **contiene una copia completa dei dati personali dei
clienti**: si cancella appena finita la prova.

### Le foto: provate anche quelle (13/09, stesso giorno)

`tests/ripristino-immagini.mjs` — **due passi, e il secondo si dimentica**:
copia i file nello Storage del progetto nuovo, poi **riscrive gli indirizzi
dentro il database** (ogni colonna testo/JSON di ogni tabella: le foto stanno
anche nei blocchi delle pagine, gallerie, temi). 65 file, 33,7 MB, 13 secondi.
Verificato col browser: 8 immagini su 3 pagine, **tutte dal progetto nuovo**.

⚠️ Provato con lo **Storage di produzione** come sorgente, perché le chiavi R2
non sono in locale: «scaricare da R2» resta l'unico pezzo non provato. Con le
chiavi R2 nel file `.env.ripristino` lo script le usa da solo.
