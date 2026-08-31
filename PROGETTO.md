# OltreNova — documento di progetto

**A chi legge.** Questo documento è scritto per una persona che non ha mai visto
questo sistema e deve prenderlo in mano: un figlio, un socio, un tecnico
subentrato, un acquirente in fase di verifica. Non dà per scontato niente.

Non serve saper programmare per leggere le prime tre parti. Servono per capire
**cosa possiedi, quanto costa tenerlo acceso, e cosa si rompe se smetti di
pagarlo**.

> ⚠️ **Questo documento non contiene password né chiavi.** Dice *dove* stanno e
> *come si rigenerano*. Se qualcuno ti chiede di incollargli una chiave presa da
> qui, non ce ne sono.

> 🔴 **Leggi subito «Il problema dell'accesso»** in fondo. Questo file vive
> dentro GitHub, che è uno degli accessi che descrive: se nessuno può entrare in
> GitHub, nessuno può leggere queste istruzioni. Va tenuta una copia fuori.

*Aggiornato al 29 agosto 2026.*

---

## 1. Cos'è OltreNova

Una piattaforma in affitto (SaaS) per **qualsiasi attività di servizi**: hotel,
ristoranti, noleggi, studi professionali, palestre, agenzie, negozi. Il cliente
paga un abbonamento e ottiene:

- un **sito web** che costruisce da solo, anche con l'aiuto dell'intelligenza
  artificiale, con il proprio dominio
- una **app** che i suoi clienti aprono inquadrando un QR code
- gli strumenti per lavorare: contatti, prenotazioni, eventi, offerte, catalogo
  prodotti, newsletter, blog, moduli, statistiche

Il nome nel codice di alcune cose (`struttura`, `ristorante`, `attivita`) è un
residuo storico: sono i primi tre modelli di partenza, non un limite. **Il tipo
di attività non limita le funzioni**: decide solo l'indirizzo pubblico e cosa
trova già acceso il primo giorno.

**Chi lo usa oggi**: 11 aziende clienti, 15 attività, 16 domini attivi, 49
contatti nei CRM dei clienti, 29 pagine web pubblicate. Numeri piccoli: il
prodotto è maturo, il mercato è appena aperto.

**Chi lo ha scritto**: Francesco Malagoli, unico proprietario e unico
amministratore. Non c'è un team. Questo è il rischio principale del progetto e
il motivo per cui esiste questo documento.

---

## 2. I fornitori — chi tiene acceso cosa

Sei fornitori esterni. Se cade uno, cade una parte precisa del servizio. Sono
elencati **in ordine di quanto fa male perderli**.

### 2.1 Supabase — il database *(critico assoluto)*

**Cosa fa**: contiene *tutti* i dati. Le aziende clienti, i loro utenti, i loro
siti, i loro contatti, le prenotazioni. Gestisce anche il login al pannello.

**Se cade**: il servizio è fermo. Non «lento»: fermo. Nessun sito dei clienti si
apre, nessuno entra nel pannello.

**Se lo perdi davvero** (account chiuso, dati cancellati): si riparte
dall'archivio giornaliero su Cloudflare R2 — vedi §6.

**Piano e costo**: Supabase **Pro, 25 $/mese**. Il piano gratuito non basta: si
sospende da solo dopo una settimana di inattività e non ha backup automatici.

**Dove si entra**: `supabase.com` → account di Francesco.

**Cosa contiene di delicato**: nomi, email e telefoni dei clienti *dei nostri
clienti*; i dati fiscali dei titolari (`privacy_data`); le password del WiFi
delle strutture. È materiale da GDPR: se esce, ci sono 72 ore per denunciarlo.

### 2.2 Vercel — dove gira il programma *(critico assoluto)*

**Cosa fa**: ospita il sito, il pannello e tutte le 207 funzioni di servizio.
Custodisce **tutte le chiavi segrete** degli altri fornitori. Fa partire i sei
processi automatici (§5).

**Se cade**: tutto offline, ma i dati restano al sicuro su Supabase.

**Piano e costo**: Vercel **Pro, 20 $/mese**.

**Progetto giusto**: `oltrenova-next`. ⚠️ Sull'account esiste anche un vecchio
progetto `stayapp`, **dismesso**: non usarlo, pubblicherebbe una versione morta.

**Attenzione**: chi entra qui vede in chiaro le chiavi di *tutti* gli altri
fornitori. È la porta più preziosa del sistema.

### 2.3 Cloudflare — i domini e l'archivio *(critico)*

Fa **due lavori distinti**:

1. **DNS e domini**: fa arrivare i visitatori ai siti dei clienti. Se cade, i
   siti risultano irraggiungibili anche se il programma funziona.
2. **R2 — l'archivio dei backup**: ogni notte alle 3 una copia completa del
   database finisce lì.

**Piano e costo**: **gratuito** per l'uso attuale (R2 ha una franchigia
generosa).

**Protezione attiva** (dal 29/08/2026): il bucket dei backup ha una **regola di
blocco a 30 giorni**. Gli oggetti non si cancellano né si sovrascrivono, *a
prescindere dalla chiave*. Serve perché la chiave che scrive i backup sta su
Vercel accanto a quella del database: senza il blocco, un solo furto porterebbe
via i dati **e** l'archivio.

⚠️ Con il blocco attivo **il bucket non si può svuotare** finché non si tolgono
le regole. E la dashboard di Cloudflare dice «successfully deleted» anche quando
non ha cancellato niente: **ricarica la pagina e guarda se il file c'è ancora**.

### 2.4 Resend — le email *(importante)*

**Cosa fa**: manda tutte le email — conferme, notifiche ai titolari, newsletter,
reimpostazione password.

**Se cade**: il servizio funziona ma nessuno riceve più niente. È un guasto
**silenzioso**: nessuno se ne accorge finché un cliente non si lamenta.

**Piano e costo**: **gratuito** al volume attuale.

**Dominio verificato**: `oltrenova.com`, con DMARC in quarantena.

⚠️ **Gli indirizzi dei webhook vanno registrati su `www.oltrenova.com`, mai
sull'apex.** L'apex risponde con un redirect, e per chi consegna i webhook un
redirect è una consegna fallita. Il webhook dei rimbalzi è rimasto muto **dal 9
luglio al 23 agosto 2026** per questo motivo, e Resend l'ha disattivato da solo.

### 2.5 GitHub — il codice sorgente *(importante)*

**Cosa fa**: custodisce tutto il codice e la sua storia. Repository
`framalagoli-sudo/stayapp`, ramo principale `main`.

**Se cade**: il servizio continua a girare — Vercel ha già la sua copia — ma non
si può più modificare nulla in sicurezza.

**Costo**: gratuito.

⚠️ Il collegamento automatico GitHub → Vercel è **spento di proposito**: il
deploy si lancia a mano, così girano sempre i controlli (§7).

### 2.6 Gli altri — utili, non vitali

| Fornitore | A cosa serve | Se cade |
|---|---|---|
| **Anthropic** (Claude) | costruttore di siti con l'AI, traduzioni, chatbot, blog automatico | quelle funzioni si spengono, il resto vive. **A consumo**: si paga quel che si usa |
| **Stripe** | pagamenti del negozio online | ⚠️ **non è mai stato collegato**: il codice esiste ma su Vercel non c'è nessuna chiave Stripe, quindi il checkout non è mai partito. Verificato il 31/08/2026 |
| **Meta / WhatsApp** | canale WhatsApp | **oggi non è attivo**: nessun account collegato, la verifica Meta è ferma |
| **Unsplash** | fotografie per il costruttore di siti | si scelgono le foto a mano |
| **Google** | collegamento con Google Calendar | quel collegamento si spegne |
| **Cloudflare Turnstile** | filtro anti-robot sui moduli | i moduli restano aperti. È già impostato in modo **morbido**: segnala e non blocca, perché in modalità severa bloccava clienti veri |
| **Abstract API** | controlla che le email esistano | si accettano email non verificate |

### 2.7 Il conto totale

**Circa 45 $ al mese** di costi fissi (Supabase Pro 25 + Vercel Pro 20), più
l'uso dell'intelligenza artificiale, che dipende da quanto la si usa e ha un
tetto impostato nel codice.

> ⚠️ **Da completare — solo Francesco può**: con quale carta si paga ciascun
> fornitore, con quale email è intestato ogni account, e dove si registrano
> queste spese in contabilità. Senza, chi subentra scopre i pagamenti quando
> saltano.

---

## 3. Com'è fatto, in parole semplici

Un solo programma fa tutto: le pagine che si vedono e le funzioni che lavorano
dietro. Non ci sono due sistemi da tenere allineati.

```
   il visitatore                     il cliente che gestisce
        │                                     │
        ▼                                     ▼
 ┌──────────────────────────────────────────────────┐
 │  Il programma (Next.js) — ospitato su Vercel     │
 │  · i siti pubblici    · l'app del QR code        │
 │  · il pannello        · 207 funzioni di servizio │
 └──────────────────┬───────────────────────────────┘
                    │
     ┌──────────────┼───────────────┬──────────────┐
     ▼              ▼               ▼              ▼
  Supabase      Cloudflare       Resend       Anthropic
  i dati        domini+archivio   email       l'AI
```

**Una regola di sicurezza da capire prima di toccare il codice**: le funzioni di
servizio usano una chiave che *scavalca* le protezioni del database. Vuol dire
che la separazione fra un cliente e l'altro **dipende interamente dai controlli
scritti nel codice**. Ogni funzione deve verificare chi sta chiedendo e a quale
azienda appartiene. Un controllo dimenticato = i dati di un cliente visibili a
un altro. Il dettaglio sta in `SECURITY.md`.

**Dove sta cosa nel repository**:

| Cartella | Contenuto |
|---|---|
| `client-next/` | **tutto il codice vivo**: pagine, pannello, funzioni di servizio |
| `supabase/migrations/` | le 97 modifiche alla struttura del database, in ordine |
| `tests/` | i controlli automatici e le sonde diagnostiche |
| i file `.md` in radice | la documentazione (vedi §9) |

---

## 4. I dati — cosa c'è dentro

Il database ha **97 migrazioni** alle spalle. Le tabelle da cui dipende tutto il
resto, in ordine di ripristino:

| Tabella | Cosa contiene | Righe (29/08/2026) |
|---|---|---|
| `aziende` | i clienti paganti | 11 |
| `profiles` | le persone che entrano nel pannello | 13 |
| `entita` | le attività: hotel, ristoranti, negozi… | 15 |
| `pagine` | le pagine dei siti costruiti dai clienti | 29 |
| `domini` | gli indirizzi web collegati | 16 |
| `contatti` | i clienti *dei* clienti (dati personali) | 49 |

Poi il resto: prenotazioni, eventi, offerte, prodotti, richieste, newsletter,
blog, statistiche.

**Cosa si prenota — regola di prodotto, non tecnica**: le cose prenotabili sono
**due**, le **Risorse** (in Booking: un furgone, una casa, un campo, con orari e
disponibilità) e gli **Eventi**. I **Prodotti** si acquistano, le **Offerte** si
chiedono. Non confonderli: è già costato un rientro.

---

## 5. Cosa succede da solo

Sei processi automatici girano su Vercel senza che nessuno li avvii:

| Quando | Cosa fa |
|---|---|
| ogni minuto | invia le newsletter programmate |
| ogni minuto | esegue le automazioni dei clienti |
| ogni 5 minuti | coda dei messaggi WhatsApp *(oggi inattiva)* |
| ogni 15 minuti | controlla che i domini dei clienti siano davvero raggiungibili |
| ogni ora | pubblica gli articoli di blog programmati |
| **ogni notte alle 3** | **copia l'intero database su Cloudflare R2** |

Ognuno è protetto da una parola d'ordine (`CRON_SECRET`): senza, chiunque
potrebbe farli partire.

**Come si sa che stanno girando**: ogni processo lascia un segno quando finisce
bene, e quello che gira dopo controlla che gli altri non siano fermi oltre la
loro soglia — e avvisa via email. Serve perché un errore si può intercettare, ma
**una funzione che smette di essere chiamata non lancia nessun errore**: non
grida nessuno. La pagina `/admin/diagnostica` (solo per il proprietario) mostra
lo stato di tutto.

---

## 6. I backup — e come si torna in piedi

**Due archivi indipendenti:**

1. **Il nostro**, ogni notte alle 3 su Cloudflare R2: un file
   `backup-AAAA-MM-GG.json.gz` con tutte le tabelle. Serve per recuperare
   *alcune* tabelle, o quando è l'account Supabase stesso il problema.
2. **Quelli di Supabase Pro**, automatici (Dashboard → Database → Backups). Per
   un ripristino completo sono più comodi.

**⚠️ Un archivio non provato non è un archivio.** Nell'agosto 2026 ne salvava
1504 righe su 2908 — comprese le pagine dei siti dei clienti — e girava così da
mesi senza che nessuno se ne accorgesse.

**Come si prova** (da rifare ogni pochi mesi):

1. Cloudflare → R2 → il bucket → scarica il file più recente
2. `cd tests` poi `node verifica-backup.mjs C:\percorso\backup-AAAA-MM-GG.json.gz`
3. **VERDE** = da lì si riparte. **ROSSO** = il file esiste ma non basta.

Ultima prova: **29 agosto 2026, verde** — 51 tabelle, le sei vitali identiche
alla produzione, 16 domini presenti.

⚠️ Il file scaricato è **il database dei clienti in chiaro**: cancellalo dal
disco appena finita la verifica.

**Se succede qualcosa di brutto** → `INCIDENTE.md`, scritto per essere eseguito
alle tre di notte, da soli. Regola sopra tutte: **prima si chiude, poi si
guarda.** Contiene anche le **72 ore del GDPR**, che si pagano a parte a
prescindere dalla violazione.

---

## 7. Come si lavora

**Per far girare tutto sul proprio computer**: servono Node.js 18 o superiore,
Git, e il file delle variabili d'ambiente copiato da Vercel. Poi
`cd client-next` e `npm run dev`.

⚠️ **Il computer di sviluppo lavora sul database di produzione.** Si guarda, non
si sperimenta.

**Per pubblicare**: sempre e solo `.\deploy.ps1` dalla radice. Fa in ordine:

1. **controlla le regole sul codice** — e si ferma se un cambiamento *toglie*
   qualcosa a un cliente (una voce di menu, una pagina) senza autorizzazione
   scritta nel messaggio
2. pubblica su Vercel — se non compila, il ramo principale resta pulito
3. salva su GitHub
4. lancia i controlli automatici (~3 minuti) e tre sonde di sicurezza che
   provano **tutte** le funzioni con credenziali sbagliate

⚠️ **Le modifiche alla struttura del database non sono automatiche**: i file in
`supabase/migrations/` si eseguono **a mano** dal pannello Supabase, sezione SQL
Editor.

---

## 8. Le chiavi — dove si rigenerano

Stanno tutte su **Vercel → progetto `oltrenova-next` → Settings → Environment
Variables**. Qui ci sono solo i nomi e la provenienza.

| Nome | Dove si rigenera | Se manca |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API | **tutto fermo** |
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | **tutto fermo** |
| `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET_NAME` | Cloudflare → R2 → Manage API tokens | niente backup |
| `RESEND_API_KEY` · `RESEND_FROM` · `RESEND_WEBHOOK_SECRET` | Resend → API Keys | nessuna email |
| `CRON_SECRET` | inventarne una nuova, lunga e casuale | i processi automatici si fermano |
| `ANTHROPIC_API_KEY` · `AI_MONTHLY_LIMIT` | console Anthropic | l'AI si spegne |
| `STRIPE_SECRET_KEY` | Stripe → Developers → Chiavi API | niente pagamenti, in nessun punto della piattaforma |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhook (eventi da **account connessi**) | i pagamenti riescono ma non risultano mai: l'ordine resta «in attesa» per sempre |
| `STRIPE_ACCOUNT_WEBHOOK_SECRET` | Stripe → Webhook (account connessi, payload **Thin**) | non ci si accorge se Stripe blocca il conto di un cliente: lo scopre lui dal primo pagamento rifiutato |
| `VERCEL_TOKEN` · `VERCEL_PROJECT_ID` | Vercel → Account Settings → Tokens | i domini dei clienti non si collegano più |
| `TURNSTILE_SECRET_KEY` · `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare → Turnstile | i moduli restano senza filtro |
| `META_APP_ID` · `META_APP_SECRET` · `WHATSAPP_TOKEN_KEY` · `WHATSAPP_WEBHOOK_TOKEN` | Meta for Developers | WhatsApp spento *(già così oggi)* |
| `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` | Google Cloud Console | niente Google Calendar |
| `UNSPLASH_ACCESS_KEY` | Unsplash Developers | niente foto automatiche |
| `ABSTRACT_API_KEY` | Abstract API | niente verifica email |
| `ERROR_ALERT_EMAIL` · `DEMO_NOTIFY_EMAIL` | un indirizzo email, non una chiave | **nessuno viene avvisato dei guasti** |

⚠️ **Ogni variabile nuova richiede una nuova pubblicazione**: aggiungerla dal
pannello non tocca la versione già in funzione, che continua a girare senza. Il
pannello lo scrive («redeploy to apply») e non è un consiglio, è una condizione.

⚠️ Vercel aggiunge un carattere invisibile in testa ai valori: il codice lo
toglie da solo, ma se scrivi codice nuovo devi ricordartene.

---

## 9. Gli altri documenti

| File | Cosa contiene |
|---|---|
| `CLAUDE.md` | le regole di lavoro e tutta la storia dei guasti già successi |
| `SECURITY.md` | le regole di sicurezza non negoziabili |
| `INCIDENTE.md` | **cosa fare se succede qualcosa**, passo per passo |
| `FEATURES.md` | l'elenco completo delle funzioni |
| `CATALOGO.md` | come si legano prodotti, offerte e negozio |
| `REGISTRAR.md` | il piano per vendere domini ai clienti (non ancora fatto) |
| `SECURITY-CHECK.md` | cosa è già stato verificato e cosa no |
| `WHATSAPP.md` | stato e decisioni sul canale WhatsApp |

---

## 10. Se sei subentrato — i primi sette giorni

**Giorno 1 — prendi le chiavi di casa.** Entra in tutti e sei i fornitori (§2).
Se non hai le credenziali, ogni servizio ha un recupero via email: serve accesso
alla **casella di posta di Francesco**, che è la vera chiave di tutto. Attiva il
secondo fattore su ognuno, a tuo nome.

**Giorno 2 — verifica che i soldi escano.** Controlla che le carte collegate a
Supabase e Vercel siano valide. Se un pagamento salta, in poche settimane il
servizio si spegne e i clienti restano senza sito.

**Giorno 3 — prova l'archivio.** Segui §6. Finché non lo fai, «abbiamo i
backup» è una speranza, non un fatto.

**Giorno 4 — guarda se qualcosa è fermo.** Entra nel pannello, apri
`/admin/diagnostica`: mostra i processi automatici, l'ultimo giro di ciascuno e
gli errori. Verifica che l'indirizzo per gli avvisi sia il **tuo**.

**Giorno 5 — apri i siti dei clienti.** Non fidarti dei numeri: apri davvero
tre o quattro indirizzi (§2.3) e guarda che funzionino.

**Giorno 6 — trova un tecnico.** Il sistema è documentato ma non si mantiene da
solo. Servono Next.js, React e Supabase.

**Giorno 7 — decidi.** Continuare, vendere o chiudere. Se chiudi, i clienti
hanno diritto a riavere i loro dati: c'è già una funzione di esportazione nel
pannello, sezione Aziende.

---

## 11. Cosa non funziona ancora — onestà

Chi compra o subentra deve saperlo prima, non dopo.

- **Non c'è un percorso di primo accesso.** Un cliente nuovo trova 26 voci di
  menu e nessuno che gli dica da dove cominciare. `/admin/onboarding` non
  esiste. È il lavoro aperto più importante.
- **Le registrazioni sono chiuse.** Ogni cliente finora è nato da un invito. La
  registrazione automatica funziona ma non è mai stata aperta al pubblico.
- **Non c'è fatturazione automatica.** Nessun abbonamento ricorrente collegato:
  gli incassi si gestiscono fuori dalla piattaforma.
- **I pagamenti online coprono solo il negozio.** Prenotazioni ed eventi non
  incassano ancora.
- **WhatsApp è costruito ma spento**: la verifica Meta non è mai stata
  completata.
- **Il canale in tedesco non c'è** (italiano e inglese sì).
- **Una sola persona sa come funziona.** Questo documento serve a ridurre il
  danno, non lo elimina.

---

## 12. Il problema dell'accesso — leggilo due volte

Questo documento **vive dentro GitHub**, che è uno degli accessi che descrive.
Chi non può entrare in GitHub non può leggerlo. Ed è esattamente la situazione
di chi subentra all'improvviso.

**Cosa va fatto perché serva davvero:**

1. Una **copia stampata o su chiavetta**, tenuta dove si tengono i documenti
   importanti — non sul computer di lavoro.
2. Un **foglio separato con le credenziali**, in una cassetta di sicurezza o da
   un notaio. Non in questo file: qui non ci sono chiavi, di proposito.
3. Un **contatto di emergenza** su ogni fornitore, dove è previsto.
4. Il **recupero della casella di posta principale**: quasi tutti i fornitori
   rimandano lì. Se quella casella è irraggiungibile, gli accessi non si
   recuperano.
5. Se il progetto ha un valore da tutelare, **scriverlo dove conta**: una
   piattaforma con clienti attivi è un bene, e i beni si trasmettono con le
   forme che valgono per legge.

> ⚠️ **Da completare — solo Francesco può.** Questo documento descrive il
> sistema. Non sa nulla di: forma giuridica e P.IVA, contratti coi clienti,
> carte di pagamento, accesso alla casella di posta principale, eventuali
> disposizioni successorie. Sono le informazioni che servono **per prime** a chi
> subentra, e le può scrivere una persona sola.

---

---

## 13. Quando si aggiorna questo documento

Un documento come questo non muore per vecchiaia: muore perché **qualcuno
collega un fornitore nuovo e nessuno lo scrive**. Da quel momento mente proprio
nel punto che conta — l'elenco di chi tiene acceso il servizio — e chi subentra
scopre il pezzo mancante quando qualcosa si spegne.

Per questo non c'è una scadenza a calendario, che si dimenterebbe. Ci sono
**eventi**: quando succede una di queste cose, il documento va rimesso a posto
**nello stesso momento**, non dopo.

| Se succede questo | Cosa si aggiorna |
|---|---|
| **Si collega un fornitore nuovo** (o se ne toglie uno) | §2 per intero: cosa fa, costo, cosa si rompe, dove si entra |
| **Nasce una variabile d'ambiente nuova** | §8 — è il segnale più affidabile che è entrato un collegamento esterno |
| **Cambia un piano o un prezzo** | §2 e il totale in §2.7 |
| **Si apre o si chiude una funzione che tocca i soldi** — registrazioni, pagamenti, abbonamenti | §11, che è l'onestà verso chi compra |
| **Cambia il dominio principale** | §2.3, §2.4 e i webhook |
| **Si prova l'archivio** | la data in §6 — «provato una volta» dice solo che funzionava quel giorno |
| **Prima di far vedere il progetto a qualcuno** — un socio, un acquirente, una banca | tutto, con calma |
| **Comunque una volta l'anno** | anche se sembra che non sia cambiato niente |

**Il controllo automatico**: `node tests/verifica-regole.mjs` — che gira da solo
prima di ogni pubblicazione — confronta le variabili d'ambiente usate nel codice
con quelle elencate qui e **blocca** se ne trova una non documentata. Non
dipende da chi si ricorda. Non copre tutto il resto della tabella: quello è
pensiero, e va fatto.

---

*Documento di progetto — aggiornato al 29 agosto 2026.*
