# Se succede qualcosa

Piano di risposta a un incidente di sicurezza su OltreNova.

Questo documento è scritto per essere eseguito **alle tre di notte, da solo, senza
Claude e senza pensare**. Passi numerati, decisioni già prese. Se qualcosa qui non
torna, prevale il buon senso: l'obiettivo è contenere il danno, non seguire un foglio.

> ⚠️ **Da fare adesso, non durante l'incidente**: apri una volta ciascuno dei
> pannelli citati (Vercel, Supabase, Cloudflare, GitHub) e verifica di sapere dove
> stanno i comandi ai punti 1.1–1.4. Un piano provato per la prima volta durante
> un'emergenza non è un piano.

---

## 0. Riconoscere che sta succedendo

Sei qui se hai visto **una** di queste cose:

- dati di clienti spariti, cambiati o comparsi dal nulla
- un accesso al pannello che non riconosci (`/admin/audit-log`)
- un'email di Supabase, Vercel o Cloudflare su un accesso da un luogo inatteso
- i siti dei clienti mostrano contenuti che nessuno di noi ha scritto
- una richiesta di riscatto

**Se invece è solo "il sito non va"**: non è questo il documento. Guarda
`/admin/diagnostica` e i log su Vercel — quasi sempre è un deploy o un fornitore
giù, non un attacco.

---

## 1. Primi quindici minuti — chiudere le porte

L'ordine conta. Non saltare passi per andare a "vedere cosa è successo": prima si
chiude, poi si guarda.

### 1.1 Cambia la password del tuo account principale

Da `fra.malagoli@gmail.com` in giù: se è caduta quella, è caduto tutto il resto.
Verifica che il secondo fattore sia ancora attivo e che non ci siano dispositivi
o app collegate che non riconosci.

### 1.2 Revoca le chiavi di Supabase

Dashboard Supabase → il progetto → impostazioni → sezione **API**.

Va rigenerata la **service role key**. Da quel momento l'applicazione smette di
funzionare — è voluto: meglio ferma che saccheggiata. Poi rimetti la chiave nuova
su Vercel (punto 1.3) e ridistribuisci.

> Se non trovi il comando: cerca "rotate" o "reset" nella pagina delle API. Se non
> esiste, l'alternativa è **mettere il progetto in pausa** dalle impostazioni
> generali, che blocca ogni accesso ai dati.

### 1.3 Cambia tutte le variabili su Vercel

Vercel → progetto `oltrenova-next` → Settings → Environment Variables.

Vanno rigenerate **tutte** quelle che sono segreti, perché chi è entrato lì le ha
viste tutte insieme:

| Variabile | Dove si rigenera |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API (punto 1.2) |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare → R2 → Manage API tokens |
| `RESEND_API_KEY` | Resend → API Keys |
| `CRON_SECRET` | inventane uno nuovo, lungo e casuale |
| `ANTHROPIC_API_KEY` | console Anthropic |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| token WhatsApp / Meta | Meta for Developers |

**Dopo aver cambiato le variabili serve un nuovo deploy**, o il codice continua a
girare con le vecchie: `.\deploy.ps1`.

### 1.4 Metti al sicuro l'archivio

> Dal 29 agosto 2026 il bucket dei backup ha una **regola di blocco**: gli
> oggetti non si cancellano né si sovrascrivono per 30 giorni, **a prescindere
> dalla chiave**. Serve perché la chiave che scrive i backup sta su Vercel
> accanto a quella del database: senza il blocco, un solo furto porterebbe via
> i dati *e* l'archivio da cui ripartire. R2 non offre un permesso di sola
> scrittura — il livello più stretto che scrive include la cancellazione — e il
> blocco del bucket è la difesa che regge davvero.
>
> ⚠️ Con il blocco attivo **il bucket non si può svuotare** finché non si tolgono
> le regole. È voluto: se durante un incidente devi rimuoverle, sappi che stai
> aprendo proprio quella porta.
>
> ⚠️ **La dashboard di Cloudflare dice «successfully deleted» anche quando NON
> ha cancellato niente.** Provato il 29/08/2026: tre tentativi sul backup più
> recente, messaggio di successo ogni volta, e il file sempre lì dopo il
> refresh. È un difetto noto di Cloudflare, non un errore nostro — e il blocco
> ha fatto il suo lavoro. Ma qui dentro conta: **non fidarti del messaggio,
> ricarica la pagina e guarda se il file c'è ancora.**
>
> Le regole di blocco **vincono sempre** su quelle di scadenza: se il lifecycle
> vuole cancellare a 31 giorni ma il blocco ne pretende 30, l'oggetto sparisce
> al 31° — mai prima.

Cloudflare → R2 → il bucket dei backup.

Se la chiave R2 era compromessa, **scarica subito sul tuo computer gli ultimi due
o tre backup** prima di fare qualsiasi altra cosa. Un attaccante che ha ancora
accesso può cancellarli mentre tu lavori.

### 1.5 Se serve, spegni

Se i siti stanno servendo contenuti manomessi, è meglio offline che compromessi:
Vercel → Deployments → prendi un deployment precedente e fai **Rollback**, oppure
Settings → **Pause project**.

---

## 2. Capire cosa è stato toccato

Ora che è chiuso, si guarda.

### 2.1 Chi è entrato

- `/admin/audit-log` nel pannello: registra le azioni degli utenti
- Supabase → Logs: le interrogazioni al database
- Vercel → Logs: le chiamate arrivate all'applicazione
- Supabase → Authentication → Users: cerca utenti che non riconosci, e in
  particolare **profili con ruolo diverso da quello che dovrebbero avere**

### 2.2 Se hanno letto dati dei clienti

Le cose che fanno male se escono, in ordine: **contatti** (nomi ed email dei
clienti dei nostri clienti), **profiles**, **privacy_data** delle entità
(codici fiscali dei titolari), le credenziali WiFi delle strutture.

Segnati **quali** e **di chi**: serve al punto 4.

### 2.3 Se hanno modificato o cancellato

Confronta la produzione con l'ultimo backup buono:

```bash
cd tests
node verifica-backup.mjs C:\percorso\backup-AAAA-MM-GG.json.gz
```

Lo script ti dice, tabella per tabella, cosa c'è nell'archivio e cosa c'è in
produzione. Le differenze sono ciò che è stato toccato.

> **L'archivio è stato provato davvero il 29 agosto 2026** — non «esiste», ma
> *da lì si riparte*: `backup-2026-08-29.json.gz`, 51 tabelle, esito **verde**.
> Aziende, utenti, entità, pagine, domini e contatti identici alla produzione;
> 26 pagine su 29 con i contenuti dentro; 16 domini presenti, quindi i clienti
> resterebbero raggiungibili al loro indirizzo. L'unico scarto —
> `event_bookings` 6 contro 7 — è una prenotazione arrivata **dopo** le 05:00,
> quando l'archivio era già chiuso: non è una perdita.
>
> ⚠️ **Da rifare ogni pochi mesi.** Un backup provato una volta dice che
> funzionava quel giorno. Nell'agosto 2026 ne salvava 1504 righe su 2908, e
> girava così da mesi senza che nessuno se ne accorgesse.
>
> ⚠️ **Il file scaricato è il database dei clienti in chiaro.** Cancellalo dal
> disco appena finita la verifica. `backup/` e `*.json.gz` sono in `.gitignore`
> perché non finiscano su GitHub con un `git add -A`.

---

## 3. Tornare in piedi

### 3.1 Prima di ripristinare

**Non sovrascrivere niente finché non hai una copia dello stato attuale**, anche
se è compromesso: serve a capire cosa è successo, e a volte contiene dati
legittimi arrivati dopo l'attacco.

### 3.2 Ripristino

✅ **Provato per davvero il 13/09/2026**, su un progetto Supabase vuoto, con
l'archivio della notte prima. Non è più una speranza: è una procedura con dei
tempi misurati.

```
cd tests
node verifica-backup.mjs <archivio.json.gz>              # l'archivio è sano?
node ripristino.mjs <archivio.json.gz>                   # simula
node ripristino.mjs <archivio.json.gz> --esegui --azzera # esegue
```

Lo script fa tutto nell'ordine giusto: schema (le migration una per una) →
account → dati (aziende, entità, profili, pagine, domini, contatti, poi il
resto) → verifica. Le credenziali del bersaglio stanno in
`tests/.env.ripristino`, e lo script **si rifiuta di scrivere sulla produzione**.

**Quanto costa**: schema 6 secondi, account 3, dati 4 — **meno di un minuto**
per 5634 righe e 14 account. Il tempo vero è quello di creare il progetto
Supabase e rimettere le chiavi nel deploy.

**Cosa è risultato vero nella prova:**
- 117 migration su 117 passano (dopo le correzioni `078b` e `115` — prima erano
  104: mancavano 4 tabelle e 12 colonne che nessuno aveva mai scritto);
- gli account si ricreano **conservando il loro id**: i profili restano
  attaccati, e questo era il dubbio più grosso;
- i siti dei clienti si aprono e **si entra nel pannello**.

**Le immagini sono un secondo comando** (provato il 13/09):

```
node ripristino-immagini.mjs            # simula
node ripristino-immagini.mjs --esegui   # esegue
```

Fa due cose, e **la seconda è quella che ci si dimentica**: copia i file nello
Storage del progetto nuovo, poi **riscrive gli indirizzi dentro il database** —
in ogni colonna di testo e JSON di ogni tabella, perché le foto stanno anche
dentro i blocchi delle pagine, nelle gallerie e nei temi. 65 file in 13 secondi.

> ⚠️ Senza il secondo passo il sito torna su con le foto **apparentemente**
> funzionanti finché il vecchio progetto è ancora vivo, e morte da lì in poi:
> è il tranello che la prova ha scoperto.
>
Le foto si prendono **dall'archivio su R2** — cioè da dove ci sarebbero davvero
il giorno in cui Supabase non esiste più. Servono quattro righe in
`tests/.env.ripristino`, da un token R2 con permesso **`Object Read only`**
sul solo bucket dei backup (Cloudflare → R2 → Manage API tokens):

```
RIPRISTINO_R2_ACCOUNT_ID=...        (anche l'indirizzo intero va bene)
RIPRISTINO_R2_ACCESS_KEY_ID=...
RIPRISTINO_R2_SECRET_ACCESS_KEY=...
RIPRISTINO_R2_BUCKET=stayapp-backups
```

Senza quelle righe lo script ripiega sullo Storage di produzione e lo dichiara
a schermo — utile per provare, inutile il giorno vero.

**Cosa NON torna da solo, e va fatto a mano:**
1. ⚠️ **Il secondo fattore.** I fattori TOTP vivono in `auth.mfa_factors` e non
   sono nell'archivio: dopo un ripristino ogni persona deve riattivare il 2FA
   al primo accesso (il percorso guidato esiste già).
2. ⚠️ **Le password.** L'archivio non le contiene di proposito: gli account
   rinascono senza, e si entra con «Password dimenticata».
3. ⚠️ **Un'azienda di troppo.** La migration `006` semina «StayApp Development»
   con un id nuovo: dopo il ripristino ce n'è una doppia e vuota, da cancellare.

> Supabase Pro conserva anche i propri backup automatici del database
> (Dashboard → **Database → Backups**), e per rimettere in piedi *lo stesso*
> progetto restano la strada più rapida. Il nostro archivio serve quando è
> l'account Supabase **stesso** il problema — ed è il caso che abbiamo provato.

### 3.3 Il ripristino è finito solo quando passa questa lista

⛔ **Non fidarti di «i siti si aprono e il pannello carica».** Il 13/09/2026 la
prova è stata dichiarata riuscita con le sole **letture** verificate: nessuno
aveva provato a scrivere niente, né l'app del QR, né i moduli pubblici — e
l'ambiente di prova era già stato cancellato quando ce ne siamo accorti. Un
servizio da cui si legge e basta non è ripristinato.

Con l'app puntata al progetto ripristinato:

```bash
cd client-next
SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run dev -- -p 3002
cd ../tests && node verifica-ripristino.mjs
```

Controlla, in ordine: i siti dei clienti · le foto (dal progetto **nuovo**, non
dal vecchio) · l'**app del QR**, che è codice di browser e non si vede con
`curl` · un ospite che **manda una richiesta** e la ritrova nel database · il
pannello che **crea e modifica** un contenuto, e quel contenuto che compare sul
sito · l'accesso al pannello e le sue sezioni. Quello che scrive lo cancella.

**Finché questa lista non è tutta verde, il ripristino non è finito** — e
l'ambiente di prova non si cancella.

### 3.4 Rimettere in moto

- nuovo deploy con le chiavi nuove: `.\deploy.ps1`
- controlla che le sonde di sicurezza a fine deploy siano verdi
- `/admin/diagnostica` per verificare che i processi automatici ripartano
- apri **davvero** due o tre siti di clienti, non fidarti dei numeri

---

## 4. Obblighi di legge — hai 72 ore

Se sono usciti **dati personali** (nomi, email, telefoni, codici fiscali — anche
solo dei contatti dei clienti), scatta il GDPR e il tempo è poco.

- **Entro 72 ore dal momento in cui te ne accorgi**: notifica al **Garante per la
  protezione dei dati personali** — `garanteprivacy.it`, sezione per la
  notifica di violazione (data breach). Va fatta anche se non sei certo
  dell'entità: si può integrare dopo.
- **Se il rischio per le persone è elevato**: vanno avvisate anche le persone
  coinvolte, senza ingiustificato ritardo.
- **Avvisa i clienti** le cui entità sono state toccate. Sono loro il titolare del
  trattamento verso i propri ospiti: senza la tua comunicazione non possono fare
  la propria parte.
- **Scrivi tutto mentre lo fai**: cosa è successo, quando l'hai scoperto, cosa hai
  fatto e a che ora. Serve al Garante e serve a te.

> Non è una formalità: il ritardo nella notifica è sanzionato a sé, a prescindere
> dalla violazione.

---

## 5. Dopo

- Trova **come** sono entrati. Se non lo trovi, rientrano.
- Chiudi quella strada e scrivi una sonda in `tests/` che verifichi che resti chiusa.
- Aggiorna questo documento con quello che hai imparato.
- Considera un controllo esterno: chi ha scritto il sistema ha sempre punti ciechi.

---

## Le quattro porte di casa

Tutta la sicurezza di OltreNova si regge su questi quattro accessi. Se cade uno,
il resto non conta.

| Servizio | Cosa protegge | Secondo fattore |
|---|---|---|
| **Vercel** | tutte le chiavi segrete, il codice in produzione | da verificare |
| **Supabase** | il database, tutti i dati dei clienti | da verificare |
| **Cloudflare** | i domini, i DNS, l'archivio dei backup | da verificare |
| **GitHub** | il codice sorgente | da verificare |

Verificali oggi, non durante un incidente. E teniamoli scritti come verificati,
con la data.

---

*Ultimo aggiornamento: 29 agosto 2026 (archivio provato, blocco del bucket attivo). Da rivedere dopo ogni incidente e a ogni
cambio di fornitore.*
