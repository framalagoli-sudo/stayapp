---
name: reference_documento_progetto
description: "PROGETTO.md è il documento per chi subentra da zero (erede, socio, acquirente). Si aggiorna su EVENTI, non a calendario — e un controllo meccanico blocca il deploy se nasce una env var non documentata."
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-29T19:46:20.035Z
---

Chiesto da Francesco il **29/08/2026**: *«immagina che domani io non ci sia più e
vada in mano a mio figlio che deve rifare tutto da zero»*. Nato dopo aver notato
che, se venisse meno lui o dovesse vendere, **quel documento è la prima cosa che
gli chiederebbero**.

## Cosa contiene `PROGETTO.md` (radice del repo)

I sei fornitori uno per uno in ordine di quanto fa male perderli — Supabase,
Vercel, Cloudflare, Resend, GitHub, poi gli accessori — con **costo, cosa si
rompe se cade, dove si entra**. Poi architettura, dati con i numeri veri, i sei
processi automatici, backup e ripristino, procedure di lavoro, **tutte le chiavi
con la loro provenienza (nomi soltanto, mai i valori)**, i primi sette giorni di
chi subentra, e un capitolo onesto su cosa NON funziona ancora.

Le prime tre parti si leggono **senza saper programmare**: è il requisito che ha
guidato la scrittura.

## ⚠️ Il difetto strutturale, scritto dentro al documento stesso

`PROGETTO.md` **vive dentro GitHub, che è uno degli accessi che descrive**. Chi
non entra in GitHub non lo legge — ed è esattamente chi subentra all'improvviso.
Serve una copia **fuori**: stampata o su chiavetta, più un foglio separato con le
credenziali in cassetta di sicurezza. Nel file non ci sono chiavi, di proposito.

E quasi tutti i fornitori recuperano l'accesso via email: **se la casella di
posta principale è irraggiungibile, gli accessi non si recuperano.**

## Quando si aggiorna — eventi, non calendario

Francesco: *«oppure crea delle condizioni in cui lo aggiorniamo con un senso»*.
Aveva ragione: una scadenza a calendario si dimentica. Un documento come questo
non muore per vecchiaia, muore perché **qualcuno collega un fornitore nuovo e
nessuno lo scrive**.

Gli eventi stanno in `PROGETTO.md` §13. I due che contano di più: **fornitore
nuovo** e **variabile d'ambiente nuova**.

## Il controllo che non dipende dalla memoria

`tests/verifica-regole.mjs` confronta le `process.env.*` usate nel codice con
quelle elencate in `PROGETTO.md` e **blocca il deploy** se ne trova una non
documentata. Una env var nuova è quasi sempre un fornitore nuovo: è il segnale
meccanico più affidabile che è entrato un collegamento esterno.

Le eccezioni (indirizzi del servizio, interruttori interni) stanno in
`NON_FORNITORI` dentro lo script, con il motivo scritto.

✅ Ha trovato una lacuna **al primo giro**, sul documento appena scritto:
`NEXT_PUBLIC_SUPABASE_ANON_KEY` era abbreviata e il nome completo non compariva.

## Quello che il documento NON sa, e solo Francesco può scrivere

Forma giuridica e P.IVA · contratti coi clienti · con quale carta si paga
ciascun fornitore · accesso alla casella di posta principale · eventuali
disposizioni successorie. Sono le informazioni che servono **per prime** a chi
subentra. Marcate nel testo come «da completare — solo Francesco può».

Vedi [[reference_backup_e_ripristino]], [[feedback_autorizzare_cambi_importanti]].
