# Da fare — l'elenco unico delle cose aperte

> **Aggiornato il 25/11/2026.**
>
> È l'**unico** posto delle cose aperte di OltreNova (decisione di Francesco, 18/11/2026:
> «ogni avvio e per ogni aggiornamento lo teniamo bello fresco, sennò ci intoppiamo»).
> Prima stavano in sei documenti e in 900 righe di memoria, e un elenco «completo» ne
> dimenticava metà.
>
> **Le regole**
> - **A ogni avvio di sessione** Ettore lo legge e verifica le voci che possono essere
>   cambiate (codice, database, fornitori) prima di proporre il lavoro.
> - **Ogni cosa che si chiude o si apre** si scrive qui **nello stesso commit** del lavoro.
>   Chiusa = si toglie (la storia la tengono git e `CLAUDE.md`), non si barra.
> - Ogni voce dice **cosa**, **perché conta** e **dove** sta il dettaglio. Niente doppioni:
>   se una voce è già qui, si aggiorna quella.
> - Una voce «da provare» resta finché qualcuno non l'ha provata davvero.
> - Gli altri documenti (STRATEGIA, PROGETTO, SECURITY…) spiegano; **l'elenco è questo**.

---

## A. Lavoro di Ettore — senza decisioni da prendere

### A1. Prima di aprire ai clienti (obblighi e sicurezza)
- [ ] **Permessi dei collaboratori per singola attività** — `struttura_ids`/`attivita_ids` valgono solo
  nel menu, non nelle route. Prima che un cliente con più sedi dia accesso a un collaboratore.
  (memoria `project_backlog_staff_attivita_perm`)
- [ ] **Cancellazione automatica dei dati vecchi** (data retention) — non esiste. (`SECURITY.md`)
- [ ] **Ripristino da backup mai provato su un archivio vero** — `tests/ripristino.mjs` è pronto;
  serve la chiave di lettura di R2, che non è su questo PC (→ C). (memoria `project_backup_lacune`)

### A2. Guida del pannello
- [ ] **45 schede da scrivere** — prossimo gruppo proposto: Richieste, Recensioni, Offerte.
  (`client-next/lib/guida/`, `DA_SCRIVERE` in `tests/verifica-guida.mjs`, nota 93)

### A3. Editor e blocchi
- [ ] Opzioni solo-telefono, larghezza del contenuto, copia dello stile (piano del 12/10).
- [ ] «Salva questa sezione come modello».
- [ ] Video di sfondo della copertina: oggi è un campo «URL mp4», nessun caricamento.
- [ ] Foto in grande anche per il blocco «Immagine» singola e il dettaglio delle vetrine.

### A4. Difetti piccoli annotati
- [ ] **Esportazione GDPR lenta**: con l'azienda piena di `probe-enumerazione` ha superato i 30 s
  (deploy del 19/11; la route ne ha 60, la sonda ora aspetta 65). Con un cliente grande rischia il
  timeout: renderla a più passaggi o in parallelo.
- [ ] **Backup lanciato a mano** (pannello e Diagnostica) non scrive il battito `backup`: dopo un
  recupero l'allarme «processo fermo» continua fino al cron della notte (24/11 scritto a mano).
  Spostare `registraBattito('backup')` dentro `runBackup` a fine giro riuscito.
- [ ] **Backup che cresce**: il 24/11 il giro durava ~53 s (tabelle ~36). Ora ha 300 s: quando si
  avvicina ai 200, spezzarlo in due cron (tabelle e immagini) invece di allungarlo. `CLAUDE.md` nota 34.
- [ ] Su `/en` il pulsante «Torna a…» della pagina evento resta in italiano.
- [ ] Blog: date con `toLocaleDateString` senza fuso (vicino a mezzanotte, giorno diverso).
- [ ] «Aggiungi opzione» del chatbot tagliato di 2 px a 360 px.
- [ ] Il banner dei cookie copre la barra in basso dell'app del QR.
- [ ] Il pannello «Stile» nell'editor copre la pagina invece di stringerla.
- [ ] Elenco Offerte nel pannello che scrive «Gratis» quando manca il prezzo.
- [ ] La pagina elenco Strutture non crea per il super_admin (manca `azienda_id`).
- [ ] «Azienda attiva» non si aggiorna dopo una cancellazione.
- [ ] Il menu laterale non avvisa delle modifiche non salvate.
- [ ] Collaboratore col permesso «ristorante»: non vede le sezioni della sua attività nel menu.
- [ ] Vetrine in nessun menu.
- [ ] `probe-seo` conta `&quot;` nella lunghezza dei titoli (falsi «titolo lungo» su Garage 22).
- [ ] I numeri animati delle statistiche diventano scrivibili nell'editor solo a conteggio finito.

### A5. Manutenzione
- [ ] **Sonde dopo il deploy del 25/11 (`fa45b7c3`)** — il sistema l'ha fermato per memoria durante gli
  smoke, dopo Vercel e il push. La correzione è verificata (`probe-mostra-posti` verde in produzione) e
  i resti degli smoke sono stati tolti (un `ci-…@playwright.internal` super_admin e le due
  «ZZ-CI-SEC-TEST»), ma smoke e sonde di sicurezza vanno rilanciati con il PC libero.
- [ ] **Next 16** — manutenzione, non sicurezza (PR Dependabot #67 aperta di proposito).
- [ ] **Stripe 23** (PR #62) — cambia la versione API su tutte le chiamate: insieme a una prova in
  sandbox con un conto attivo (→ C).

### A6. Lavori grandi già decisi, in coda
- [ ] **Posta con fornitore sostituibile** (deciso il 20/11) — `lib/posta/` con Resend e Amazon SES
  sotto; newsletter su SES a consumo, posta di servizio su Resend gratis; tetto newsletter per
  azienda, freno sui rimbalzi, allarme sul totale. Nasce dal tetto di 100 email/giorno superato il
  19/11 da due newsletter di Garage 22, che ferma **tutta** la posta di **tutti**. Parte quando
  Francesco crea l'account AWS (→ C1). Piano in `POSTA.md`.
- [ ] **Operazioni del dominio in `lib/`** (crea evento, cambia orari, pubblica pagina…) usate da
  pannello e futuro assistente AI. (roadmap in `CLAUDE.md`)
- [ ] **Campagne WhatsApp per lista** come le newsletter, e via i tag col titolo dell'evento — quando
  c'è Meta.
- [ ] **Intervista che costruisce il sito** nell'AI Builder + richieste di foto per sezione
  (STRATEGIA §6.4 punto 5).

---

## B. Aspettano una decisione di Francesco

- [ ] **Percentuali di acconto a passi di 5** (25/11) — acconto dell'evento, di ogni opzione e delle
  risorse hanno `step=5`: con un acconto del 33% il browser blocca il salvataggio senza dirlo bene
  (stesso difetto della soglia dei posti, corretto il 25/11). Nessun dato vero colpito oggi. Proposta:
  `step=1`; si nota solo che le frecce del campo vanno di 1 in 1.
- [ ] **Aziende di prova «ZZ-ENUM-A/B»** (del 18/11) rimaste in produzione: toglierle o tenerle.

- [ ] **Sentinella, parte B** — dove gira: routine Claude in cloud il lunedì (consigliata) o processo
  dentro OltreNova. Primo pezzo in ogni caso: registro delle scadenze in `PROGETTO.md`.
  (memoria `project_sentinella_fornitori`)
- [ ] **«Fatti trovare dall'AI»** — 3 risposte dal 28/10: ok alle fondamenta automatiche, chi vede la
  misura, approvazione del titolare sì/no. Lacune già misurate: JSON-LD solo dal browser (0
  nell'HTML), `/llms.txt` 404, interruttore dei bot AI di SeoGeoPage non letto dal robots.
- [ ] **robots.txt gestito da Cloudflare** — blocca i bot AI su `*.oltrenova.com` e toglie la sitemap
  ai sottodomini: è il rosso fisso di `probe-molti-indirizzi` a ogni deploy (7 sottodomini).
  Contrasta con «Fatti trovare dall'AI».
- [ ] **Frase nell'informativa** su aperture e clic delle newsletter.
- [ ] **Avvisi di sicurezza Dependabot** — attivare le email su GitHub, o un agente settimanale che li
  legge e prepara la correzione.
- [ ] **Club** — riscrivere e approvare i 4 consigli in bozza, preparare i primi contenuti, sì alla voce
  di menu.
- [ ] **Aprire le registrazioni** — prima un pentest esterno (STRATEGIA §4.2), poi pochi minuti aperte
  per `node probe-registrazione.mjs --signup`.
- [ ] **Abbonamento OltreNova su Stripe Billing** ed eventuale commissione sui biglietti — dipende dalla
  commercialista (data?). (STRATEGIA §4.1, §5)
- [ ] **STRATEGIA §7**: verticale eventi come punta di lancia · città dell'aggregatore · prototipo
  dell'agente al telefono su Garage 22 · chi paga nel modello partner.
- [ ] **Risponditore automatico** — due risposte («Invia» dall'email sì/no; porte della prima versione).
  Rimandato a quando c'è WhatsApp.
- [ ] **Domande del 05/10**: doppia conferma per chi spunta «Avvisatemi» · togliere «rimetti in
  attesa» · interruttore «apre una trattativa» per modulo · miniature dei modelli newsletter più
  grandi.
- [ ] **Proposti, non approvati**: verde WhatsApp scuro e grigi leggibili anche sui **siti** (nelle app
  sono già fatti) · titoli sottili nelle tessere del mosaico e nella fascia che scorre (cambia tutti
  i siti che li usano) · blocchi della ricognizione del 12/10 (barra fissa su telefono, varianti).
- [ ] **Pagina pubblica dell'evento nei colori del sito** — oggi è turchese fisso (`#00b5b5`: icone,
  pulsante, spunte, scelta delle opzioni) per tutti i clienti; su Garage 22 e TVB stona. Cambia
  l'aspetto della pagina evento di tutti: Ettore lo propone con le schermate. (trovato il 23/11)

---

## C. Servono gli accessi di Francesco

### C1. Fornitori
- [ ] **Turnstile sui siti dei clienti** — Cloudflare → Turnstile → la chiave del sito: aggiungere i domini dei clienti all'elenco (o valutare con Ettore come gestirli), poi Ettore mette il controllo invisibile anche nel modulo dei siti. Oggi c'è solo sulla pagina `/form`.
- [~] **Resend** — ✅ 20/11 webhook iscritto a `email.delivered`/`opened`/`clicked` (oltre a bounced/complained):
  la sentinella lanciata da Diagnostica ha acceso il battito `consegna-posta`, le consegne arrivano.
  Aperture e clic **non** si accendono su Resend: le newsletter passano ad Amazon SES (`POSTA.md`).
  L'avviso su **Resend Forge** si ignora (il passaggio sostituisce MX/SPF su `send`).
  Prova vera: la prossima newsletter di Garage 22 deve mostrare le consegnate.
- [ ] **Account AWS** — crearlo con la carta (Ettore guida), poi richiesta di uscita dalla sandbox di
  SES (la scrive Ettore). Sblocca la voce «Posta con fornitore sostituibile» (→ A6, `POSTA.md`).
- [ ] **Garage 22** — chiedere al massimo **una newsletter al giorno** finché le newsletter sono su
  Resend gratis (tetto 100/giorno per tutta la piattaforma).
- [ ] **Resoconti per email** — Impostazioni → «Mandala a me» (mai visto in una casella), poi decidere
  se accenderli.
- [ ] **Meta/WhatsApp** (in pausa dal 23/10) — si riparte dalla config del webhook in dashboard, poi
  invio di prova, Independent Tech Provider, verifica azienda, App Review con 2 video (e i permessi
  di pubblicazione IG/FB). Dettaglio in `WHATSAPP.md`.
- [ ] **Stripe sandbox** — finire il conto di prova (`cd tests && node stripe-sandbox-link.mjs`): senza,
  la cassa vera non si prova (né Stripe 23).
- [ ] **Search Console** — non esiste per nessun dominio.
- [ ] **Cloudflare** — WAF (regole gestite gratuite) e SSL «Full (strict)».
- [ ] **Supabase** — Redirect URL da `localhost:5173` a `:3000` (reset password e inviti in locale).
- [ ] **Chiave di lettura R2** per aprire un archivio di backup vero (→ A1).

### C2. Sicurezza e legale
- [ ] Data per la **rotazione annuale** dei segreti (service role, Resend, Anthropic, Meta).
- [ ] Una passata sui **log di Resend e Stripe** (accessi che non riconosci).
- [ ] **Contratto art. 28 GDPR** verso i clienti (verificare nei Termini del 31/08, poi un legale).

### C3. Clienti
- [ ] **Garage 22** — dire di «Mostra quanti posti restano» nell'editor dell'evento (Sempre · Quando
  stanno finendo, da una % di posti occupati · Mai; `CLAUDE.md` nota 95). Con «Sempre», sotto
  un'opzione coi posti contati ora compare sempre «Restano N posti» (prima solo dai 5 in giù): sulla
  serata del 26/11 si legge «Restano 27 posti». Se non lo vogliono, «Quando stanno finendo».
- [ ] **Garage 22** — dire che negli eventi c'è «Più proposte con prezzi diversi» (cena 30 € + ingresso
  con drink 15 €, posti e quota per ognuna, prenotazioni miste, lista d'attesa per opzione), e che le
  prenotazioni già fatte finiscono nella prima opzione. (`CLAUDE.md` nota 94) Le stanno già usando (serata De Cicco &
  Simoniello, 23/11): dalle due descrizioni si può togliere «Paga ora il 20%…» / «paghi la sera…», ora lo
  scrive la pagina da sola sotto ogni prezzo.
- [ ] **Automax** — spiegare «Prezzi e regole» e «Che tipo di offerta?»; il loro conto Stripe è a metà
  (Account → Pagamenti).
- [ ] **Guru** — creare un utente titolare; provare il modulo contatti (`gurumanagement.it/p/contatti`
  → deve arrivare a infogururoma@gmail.com).
- [ ] **Fondaco Narni** — `fondaconarni.com` senza www non ha record (valori dal pannello Domini).
- [ ] **inlingua** — foto vere della scuola; nella Chi siamo il carosello ha ancora testi d'esempio.
- [ ] **Garage 22** — quante prenotazioni arrivano al telefono su 60 posti (dimensiona i posti
  riservati); doppione da unire (stessa persona, due email) dalla scheda contatto.
- [ ] **Panoramic** — accendere Google quando il cliente ha visto il sito (Sito web → «Visibile ai
  motori di ricerca»).

### C4. Da provare dal pannello (costruito, mai provato da Francesco)
- [ ] Moduli → un modulo → «Risposte»: linguette «Richieste» e «Possibile spam», pulsanti «Segna come
  spam» / «Non è spam» (pubblicato il 19/11; la sonda l'ha provato da titolare). Le email delle
  risposte sospette arrivano con «[Possibile spam]» nell'oggetto.
- [ ] Editor visuale, sezioni condivise, «Riscrivi i testi con l'AI», «Dimmi cosa cambiare» a voce,
  «Modifica sulla pagina» dal telefono, blocchi nuovi, galleria delle sezioni pronte.
- [ ] Email di conferma evento con la frase del termine e il link «Annulla»; email «Si è liberato un
  posto».
- [ ] Una newsletter aperta in **Outlook per Windows**.
- [ ] Un modulo contatti inviato con nome «<b>prova</b>»: nell'email deve arrivare scritto così.
- [ ] Risorse a giornate: la scelta obbligatoria del «giorno di uscita» nella creazione.
- [ ] Pagamento vero da link di pagamento (serve un cliente col conto attivo).

### C5. Il PC
- [ ] Copiare i dati del disco Toshiba E: (blocchi danneggiati).
- [ ] `sfc /scannow` e `DISM /RestoreHealth` da amministratore (guida Ettore).
