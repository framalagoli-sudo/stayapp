# Blindare gli account — checklist operativa (per Francesco)

> Scritta il 17/10/2026, dopo i 14 giri dell'agente anti-intrusione. Il **codice**
> dell'app ora ha un buon baseline con sonde che lo sorvegliano a ogni deploy. Il
> punto debole che resta **non è più il codice: sei tu**. Quasi tutta OltreNova
> poggia su pochi tuoi account, e se qualcuno entra in uno di quelli — quasi sempre
> con il phishing, non con un exploit — non serve nessun buco nel nostro codice.
>
> ⚠️ Questo documento NON contiene password, chiavi o codici. Solo cosa fare e in
> che ordine. Non incollarci mai dentro un segreto.

---

## La logica in due righe

- **Google (`fra.malagoli@gmail.com`) è la radice di tutto.** Stripe si apre con
  Google e **non ha una password propria** (PROGETTO.md §2.8): chi prende il tuo
  Google prende anche gli incassi dei clienti. Altri servizi potrebbero entrare
  con «Accedi con Google» o «con GitHub». Prima si blinda la radice, poi i rami.
- **L'obiettivo**: su ogni account, l'accesso dev'essere legato a una **chiave
  fisica o a una passkey** (una credenziale che un sito-civetta non può rigiocare),
  non a una password + SMS (il codice SMS si ruba col SIM-swap e col phishing).

---

## ⛔ La regola d'oro: non chiuderti fuori da solo

Prima di rendere obbligatorio un metodo forte su un account, su **quello stesso
account**:
1. **Registra DUE fattori**, non uno: p.es. due chiavi fisiche (una la tieni
   addosso, una in un cassetto a casa), oppure una chiave **più** una passkey sul
   telefono. Se ne perdi una, entri con l'altra.
2. **Salva i codici di recupero** (recovery codes) offline — stampati o in un
   password manager, **mai** in una mail a te stesso o in un file sul desktop.
3. Solo **dopo** che hai verificato di saper rientrare con il secondo fattore,
   togli i metodi deboli (SMS, domanda di sicurezza).

> Perdere l'accesso a Google o Supabase senza recupero è un incidente peggiore di
> quello da cui ti stai difendendo. Due fattori + codici di recupero = rete.

---

## Ordine di lavoro

Fai **un account alla volta**, in quest'ordine (dalla radice ai rami). Per
ognuno il percorso esatto dei menu cambia nel tempo: cerca la sezione
**«Sicurezza»** / **«Security»** / **«Autenticazione a due fattori»** e lavora lì.

### 1. Google — `fra.malagoli@gmail.com` (la radice)
- Account Google → **Sicurezza** → **Verifica in due passaggi**: attivala se non lo è.
- Aggiungi una **passkey** e/o una **chiave di sicurezza** (hardware). Registrane **due**.
- Valuta il **Programma di protezione avanzata** di Google (Advanced Protection):
  è pensato per account ad alto rischio, obbliga la chiave fisica e blinda il
  recupero. Per la radice di tutto, ha senso.
- **Togli l'SMS** come secondo fattore una volta che la chiave funziona.
- Controlla **i dispositivi collegati** e **le app con accesso all'account**:
  revoca ciò che non riconosci.
- Salva i **codici di backup**.

### 2. GitHub — l'account che possiede il repo (`framalagoli-sudo`)
- Il codice vive qui, e Vercel probabilmente ci si collega. Se entrano qui,
  possono inserire codice che poi va in produzione.
- **Settings → Password and authentication** → attiva **2FA**, preferisci una
  **passkey / security key** al posto (o in aggiunta) del TOTP.
- Salva i **recovery codes**.
- Controlla **SSH/GPG keys** e **Personal access tokens**: revoca quelli vecchi
  o che non riconosci.

### 3. Vercel — hosting e variabili d'ambiente (i segreti dell'app)
- Qui stanno le env var con dentro le chiavi vere (Supabase service role, Resend,
  Stripe…). Chi entra qui le legge.
- Vedi **come** accedi (email, «Accedi con GitHub»?): se è via GitHub, la vera
  difesa l'hai già messa al punto 2 — ma attiva comunque il 2FA nativo di Vercel
  se disponibile.
- **Account Settings → Authentication / Security**: attiva 2FA / security key.
- Controlla i **membri del team** e i **token** del progetto.

### 4. Supabase — database e autenticazione (i dati dei clienti)
- Qui ci sono i dati veri dei clienti.
- Vedi come accedi (email, Google, GitHub) e proteggi **quella** identità (punti
  1–2 se è Google/GitHub).
- Nel dashboard Supabase attiva l'**MFA** disponibile per il tuo login.
- Controlla **Organization → Members**: chi ha accesso al progetto.

### 5. Cloudflare — DNS e posta in ingresso
- Chi controlla il DNS può dirottare i domini (tuoi e dei clienti) e la posta.
- **My Profile → Authentication**: attiva 2FA, preferisci una **security key**.
- Salva i codici di recupero.

---

## Oltre le chiavi: tre cose da fare una volta

### A. Rigenera `META_APP_SECRET`
Il secret dell'app Meta/WhatsApp **è stato incollato in chat** una volta, quindi
va considerato noto. **Prima** di metterlo su Vercel (quando collegheremo
WhatsApp), **rigeneralo** dalla dashboard Meta e usa quello nuovo.
⚠️ Ogni variabile nuova o cambiata su Vercel **richiede un redeploy**: il codice
legge la chiave una volta sola all'avvio (vedi `client-next/CLAUDE.md`).

### B. Guarda i log dei fornitori (una passata, poi ogni tanto)
Contengono dati personali e sono fuori dal nostro codice — li vedi solo tu
entrando nei loro pannelli:
- **Resend** (email inviate/rimbalzate), **Stripe** (pagamenti), **Meta** (quando
  ci sarà). Cerca accessi o attività che non riconosci.

### C. Contratto art. 28 GDPR coi clienti
Quando avrai clienti veri, serve il **contratto di responsabile del trattamento**
(art. 28 GDPR): tu tratti i dati dei loro clienti per loro conto. Da preparare
con un modello prima del lancio.

---

## Cosa NON sostituisce questa checklist

Blindare gli account chiude l'anello umano, che oggi è il più esposto. Ma **non**
è un **pentest esterno**: una persona che non conosce il codice e cerca buchi di
mestiere è un'altra cosa, e va fatta **prima di aprire le registrazioni**
(SECURITY §4.2). E il **loop AI autonomo** che prova a entrare ogni tanto si
accende **dopo il lancio**, con un tetto di spesa (vedi memoria
`project_agente_attaccante`).

---

## Verifica finale (quando hai finito)

Per ogni account, prova a rientrare da una **finestra anonima / altro dispositivo**:
deve chiederti la chiave/passkey. Se entra con la sola password, il metodo forte
non è obbligatorio e manca ancora un pezzo.
