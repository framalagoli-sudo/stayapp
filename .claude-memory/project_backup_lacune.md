---
name: project-backup-lacune
description: "CHIUSO 09/09 — account e immagini ora sono nell archivio (15 account, 62/62 foto); resta da provare il ripristino, e il piano è qui"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8edd7be8-ac09-496b-aa5b-8cf94981b523
  modified: 2026-09-09T15:57:54.377Z
---

# Nell'archivio mancano due cose, e sono grosse

Trovato il **9 settembre 2026** guardando `client-next/lib/backup.js` per
pianificare la prova di ripristino. Non è un sospetto: è la lettura del codice.
Francesco l'ha messa come **priorità della prossima sessione**.

## 1. Gli account di accesso non sono nel backup

`TABLES` elenca 51 tabelle dello schema `public`, e `auth.users` **non è fra
queste**; in tutto il file non c'è nessuna chiamata a `listUsers`. Il backup
salva `profiles` — nome, ruolo, azienda — ma non le credenziali a cui quei
profili sono attaccati.

Conseguenza nello scenario per cui il nostro file esiste (**quando è l'account
Supabase stesso il problema**): si ripristina tutto e **non entra più nessuno**.

⚠️ E c'è un secondo strato, peggiore del primo: `profiles.id` **è** l'id
dell'utente in `auth.users`. Ricreando gli account si otterrebbero id nuovi, e
ogni profilo resterebbe orfano — insieme a tutto ciò che punta al profilo.
**Da verificare**: se l'API admin di Supabase permetta di imporre l'id alla
creazione. Non lo so, e non va dato per scontato: se non si potesse, il
ripristino richiederebbe di riscrivere gli id nei profili e in tutto ciò che li
riferisce.

**Quanti**: 14 account, esclusi gli effimeri delle sonde (misurato 09/09).

## 2. Le immagini dei clienti non sono nel backup

Le foto stanno in **Supabase Storage**, bucket `property-media`. L'unico bucket
che `lib/backup.js` tocca è quello **R2 di destinazione** degli archivi: lo
storage delle immagini non viene mai letto. Un ripristino riporterebbe tutti i
testi dei siti con **tutte le immagini rotte**.

**Quanto**: 41 file, ~23,5 MB nelle cartelle principali (struttura, ristorante,
attivita, blog, eventi) — misurato 09/09. È poco: salvarle è facile, il
problema è solo che nessuno l'ha fatto.

## Perché viene prima della prova di ripristino

Provare il ripristino di questo archivio darebbe una risposta rassicurante a
una domanda incompleta, e **la falsa sicurezza è peggio del non sapere**. Prima
si completa l'archivio, poi si prova quello completo.

È lo stesso difetto del 24/08, quando la lista delle tabelle era rimasta
indietro e mancavano le `pagine`: *un backup incompleto ha lo stesso aspetto di
uno completo finché non serve*. La lista è stata allargata allora, ma nessuno ha
guardato **fuori** dallo schema `public`.

## Come procedere quando si riprende

1. **Completare l'archivio**: account (`auth.admin.listUsers`, senza mai
   scrivere password o token in chiaro nel file — vanno pensate: cosa serve
   davvero per ricostruire un accesso?) e immagini dello storage.
2. **Verificare che ci siano davvero dentro**: estendere
   `tests/verifica-backup.mjs`, che oggi guarda solo le tabelle.
3. **Poi** la prova di ripristino. Il piano concordato il 09/09:
   - bersaglio = **un secondo progetto Supabase sul piano Free**, mai la
     produzione e mai un Postgres locale (metà delle 113 migration usa ruoli e
     schemi che in un Postgres nudo non esistono: la prova sarebbe infedele);
   - credenziali del bersaglio in un file separato da quelle vere;
   - lo script **si rifiuta di scrivere** se l'URL di destinazione è quello di
     produzione — il controllo sta nel codice, non nell'attenzione di chi lancia;
   - ordine di caricamento già dichiarato in `INCIDENTE.md`: aziende → profiles
     → entita → pagine → domini → contatti;
   - **cronometrare**: «quante ore costa» è metà della domanda;
   - criterio di riuscita: **si apre il sito di un cliente e si entra nel
     pannello**. Non «le righe sono entrate».
4. Il file scaricato è il database dei clienti in chiaro: si cancella dal disco
   appena finito.

Vedi [[reference_backup_e_ripristino]], [[reference_guasti_silenziosi]].

---

## ✅ CHIUSO il 09/09/2026 (pomeriggio) — l'archivio è completo

Live e provato in produzione. Ultimo giro:

> Backup completato: `backup-2026-09-09-1717.json.gz` (430 KB), 32 tabelle con
> dati su 51, **15 account di accesso**, **62/62 immagini al sicuro**.

- **Account**: identità e ruolo, mai le credenziali — la verifica ora controlla
  anche che nell'archivio *non* finisca niente che somigli a una password.
  L'`id` si conserva perché `profiles.id` è quello.
- **Immagini**: copiate accanto all'archivio sotto `media/`, solo quelle nuove o
  cambiate di dimensione. A gruppi di cinque: una alla volta se ne copiavano
  quattro in mezzo minuto e la prima copia completa avrebbe richiesto **dieci
  notti**; a gruppi sono entrate tutte in un giro da 38 secondi.
- **Una copia al mese tenuta un anno** (`mensili/`): prima tutto scadeva a 30
  giorni e un problema scoperto al giorno 31 non aveva rete.
- `verifica-backup.mjs` guarda anche fuori dalle tabelle, **provata nei due
  versi**: verde sull'archivio completo, rosso su uno come erano tutti fino a
  stamattina.

### Due difetti trovati provando, che nessuno avrebbe visto

⚠️ **Il pulsante «esegui backup adesso» era rotto dal 29/08**, da quando c'è il
bucket lock: il nome del file è per data, quindi rifare il backup nello stesso
giorno prova a sovrascrivere quello della notte e R2 risponde *«The object is
locked by the bucket policy»*. Nessuno l'aveva mai premuto due volte nello
stesso giorno. Ora il secondo backup del giorno porta anche l'ora.

⚠️ **Il cron del backup non dichiarava `maxDuration`** e usava il default: era
già al limite con 51 tabelle, e con le immagini sarebbe andato in timeout ogni
notte lasciando solo una riga in un log che non legge nessuno.

### Quello che resta

Il **ripristino non è ancora stato provato** — ora però si proverebbe su un
archivio completo, che era il punto. Piano già scritto qui sopra. Prima
domanda a cui rispondere: **si può imporre l'id a un account ricreato?** Se no,
il ripristino deve riscrivere gli id nei profili e in tutto ciò che li riferisce.

**Costo**: zero. R2 regala 10 GB e 1 milione di scritture al mese; l'archivio
completo con 30 giorni di storico e le immagini sta in ~60 MB, cioè lo 0,6% del
piano gratuito. Il PITR di Supabase ($100/mese) **non serve**: copre lo scenario
già coperto dai backup giornalieri inclusi nel Pro.

### Altri due difetti, trovati DOPO aver detto «fatto»

Emersi solo perché il backup è stato rilanciato più volte di fila invece di
provarlo una volta e fidarsi:

⚠️ **La copia mensile era un ramo mai eseguito.** Scattava solo il giorno 1 del
mese, quindi non era mai girata: nessun errore, solo silenzio. E se il giro del
primo fosse fallito, quel mese sarebbe rimasto senza copia. Ora la condizione
non è «è il primo del mese» ma «questo mese ce l'ha, la sua copia?» — chiunque
passi per primo la fa. Così il ramo gira ogni giorno e si può guardare.

⚠️ **Il nome alternativo usava l'ora al minuto**: due backup lanciati a quaranta
secondi di distanza cadevano nello stesso minuto, stesso nome, e il secondo
moriva contro il lock — cioè esattamente il difetto che quel codice doveva
risolvere. Ora arriva ai secondi. Provato: due giri consecutivi, entrambi 200.

### Cosa NON è ancora stato provato (al 09/09 sera)

1. **Nessuno ha mai aperto un archivio VERO** prodotto dal codice nuovo. La
   verifica è stata provata su archivi costruiti a mano con la stessa forma —
   che è il modo sbagliato: *provare in un modo diverso da come il codice gira
   nasconde il difetto invece di rivelarlo*. Le chiavi R2 non sono recuperabili
   in locale (`vercel env pull` scrive `[SENSITIVE]` al posto dei segreti), per
   cui questa verifica **la deve fare Francesco**: scaricare l'ultimo
   `backup-*.json.gz` dal bucket su Cloudflare R2 e lanciare
   `node tests/verifica-backup.mjs <file>` — poi **cancellare il file**, che è
   il database dei clienti in chiaro.
2. **Il cron notturno non ha ancora girato** con il codice nuovo: la prima volta
   è la notte fra il 9 e il 10 settembre. Se qualcosa non va, l'allarme arriva
   per email (tutti i cron ora lo fanno).
