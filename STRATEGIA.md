# STRATEGIA — dove stiamo portando OltreNova

> Documento cardine del lavoro fra Francesco ed Ettore. Scritto il 23/09/2026.
> `PROGETTO.md` dice **cosa c'è** e chi lo tiene acceso; questo dice **dove andiamo e perché**.
> Le decisioni di prodotto e di prezzo sono di Francesco: qui ci sono i pareri
> motivati, e ciascuno dice se è **deciso** o **da decidere**.
> Si aggiorna quando cambia una decisione, non a ogni sessione.

---

## 1. I ruoli

- **Ettore**: l'ingegnere che sviluppa la piattaforma. La **sicurezza contro attacchi e
  intrusioni** è il vincolo di ogni riga. Oltre al codice, fa da consulente e socio: dice
  cosa pensa, anche quando è scomodo, e porta i numeri.
- **Francesco**: clienti, decisioni di prodotto e prezzi, commercialista, account dei
  fornitori, prove che richiedono il suo telefono o i suoi accessi.
- **Come lavoriamo**: **un filo alla volta**, cioè due settimane su un obiettivo solo con
  verifica dal vivo alla fine, non otto cose aperte insieme. Poi **un giro di salute al mese**
  (uso vero, errori, costi, sicurezza), preparato da Ettore.

## 2. La fotografia (DB di produzione, 23/09/2026)

| | 25/08 | 23/09 |
|---|---|---|
| Aziende | 9 | 9 |
| Entità | 13 | 12 |
| Contatti CRM | 49 | 88 |
| Visite ai siti | 1.438 | ~2.500 |
| Prenotazioni eventi | — | 42 |
| Chiamate AI | — | 36 |
| Incassi Stripe | 0 | 1 (1 €) |

L'uso è quasi raddoppiato in un mese, le aziende sono ferme. **OltreNova come azienda non
incassa niente dalla piattaforma**: l'abbonamento non esiste.

**Diagnosi**: il collo di bottiglia non è il codice. Abbiamo costruito più di quanto venga
usato (shop, loyalty, automazioni e booking risorse erano fermi a zero ad agosto). Manca il
pezzo che trasforma il software in un'attività: **qualcuno arriva, paga e resta**.

## 3. Le tre strade

| Strada | Come | Pro | Contro |
|---|---|---|---|
| **A. SaaS self-serve** | Registrazione aperta, onboarding, abbonamento, zero contatto umano | Unica che scala oltre il tempo di Francesco | Serve acquisizione (marketing/SEO); tanti clienti piccoli che scrivono comunque |
| **B. «Fatto con te»** | Avviamento + canone, il sito lo costruiamo noi con l'AI | Soldi subito, prezzo alto, insegna cosa serve davvero | Non scala |
| **C. Verticale d'attacco: locali ed eventi** | Prodotto generico, racconto e rifinitura per chi fa serate | Prove vere (Garage 22), messaggio chiaro, passaparola fra locali | Per un po' non si racconta «per qualsiasi business» |

**Raccomandazione di Ettore** (*da decidere*): **B + C adesso, fondamenta di A in parallelo.**
Si vende a mano ai locali. Intanto si costruiscono onboarding e abbonamento, che servono
comunque. Quando un locale si attiva da solo senza telefonare, si apre la registrazione.

## 4. Cosa costruire, in ordine

Unità di misura: **una sessione** di lavoro (~una giornata). Le stime sono a spanne: il lavoro
vero è di solito 1,5 volte, perché provando dal vivo esce sempre qualcosa.

### 4.1 Fondamenta per incassare (priorità assoluta)
| Cosa | Effort | Note |
|---|---|---|
| Abbonamento OltreNova su **Stripe Billing** (piani, prova, rinnovi, carta scaduta, sospensione morbida) | 2–3 | Bloccato sulla commercialista, non sul codice |
| **Onboarding «Inizia qui»** (dati → sito generato dall'AI → pubblica → dominio) | 2–3 | Oggi un'azienda nuova trova decine di voci a zero. Vedi §6.1: coincide con i preconfiguratori |
| **Report mensile al cliente** (visite, contatti, prenotazioni, incassi) | 1 | Il cliente vede cosa gli rende e non disdice. Dati già tutti presenti |
| **Registrazione aperta** (verifica email, Turnstile, limiti) | 1 | Solo dopo che l'onboarding regge |

### 4.2 Sicurezza: cosa manca, in ordine di rischio
1. **Francesco come punto unico di rottura.** Stripe si apre solo col suo account Google.
   Serve una chiave fisica (YubiKey o simile) su Google, Vercel, Supabase e Cloudflare, più una
   procedura di accesso d'emergenza in `INCIDENTE.md`.
2. **Contratto di responsabile del trattamento (art. 28 GDPR) con i clienti.** Teniamo i dati
   dei loro clienti. `SECURITY.md` ha i DPA verso i nostri fornitori, ma non si è trovato il
   contratto verso i clienti: da verificare nei termini del 31/08, e se manca da fare con un
   legale o la commercialista.
3. **Rotazione dei segreti**: `META_APP_SECRET` è passato dalla chat; la rotazione annuale non
   ha una data.
4. **Pentest esterno prima di aprire le registrazioni.** Ettore trova ciò che sa cercare; la
   password del WiFi ha dimostrato che esistono classi fuori catalogo.
5. **Cloudflare WAF + SSL Full (strict)**: aperti nella checklist di `SECURITY.md`.

### 4.3 Il verticale eventi
| Cosa | Effort |
|---|---|
| Biglietto con QR + check-in all'ingresso dal telefono dello staff | 2 |
| Promemoria WhatsApp prima dell'evento | 1 (dopo Meta) |
| Lista d'attesa che si converte da sola a una disdetta | 1 |
| Pagina «le nostre serate» con i passati come vetrina | 1 |

### 4.4 La leva grossa: l'assistente del titolare su WhatsApp
Il titolare scrive «apri 20 posti venerdì, cena di pesce, 35 €» e l'evento viene creato.
Piano in tre passi approvato il 15/09 (operazioni in `lib/` → assistente → `/api/v1` solo con
un utilizzatore vero). **4–6 sessioni.** Va **dopo** i punti 4.1–4.3 per sicurezza: un
assistente che agisce è una superficie nuova (numeri falsi, prompt injection), e richiede
conferma esplicita, permessi per operazione e registro di ogni azione.

### 4.5 Cosa NON fare (per ora)
SMS, app nativa, white-label, tedesco, Next 16, nuovi blocchi del sito, sezioni universali.
Ogni funzione nuova è una cosa in più da tenere verificata.

## 5. Ricavi: un'opzione già in mano (*da decidere*)
Oggi Stripe Connect **non trattiene nulla** (scelta di Francesco). Con gli addebiti diretti si
può aggiungere una commissione (application fee), per esempio l'1–2% sui biglietti: guadagni
quando il cliente guadagna, e si combina con un canone più basso. Cambia l'inquadramento
dell'attività: **va vista con la commercialista**. Tecnicamente è mezza sessione.

---

## 6. Idee in valutazione (pareri di Ettore, 23/09 — niente di deciso)

### 6.1 Preconfiguratori per mestiere — **sì, ed è l'onboarding stesso**

**Com'è oggi, misurato nel codice.** Il «preset per tipo» esiste solo di nome:
`MODULI_PREDEFINITI` in `lib/funzioni.js` accende **tutto** per tutti e tre i tipi
(`TUTTE_ACCESE`). Il catalogo `FUNZIONI` governa solo 7 sezioni dell'entità. Le ~30 voci a
livello azienda (eventi, shop, prodotti, loyalty, newsletter, automazioni, preventivi,
survey, content studio, piano editoriale, form builder, SEO-GEO, booking, recensioni,
WhatsApp…) **non hanno interruttore**. Il calderone è reale, e nasce proprio lì.

**La proposta.** Un **profilo di mestiere** fatto di **dati, non di codice**. Decide:
- quali funzioni nascono accese e in che ordine compaiono nel menu;
- come si chiamano le voci nella lingua di quel mestiere («Serate», «Corsi», «Camere»);
- template del sito, sezioni della home e preset della vetrina;
- modelli di email e promemoria;
- le domande dell'onboarding e il contesto per l'AI.

Si sceglie all'onboarding e si applica **una volta**. Poi vince la scelta del cliente, come
già fa `funzioneAttiva`.

**Le regole per non rifare il calderone:**
- **Preconfigura, non ingabbia.** Ogni funzione resta raggiungibile da una pagina «Aggiungi
  funzioni» (la `FunzioniPage` di oggi, estesa al livello azienda). Il tipo continua a non
  limitare niente (nota 31–32).
- **I profili nascono dai clienti veri, non da una tassonomia inventata**:
  - locale con eventi (Garage 22);
  - struttura ricettiva (Borgo del Lago);
  - scuola e corsi (inlingua);
  - catalogo e noleggio (Automax);
  - studio professionale;
  - più **«parto da zero»** (rinominato **«Base»** il 25/09: un'entità in «Base» è un
    segnale, vuol dire che ci manca il suo profilo).

  ⚠️ Tensione con la regola «niente tassonomie, campi liberi» (memoria `feedback_niente_tassonomie`): quella regola vieta di dare noi il nome a
  ciò che il cliente vende. Un punto di partenza che si può cambiare è un'altra cosa, ma va
  tenuto d'occhio.
- **I clienti di oggi non cambiano faccia da soli**: il profilo si applica ai nuovi. Per chi
  c'è già si propone, non si impone (regola «i cambi li autorizza Francesco»).

**Beneficio di sicurezza.** Meno funzioni accese vuol dire meno superficie per azienda. Più
avanti le route di una funzione spenta possono rifiutare le richieste: un muro in più, da
introdurre gradualmente.

**Effort**: catalogo esteso al livello azienda + menu che lo legge: 2. Profili come dati +
aggancio all'onboarding: 2–3. «Aggiungi funzioni» esteso: 1. **Totale ~5–6, in gran parte
sovrapposto all'onboarding** già previsto in 4.1.

**Da fare prima**: misurare quale funzione ogni cliente ha usato davvero. Le candidate al
congelamento si decidono con Francesco una per una.

**✅ Fatto il 24–25/09 (F0–F3):** catalogo unico e menu nuovo col sito in cima; pagina «Funzioni e
profili» (uso reale, profili, categorie); categoria sull'**entità**, assegnata a tutti i clienti e
obbligatoria alla nascita; niente con contenuti o già usato viene nascosto. Dettaglio → note 49–50 di
`CLAUDE.md`. F4 (proporre il profilo ai clienti esistenti) è superata: le categorie le abbiamo
assegnate noi, e un profilo migliorato si porta a tutti con «Riapplica».

**⛔ Deciso da Francesco il 24/09 — le funzioni le accendiamo NOI, per categoria.**
Il cliente non sceglie né accende funzioni: «altrimenti gli smanettoni mettono cose
che non hanno senso». L'admin (Francesco, con Ettore) configura il **profilo ottimale
per ogni categoria di azienda**, e ogni azienda riceve quello della sua categoria. È
la strada per diventare sempre più verticali: un settore che ha bisogno di funzioni più
specifiche avrà il suo profilo. Conseguenze sul progetto qui sotto:
- **niente «Aggiungi funzioni» per il cliente** (F3 com'era scritta è superata);
- la categoria si assegna dall'area super_admin, alla creazione dell'azienda;
- la pagina «Funzioni» di ogni entità, oggi visibile al cliente, va ripensata: cosa
  farne lo decide Francesco, perché toglierla è un cambio che il cliente noterebbe.

**✅ Via libera di Francesco il 23/09.** Progetto (bozza, da confermare nei dettagli):

- **Tre assi separati, da non confondere** (è già successo con tipo/settore, nota 31):
  - `tipo` = tecnico (indirizzo `/s` `/r` `/a`);
  - `profilo` = la preconfigurazione di partenza;
  - `settore` = testo libero per l'AI e la SEO.
- **Tre strati:**
  1. **Catalogo** unico di tutte le funzioni, di entità **e** di azienda, in codice (una
     funzione esiste solo se esiste il suo codice). Per ciascuna: livello, gruppo del menu,
     route, permesso staff, dipendenze, stato (stabile · beta · congelata).
  2. **Profili di mestiere** in DB, modificabili dall'area super_admin senza deploy.
  3. **Istanza**: le scelte dell'entità e dell'azienda. Il profilo si applica **come copia**
     alla nascita: modificare un profilo non cambia i clienti esistenti in silenzio. Si
     registrano `profilo` e versione per poter *proporre* aggiornamenti.
- **Menu dell'azienda = unione delle sue entità**: una funzione di livello azienda (eventi,
  contatti, pagamenti) compare se almeno un'entità la usa. Borgo del Lago (struttura +
  ristorante) vede l'unione dei due profili.
- **Un menu solo**: oggi sono tre scritti a mano (super_admin, admin azienda, staff) e ~25 voci
  azienda non hanno interruttore. Diventa una lista letta dal catalogo e filtrata per ruolo e
  permessi.
- **Area super_admin «Funzioni e profili»:**
  - Catalogo, con quante aziende hanno ogni funzione accesa e quante la usano davvero.
  - Profili, con editor e anteprima del menu risultante.
  - Matrice aziende × funzioni: accesa e usata / accesa e vuota / spenta.
- **Fasi**:
  - F0 catalogo unico + menu da una fonte sola, **nessun cambio visibile**, verificato con
    una sonda che confronta i menu per ruolo prima e dopo (2);
  - F1 area in sola lettura con matrice e uso (1);
  - F2 profili in DB + editor + migration (2);
  - F3 profilo applicato alla nascita + «Aggiungi funzioni» per il cliente: **primo cambio
    visibile, solo per i nuovi, serve l'ok di Francesco** (2);
  - F4 proposta ai clienti esistenti, mai automatica (1);
  - F5 le route di una funzione spenta rifiutano le richieste, gradualmente (1–2).

**Uso misurato il 23/09** (righe nel DB per azienda):
- **A zero ovunque**: shop (prodotti, ordini), automazioni, loyalty, gift card, campagne
  del piano editoriale, WhatsApp.
- **Quasi solo nostre**: survey e newsletter.
- Giochi senza Panciere ha **52 invii di form** e 40 contatti: iscrizioni gestite col form
  builder invece che con gli eventi. Da capire perché.

### 6.2 Aggregatore di mercato locale — **sì come direzione, no come prossimo passo**

**Perché è interessante:**
- **Il costo tecnico è basso**: tutti i clienti stanno in un database solo, già strutturato
  (`entita`, `eventi`, orari, menù). Un portale è un altro «host» del middleware.
- **È un canale di acquisizione**: «iscriviti e compari» è un argomento di vendita. Il
  portale porta traffico e link ai siti dei clienti.
- **C'è una cosa che solo noi abbiamo**: i **posti liberi in tempo reale** agli eventi.
  «Stasera a Terni» è un terreno dove Google è debole. «Trova un ristorante» no.

**Perché non adesso:**
- **Uovo e gallina.** Un portale con tre ristoranti è peggio di nessun portale. Riempirlo con
  attività non clienti prese da Google non si può: i termini di Google Places vietano di
  costruirci una directory.
- **È un secondo mestiere**: un prodotto per il consumatore vuol dire contenuti, redazione e
  marketing B2C, cioè esattamente l'allargamento che §2 dice di evitare.
- **Conflitto d'interessi**: clienti paganti in concorrenza fra loro sulla nostra vetrina.
  Chi sta primo, e perché? Va deciso prima, per iscritto.
- **Concorrenza col sito del cliente** nei motori di ricerca: il portale deve rimandare al
  sito, mai duplicarne i contenuti (regola «un sito, un indirizzo»).
- **Sicurezza**: una lista che attraversa tutte le aziende è proprio la classe di guasto che
  abbiamo già avuto (il blog di `oltrenova.com` che pubblicava l'articolo di un cliente).
  Serve adesione esplicita di ogni cliente, colonne elencate una per una e una sonda dedicata.

**La strada a gradini:**
1. **Ora, gratis**: i profili di mestiere (6.1) rendono i dati uniformi e quindi aggregabili,
   più un flag di adesione. Nessun portale.
2. **Con ~15–20 locali in una città**, non in una regione (conta la densità): un
   **calendario «stasera in città»** con gli eventi dei clienti, come funzione del verticale
   eventi. MVP di sola lettura: 3–4 sessioni.
3. **La possibilità collaterale più grossa: vendere dall'alto.** Pro Loco, Comuni, consorzi,
   strade del vino, associazioni di categoria. **L'ente paga il portale del territorio e i suoi
   associati ricevono il sito**: un contratto porta N attività in un colpo. Risolve l'uovo e la
   gallina e la distribuzione insieme. I tempi della pubblica amministrazione sono lunghi, un
   consorzio privato è più rapido.

**Idee sul tavolo (23/09, solo idee):**
- Calendario «stasera in città» con i posti liberi.
- **Rete fra clienti dentro l'app del QR**: l'ospite dell'hotel vede i ristoranti e le serate
  partner vicini. L'hotel diventa canale di distribuzione per il ristorante. Costa poco ed è
  un aggregatore in miniatura.
- Portale del territorio pagato da un ente (consorzio, Pro Loco, associazione).
- Esperienze combinate fra aziende diverse (dormi + cena + evento). Più avanti: dividere un
  pagamento fra più conti è complesso.
- Dati **aggregati e anonimi** per l'ente (domanda, affluenza), solo su contratto.

**Vincoli da rispettare da subito**, anche senza costruire niente:
1. **Adesione esplicita per entità, come prova** (quando, chi, a quale rete), spenta di
   default. Mai dedotta.
2. **Dati strutturati**: posizione (coordinate, comune), orari leggibili da una macchina,
   fascia di prezzo, lingue. I profili li chiedono all'onboarding. Da verificare se le
   coordinate le abbiamo già.
3. **Una sola proiezione pubblica per entità**, a colonne elencate (come `CAMPI_ENTITA`):
   l'aggregatore legge solo quella.
4. **Il portale indicizza, non copia**: canonical sempre al sito del cliente.
5. Nel middleware un host potrà risolvere in una **rete**, non solo in un'entità: non
   scrivere codice che dia per scontato il contrario.
6. **Regola di ordinamento neutrale scritta prima del lancio.**

**Giudizio**: l'aggregatore non è il prodotto, è il **premio della densità**. Ci si arriva
vincendo una città con i locali, e i preconfiguratori sono il primo mattone per entrambe le
cose.

---

## 7. Decisioni aperte per Francesco
1. Nei prossimi sei mesi: **più clienti** o **clienti che pagano di più**?
2. Verticale **locali ed eventi** come punta di lancia: sì o no?
3. Data prevista per il via della commercialista (abbonamento, commissione sulle transazioni).
4. Preconfiguratori: via libera a partire, insieme all'onboarding?
5. Aggregatore: quale città, e c'è già un consorzio o un'associazione con cui parlarne?
