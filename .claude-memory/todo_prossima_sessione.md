---
name: todo-prossima-sessione
description: "Da dove riprendere — 23/09 pomeriggio: STRATEGIA.md nato, preconfiguratori APPROVATI → si parte da F0+F1 (nessun cambio visibile) dopo 3 risposte di Francesco; migration ferme alla 126; restano anche 2 verifiche a mano sul pannello pagamenti, WhatsApp/Meta (e una contraddizione fra documenti sul Tech Provider), tre siti senza titolo SEO, SENTRY_DSN da togliere da Vercel"
metadata: 
  node_type: memory
  type: project
  modified: 2026-09-23T17:01:46.997Z
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
---

# Si riprende da qui

## ▶️ 23/09 pomeriggio — SESSIONE DI STRATEGIA CHIUSA (nessun codice, migration ferme alla 126)

**Leggere prima `STRATEGIA.md`**: è il documento cardine → [[project-strategia-cardine]] · [[project-session-2026-09-23-strategia]]

### Il prossimo lavoro: preconfiguratori F0 + F1 (via libera di Francesco)
- **F0** (2 sessioni): catalogo unico in `lib/funzioni.js` esteso alle ~25 voci di livello
  azienda + **un menu solo** al posto dei tre scritti a mano in `AdminLayout.jsx`
  (super_admin / admin_azienda / staff con i `perm.*`). **Nessun cambio visibile**: prima di
  toccare, scrivere la sonda che fotografa il menu di ogni ruolo, e dopo confrontarla.
  ⚠️ I permessi staff non coincidono 1:1 con le voci (`perm.newsletter` apre anche WhatsApp,
  `perm.eventi` anche Offerte, `perm.shop` Prodotti + Shop).
- **F1** (1 sessione): area super_admin «Funzioni e profili» in sola lettura con la matrice
  aziende × funzioni (accesa e usata / accesa e vuota / spenta).
- **Prima chiedere a Francesco** (domande lasciate aperte):
  1. i profili di partenza vanno bene? (locale con eventi · struttura ricettiva · scuola e corsi · catalogo e noleggio · professionista · parto da zero)
  2. le funzioni a zero (shop, loyalty, automazioni, gift card) fuori dai profili nuovi ma in «Aggiungi funzioni»?
  3. perché Giochi senza Panciere raccoglie le iscrizioni col form builder e non con gli eventi?
  4. le decisioni di `STRATEGIA.md` §7 (più clienti o che paghino di più · verticale eventi · data commercialista · città/consorzio per l'aggregatore).
- Aggregatore: niente da costruire, ma **i sei vincoli di §6.2** valgono già per F2/F3 (adesione come prova, dati strutturati, una proiezione pubblica a colonne elencate, canonical al cliente, host → rete nel middleware, ordinamento neutrale). Da verificare se le entità hanno già le coordinate.

Tutto quello che segue (22–23/09 mattina) resta valido.

## ▶️ 23/09 — SESSIONE CHIUSA (Ettore). Nessuna migration nuova: ferme alla **126**

1. ✅ **Hydration evento + blog risolta** — la causa vera era la **lingua** (`_lang` esiste solo nella riscrittura del middleware, non nell'URL del browser); la diagnosi del 22/09 era un artefatto di localhost. Chiusi nello stesso giro: condivisione articoli con URL **vuoto**, `?back=` aperto verso siti esterni. Smoke 74/74 → [[project_backlog_hydration_evento]] · note 47 `CLAUDE.md`, SECURITY §0 inv. 19
2. ✅ **Domini tripli** — il giro notturno leggeva `entita` tre volte (via `ENTITY_TABLES`) e creava tre sottodomini, due in 404. Codice corretto; i due di Ristorante Borgo del Lago staccati da Vercel (`npx vercel api … -X DELETE`) e cancellati, su autorizzazione di Francesco → nota 48
3. **Borgo del Lago** (ristorante + struttura) usa **solo le web app** dell'app del QR, internamente: il sito è su WordPress, la migrazione verrà. Le due entità sono `active:false` ma **devono restare raggiungibili** — non «sistemare» quel flag.

### Nuovi aperti dal 23/09
- ❓ **Meta Tech Provider**: `PROGETTO.md` §2.6 lo dà **approvato il 18/09**, la roadmap di `CLAUDE.md` lo elenca ancora come da fare. Chiedere a Francesco quale è vera e allineare.
- Su `/en` il pulsante «Torna a <sito>» della pagina evento resta in italiano.
- Blog: date con `toLocaleDateString` senza fuso → un articolo pubblicato vicino a mezzanotte può mostrare giorno diverso fra server e browser (altro #418 possibile, raro).
- Sul PC di Francesco c'erano processi in ascolto su **:3001–:3009** (vecchi dev server?): non toccati.
- ⚠️ `TaskStop` su un `npm run dev` in background chiude la shell ma **non** il node figlio: fermarlo per PID.

---

## ▶️ 22/09 — SESSIONE CHIUSA. Tutto live. Migration eseguite: fino alla **126**

**Due giorni di lavoro, tutto in produzione e verificato dal vivo.**

### Blocchi e registro visivo
1. **Team in tre varianti** — `griglia` (quella di sempre, resta il predefinito dei siti online) · `ritratti` · `editoriale`. I blocchi nuovi nascono «ritratti». Su Metodo TVB i soci sono in «editoriale» → [[reference_blocco_team_varianti]]
2. **Vetrina: «numeri in evidenza»** — barra dell'avanzamento e tessere con icona; **quali numeri lo dice il preset**, non il codice. Poi **video** (YouTube/Vimeo) e **mappa** nel dettaglio di un progetto, via i campi riservati (decisione di Francesco), «Capitale richiesto» → «Investimento totale» → [[reference_vetrina_evidenza]]
3. **Separatore a forma**: prende il colore della sezione sotto. Era bianco fisso — su un sito scuro, una fascia bianca in mezzo alla pagina.
4. **CTA ricorrenti su Metodo TVB** (pulsante progetti + banner) su tutte le pagine tranne dove non ha senso.

### Eventi (migration 125 e 126, entrambe eseguite)
5. **Note nel modulo** di prenotazione, su pagina evento **e** app del QR. La colonna c'era da sempre: mancava il campo.
6. **«Chiedi il telefono per forza»**, interruttore per evento (125).
7. ⛔ **Il modulo dentro l'app del QR era ROTTO**: non mandava il consenso privacy → **400 a ogni prenotazione**, per un mese, senza spunta da mettere → [[reference_modulo_prenotazione_evento]]
8. **Posti riservati al telefono** (126) + **avviso a soglia** (restano 5 · esaurito). Nato dal sold out di Garage 22: 60 posti, 29 nel sistema, **una sola** prenotazione telefonica segnata su trenta → [[reference_posti_riservati_eventi]]

### inlingua Terni — rifatto da brief
9. Home e **11 pagine interne** allineate: testi ufficiali del cliente verbatim, registro di inlingua Verona (turchese, Sora), contatti veri, SEO locale su ogni pagina (titoli unici entro 60, H1 con «Terni», 1100+ parole). ⛔ **Nessuna CTA delle pagine interne aveva un link**: i pulsanti non comparivano affatto → [[project_inlingua_terni]]

### Difetti di piattaforma corretti (valgono per tutti i clienti)
10. ⛔ **Un pulsante sullo slider mandava la pagina in 500** — `siteHref` fuori scope in `HeroSlider` e `Carousel`. Mai emerso perché ogni slider aveva il link vuoto → [[reference_identificatore_fuori_scope]]
11. **Contrasto**: grigi chiari sotto il minimo leggibile, `readableOn` con soglia da testo grande anche sui link piccoli, pulsanti del menu con bianco fisso. Tutti corretti.
12. **La sonda del contrasto ora prova sé stessa** prima di misurare: è la terza volta che misurava la cosa sbagliata.

### 💳 IL PRIMO INCASSO VERO (coda del 22/09, dopo la chiusura)
13. **Garage 22 ha incassato davvero**: Agnese, 1 €, un posto a un evento di prova. Cassa → webhook → riga `pagamento_stato: pagato` → email: **tutto al primo colpo**. Noi non tocchiamo nessun dato di carta.
14. ⛔ **Ma non si vedeva in nessuno dei tre punti.** La pagina dopo il pagamento chiedeva all'endpoint dello **shop** (parlava di «ordine» a chi aveva pagato una cena, senza nome del locale né link per tornare); la riga nel pannello mostrava `€1` e basta; «Pagamenti» era **solo** il collegamento del conto. Tutto corretto e live → [[reference_primo_incasso_invisibile]]
15. **`PROGETTO.md` diceva il falso su Stripe** («mai collegato») da tre settimane. Corretto, e ora `tests/probe-documenti.mjs` in `deploy.ps1` confronta le *affermazioni* del documento con le chiavi vere su Vercel → [[reference_documento_che_mente]]
16. **§2.8 di `PROGETTO.md`**: Stripe si apre con `fra.malagoli@gmail.com` via Google. ⚠️ **Non esiste una password Stripe**: chi perde l'account Google perde Stripe.

---

## ⛔ SI RIPARTE DA QUI

### 0. Due verifiche a mano che NON ho potuto fare (5 minuti)
La sonda crea un admin effimero di un'altra azienda, e la lista incassi compare
solo a conto collegato: ho verificato che le pagine non vadano in errore e che
le query siano giuste, **non che si vedano bene**.
- `/admin/pagamenti` → scegli **Garage 22**: deve comparire «Incassi ricevuti €1,00» con la riga di Agnese
- Prenotazioni dell'evento di prova → pastiglia verde **`Pagato`** sulla riga di Agnese, e «€1,00 già incassati online» in cima

### 1. WhatsApp — la dashboard Meta (dipende da Francesco, invariato dal 19/09)
Su Vercel c'è solo `WHATSAPP_TOKEN_KEY`: mancano `META_APP_ID` · `META_APP_SECRET` (**da rigenerare**) · `META_ES_CONFIG_ID` (dalla configurazione Embedded Signup, da creare) · `WHATSAPP_WEBHOOK_TOKEN`. Finché mancano il pulsante «Collega WhatsApp» non compare a nessuno (voluto).
- ⚠️ Ogni variabile nuova **richiede un redeploy**.
- ⚠️ Il webhook risponde **403** finché manca il token: metterlo **prima** di registrare l'URL su Meta. URL: `https://www.oltrenova.com/api/whatsapp/webhook` — **su www, mai sull'apex**.
- Restano: numero di test, App Review con i **due video**, tariffe Meta Italia, e la **prova dal vivo** del collegamento (l'unico pezzo scritto e mai provato).
- ⚠️ Email da uniformare prima dell'App Review: `info@oltrenova.com` · `oltrenova@gmail.com` · `fra.malagoli@gmail.com`.

### 2. ~~Hydration sul dettaglio evento~~ ✅ risolta il 23/09 (vedi in cima).

### 3. Tre siti senza titolo per Google (10 minuti, serve solo il tuo ok)
`noleggio-automax`, `d-o-pier-francesco-giachini` e **`metodotvb`** non hanno `seo_title`/`seo_description`: nei risultati di ricerca Google si inventa il titolo. Si scrivono a mano o col pulsante «Proponili tu» nel pannello Stato del sito. Sono testi che vede il pubblico: li approvi tu.

### 4. Aperti da prima, invariati
- **Search Console**: non esiste per nessun dominio → senza, «indicizzato» non si può dire → [[project_search_console]]
- **Sezioni universali** (idea di Francesco del 22/09): una sezione definita una volta e usata su più pagine → [[project_sezioni_universali]]
- **Foto vere** di inlingua Terni: oggi sono Unsplash, e le slide del cliente dicono per prime che servirebbero quelle vere.
- **OltreNova cliente di sé stessa** + rifare la landing (il fermo per Meta è tolto) · **DNS** metodotvb e fondaconarni · elenco **Offerte** nel pannello che deduce «Gratis».
- ~~primo incasso Stripe con Garage 22~~ ✅ **fatto il 22/09** (punti 13–14 qui sopra).
- **`SENTRY_DSN` da togliere da Vercel**: residuo del servizio rimosso il 23/07, nessuna riga di codice la legge. `probe-documenti.mjs` la segnala come *promemoria*, non come errore — sparisce da sola quando la togli.
- 💡 **Proposto a Francesco il 22/09, da decidere**: estendere `probe-documenti.mjs` a segnalare le voci di `FEATURES.md` marcate «futuro / da fare» il cui **codice però esiste già**. Nasce da un caso vero: «Sprint 11 — Stripe payments (futuro)» aveva tutte le caselle vuote mentre incassava da tre settimane. Oggi il controllo automatico copre solo `PROGETTO.md`; su `FEATURES.md` e su questo promemoria **non c'è niente che contraddica una riga falsa** — restano affidati alla memoria di chi chiude la sessione, che è esattamente ciò che ha fallito → [[reference_documento_che_mente]]

### 5. Da chiedere a Garage 22
Quante prenotazioni arrivano al telefono su 60 posti? La risposta decide quanto grande deve essere la quota riservata (punto 8 qui sopra).

---

## 📄 Storico delle sessioni precedenti

## ▶️ 19/09 — SESSIONE CHIUSA. Tutto live. Migration eseguite: fino alla **124**

**Fatto oggi:**
1. **Il prezzo di un evento lo dichiara il cliente** (migration **123**, segnalato da Garage 22: la cena si paga sul posto e la pagina diceva «Gratuito»). Tre pulsanti nell'editor — Gratuito · Una cifra · Lo scrivo io — e se non si sceglie non si scrive niente → [[reference_prezzo_evento_scelto]].
2. **Pubblicare un sito lo rende trovabile su Google** (migration **124**), e **chi spegne di proposito non viene riacceso**: provati tutti e due i versi in produzione. Più **titolo e descrizione proposti dall'AI** («Proponili tu» nel pannello Stato del sito), che **propone e non salva** → [[reference_visibilita_alla_pubblicazione]].

## ⛔ SI RIPARTE DA QUI: WhatsApp, cosa manca nella dashboard Meta

Verificato il 19/09. **Su Vercel c'è solo `WHATSAPP_TOKEN_KEY`**: ne mancano **quattro**, e finché non ci sono il pulsante «Collega WhatsApp» non compare a nessuno (voluto).
- `META_APP_ID` · `META_APP_SECRET` (**da rigenerare**: il 15/09 è passato dalla chat) · `META_ES_CONFIG_ID` (lo dà la **configurazione Embedded Signup**, ancora da creare) · **`WHATSAPP_WEBHOOK_TOKEN`** (mancava anche dalla nostra lista).
- ⚠️ Ogni variabile nuova **richiede un redeploy**: senza, Vercel la mostra configurata e il codice la vede vuota.
- ⚠️ **Il webhook oggi risponde 403** perché manca il token: registrando l'URL su Meta **prima** di metterlo, la verifica fallisce e si cerca l'errore nel posto sbagliato. URL da registrare: `https://www.oltrenova.com/api/whatsapp/webhook` — **su www, mai sull'apex** (l'apex dà 308, e un 3xx è una consegna fallita).
- Restano poi: **numero di test** di Meta, **App Review** dei permessi `whatsapp_business_management` + `whatsapp_business_messaging` con i **due video** e le «Istruzioni per il test» (lasciate vuote apposta), **tariffe Meta Italia** al posto di quelle Spoki, e la **prova dal vivo** del collegamento — l'unico pezzo scritto e mai provato.
- Offerta fatta a Francesco e non ancora accettata: preparargli l'elenco campo per campo di cosa incollare dove, più le due tracce per i video.
- ⚠️ **Email incoerenti** da uniformare prima dell'App Review: `info@oltrenova.com` (app Meta), `oltrenova@gmail.com` (informativa), `fra.malagoli@gmail.com` (DPO).

**Altri aperti**: Search Console (non esiste: senza, «indicizzato» non si può dire) · i 4 siti senza titolo/descrizione, ora sistemabili in un clic · OltreNova cliente di sé stessa + rifare la landing (**il fermo per Meta è tolto**) · primo incasso Stripe con Garage 22 · DNS metodotvb (Francesco, settimana prossima) e fondaconarni · elenco Offerte nel pannello che deduce «Gratis».

## ▶️ 18/09 — SESSIONE CHIUSA. Tutto live, nessuna migration in sospeso (ultima: 122)

**Fatto oggi, in ordine:**
1. **Credito AI in euro** (cambio BCE fisso 1 € = 1,1537 $ in `lib/valuta-ai.js`), tetto predefinito **5 €**. Console Anthropic messa da Francesco a **20 $/mese**.
2. **Il 404 di `/admin` sul dominio di un cliente** — corretto, sonda `probe-molti-indirizzi` a ogni deploy → [[reference_molti_indirizzi]].
3. **Le 8 funzioni del registro visivo** (font display, fondo scuro vero, alone, etichetta, `<mark>`, barra a pillola, pulsante con alone; i numeri animati c'erano già) → [[reference_registro_visivo_siti]]. Tutte **spente di default**.
4. **SEO, due giri**: evento e blog erano **vuoti per Google**; canonical, descrizioni automatiche, un solo H1, articoli in sitemap; `probe-seo` + `probe-contrasto` in `deploy.ps1` → [[reference_seo_primo_giro]].
5. **Pannello «Stato del sito»** in Sito web + riga in Dashboard (per cliente **e** super_admin) → [[reference_stato_sito]].

**Aperto, e sono decisioni di Francesco:**
- ⛔ **Un sito nuovo nasce invisibile ai motori.** Tre strade: resta manuale ma dentro l'onboarding · si accende da solo quando il cliente pubblica (**consigliata**) · sempre acceso.
- **Quattro siti veri non hanno titolo e descrizione** per i risultati: Metodo TVB, inlingua, Automax, D.O. Giachini. Proposta non ancora approvata: farli **proporre dall'AI**, da confermare con un clic.
- **OltreNova cliente di sé stessa** (blog e pagine dal pannello) + **rifare la landing**: deciso di riparlarne, fermo per l'esame Meta.
- **Search Console**: non esiste per nessun dominio → [[project_search_console]].
- **WhatsApp**: sbloccato (Tech Provider approvato). Servono le chiavi Meta e il numero di prova: primo pezzo di Francesco.

⚠️ **Due trappole di metodo imparate oggi** (valgono sempre): non lanciare `npm run build` mentre gira `npm run dev` (il dev poi serve una copia vecchia o si rompe); e per provare qualcosa «come la vede il cliente» serve un utente effimero `admin_azienda` **e** togliere il 2FA obbligatorio sulla nostra azienda di prova per il tempo del controllo, rimettendolo subito.

## 🟢 18/09 — META: VERIFICA TECH PROVIDER **APPROVATA**

«La tua azienda è stata verificata come Tech Provider» (Francesco, 18/09). Era il passo che bloccava WhatsApp. **Restano**: configurazione Embedded Signup + `META_APP_ID`/`META_APP_SECRET`/`META_ES_CONFIG_ID` in `.env.local` (li mette lui), segreto dell'app da rigenerare, prova dal vivo col numero di test (unico pezzo scritto e non provato), i **due video** per l'App Review dei permessi, tariffe Meta Italia.
⚠️ **Chiedere se il fermo sul sito pubblico vale ancora**: l'App Review dei permessi non è finita e un revisore potrebbe aprire `oltrenova.com`.

## ⛔ PRIMA COSA DELLA PROSSIMA SESSIONE — la decisione sul sito di OltreNova

**Sessione chiusa il 17/09/2026.** Tutto live, nessuna migration in sospeso (ultima eseguita: **122**).

🚨 **Siamo sotto esame di Meta per diventare Tech Provider: non si tocca niente di visibile** — sito pubblico, landing, `/#canali`, pagine legali, `/cancellazione-dati`. Se il revisore apre il sito deve trovarlo com'era quando la richiesta è partita. Vale finché Francesco non dice che la valutazione è finita.

**Da decidere insieme domani** (Francesco: «vorrei pure rifarla», riferito alla landing):
1. **OltreNova diventa cliente di sé stessa?** Azienda + entità nostre dentro la piattaforma, così il blog e le pagine di marketing si scrivono dal pannello invece che con un deploy. Motivi: contenuti veri su cui posizionarsi, usiamo il nostro prodotto (i difetti li troviamo noi), e «il sito di OltreNova è fatto con OltreNova».
2. ⚠️ **`oltrenova.com/blog` oggi pubblica l'articolo di un CLIENTE**: `/api/blog/public` senza filtri elenca gli articoli di tutte le aziende, e l'unico pubblicato è «Degustazione di farine» dell'entità di prova `struttura-test`. Da filtrare sulla nostra azienda — ma serve che la nostra azienda esista (punto 1).
3. **Rifare la landing**: oggi è hardcoded in `LandingPage.jsx`. Se passa nel CMS, ogni parola non richiede più un deploy. Da valutare **dopo** il via libera di Meta.
4. Nodo tecnico già individuato: l'entità «OltreNova» genererebbe un proprio indirizzo che **non deve farsi concorrenza con `oltrenova.com`** nei motori (canonical + «un sito, un indirizzo»). Ho la soluzione in mente, va discussa prima di scrivere.

## ▶️ 17/09 — stato aggiornato da Francesco (VALE SU TUTTO QUELLO SOTTO)
- Verifica accesso Meta (Tech Provider) **inviata, in valutazione**.
- `metodotvb.it` DNS: lo fa la settimana prossima. `fondaconarni.com` (record A apex **mancante**, DNS SiteGround): ce lo notifica lui. Al 17/09 entrambi ancora giù.
- Abbonamento OltreNova su Stripe + prezzo ricarica AI: **fermi**, sta inquadrando l'attività con la commercialista.
- Nome pubblico su Stripe **cambiato**. Garage22 dovrebbe collegare Stripe il 17/09 → poi primo incasso vero.
- Progetto Supabase di ripristino **cancellato**; Futura Vacanze **cancellata**; offerta Automax **risolta** da lui.
- Evento «A cena con…» di Garage22: **non interessa**, non riproporlo.
- Chiesto: tetto AI **in euro** (clienti italiani).
- ⚠️ Già FATTI, non riproporre come aperti: vetrina shop sui siti (blocco Shop, `f4f5edc4`). Le 13 prenotazioni eventi `pending` sono una decisione presa (non si toccano). Le 2 offerte con orario forse spostato sono scadute (maggio e 30/08–02/09): irrilevanti.
- Lezione: le sezioni «da decidere» di questo file invecchiano; prima di riportarle, verificarle su git log e DB.
- Limite di spesa sulla **Console Anthropic messo a 20 $/mese** (era 200.000): il tetto della piattaforma ora c'è.
- ✅ **Credito AI in euro — LIVE 17/09** (deploy `11fbee69`, nessuna migration). `lib/valuta-ai.js` è l'unico punto della conversione, cambio BCE **fisso** 1 € = 1,1537 $; il DB resta in dollari. Pannello, Diagnostica ed email di avviso in euro; route credito-ai riceve `tetto_su_misura_eur`/`extra_mese_eur`, max 850 €. **Tetto predefinito ora 5 € (5,77 $)**, scelto da Francesco. Verificato in produzione: «Tetto 5,00 € (predefinito)», 5000 € rifiutato, Diagnostica in euro.
- 🕐 **Credito annuale invece che mensile**: ragionato il 17/09 e **rimandato di proposito**. Il contratto sarà annuale, ma oggi mancano i dati (il registro `ai_consumi` ha 1 sola chiamata) e la data di inizio contratto (l'abbonamento OltreNova su Stripe non esiste). Quando ci saranno: credito annuale legato all'anniversario + freno mensile più largo (~3× la quota) contro l'abuso.
- 🔴 **Il 404 di `/admin` sul dominio di un cliente — successo davanti a un cliente, CORRETTO e live** (`153e005b`). `www.garage22terni.it/admin` → ora 307 al pannello; `/termini` e `/cancellazione-dati` idem; `/checkout` invece **resta** sul dominio del cliente (prima 404 dopo il pagamento) ed è in `Disallow`. Sitemap di `oltrenova.com` non più vuota. Nuova sonda `probe-molti-indirizzi.mjs` in `deploy.ps1`: **15 indirizzi su 15 verdi**, provata prima della correzione (li trovava tutti rotti). Regola 9 in `CLAUDE.md`. → [[reference_molti_indirizzi]]
- ⚠️ Lo smoke di `deploy.ps1` ha dato **❌ Form Builder «loop di caricamento» a 9,5s**: falso allarme da partenza a freddo — riprovato subito dal vivo, carica in 530 ms e 251 ms. Se si ripete, alzare quella soglia invece di indagare il codice.

**Sessione chiusa il 16/09/2026.** Tutto live, migration eseguite fino alla **122**, nessuna in sospeso. Riepilogo → [[project_session_2026_09_16]].
**Prima domanda alla ripresa**: ha inviato la verifica dell'accesso? Ha creato la configurazione Embedded Signup e messo `META_APP_ID`/`META_APP_SECRET`/`META_ES_CONFIG_ID` in `client-next/.env.local`? Se sì → provo il collegamento col numero di test (è l'unico pezzo **scritto e non provato**), poi i due video per l'App Review.
Risposte già date al modulo Meta: «gestisci più portfolio business?» → **No**; sito → `https://www.oltrenova.com` (ora con la sezione `/#canali` che descrive il servizio, aggiunta apposta perché il revisore la trovi).

## ▶️ 16/09 — verifica aziendale Meta APPROVATA, si costruisce WhatsApp

Prossimi passi di Francesco: (1) avviare la **verifica dell'accesso** (Tech Provider) col testo inglese che gli ho dato in chat — Business Verification era il prerequisito, decisione in ~5 giorni; (2) l'**App Review** dei permessi pretende **due video**: un messaggio inviato dalla nostra piattaforma e ricevuto su WhatsApp, e la creazione di un modello dalla nostra piattaforma → prima serve il collegamento funzionante (si gira col numero di test).

Fatto oggi ed è **LIVE** (migration 122 eseguita, deploy `4e36718f`, `probe-whatsapp-numeri` verde in produzione, pagina WhatsApp aperta dal browser senza errori — mostra ancora «stiamo completando l'attivazione» perché mancano le chiavi Meta, ed è voluto):
- **Embedded Signup v4 vero** in `components/admin/CollegaWhatsApp.jsx`: SDK Facebook, `FB.login` con `config_id`+`response_type:'code'`, il codice va al server e l'evento `WA_EMBEDDED_SIGNUP` dà waba/numero. Origini Meta confrontate per uguaglianza (non `endsWith`). Prima era un `alert()`.
- **Un numero per entità** + uno generale: migration **122** (droppa l'UNIQUE su azienda_id cercandone il nome, due indici parziali, numero unico globale). `lib/whatsapp-account.js` = unico punto per «quale numero usa questa entità»; aggiornati i 4 lettori che usavano `.maybeSingle()` su azienda (con due numeri **fallivano**) + i 3 chiamanti di `inviaMessaggioWhatsapp` che ora passano `entityId`.
- Route connect: elenco numeri, POST con `entity_id` verificato, DELETE di un singolo numero (i modelli restano). Sonda `tests/probe-whatsapp-numeri.mjs`.
- Serve **META_ES_CONFIG_ID** (configurazione Embedded Signup nella dashboard Meta) oltre a META_APP_ID/SECRET: finché mancano, il pulsante non compare (voluto).
⛔ **Due passi obbligatori che mancavano**, trovati grazie alla domanda di Francesco «ma basta solo quello che hai scritto?»: iscrizione ai webhook del WABA (`POST /{waba}/subscribed_apps`) e registrazione del numero (`POST /{phone}/register` con PIN a 6 cifre, conservato cifrato in `dettaglio.pin_cifrato`). Senza il primo non arriva nessuno stato di consegna, senza il secondo **ogni invio viene rifiutato**. Se la registrazione fallisce il numero resta `in_verifica`, non `attivo`.
⚠️ Da verificare al primo test dal vivo: la **coesistenza** (numero già sull'app WhatsApp Business) potrebbe richiedere un `featureType` negli extras del launcher.
⚠️ Manca ancora, prima del primo cliente vero: tariffe Meta Italia al posto di quelle prese da Spoki.

**Sessione del 15/09**: tutto live, migration fino alla **121**. Riepilogo → [[project_session_2026_09_15]].

## ✅ 15/09 notte — tetto AI LIVE (migration 119 eseguita, deploy 12c378df)
`probe-ai-consumi.mjs` in produzione: tutto regge (429 su 6 funzioni, chatbot
con contatti, blog-auto altrui 404). Diagnostica aperta dal browser: riga visibile.
Migration **120 eseguita** e verificata (anon 401 in lettura e scrittura).
**$5/mese per AZIENDA confermato** da Francesco. API: approvato il piano in 3 passi
(operazioni in lib/ → assistente AI → /api/v1 solo con un utilizzatore vero).
**Ricarica credito — LIVE 15/09 (deploy 1500a4b3, migration 121 eseguita)**: Aziende → Credito AI
(tetto su misura + extra solo del mese, route `/api/aziende/[id]/credito-ai`
solo super_admin), banner al cliente dall'80% in AdminLayout, Diagnostica conta
l'extra e mostra 3 decimali. Verificato: il cliente NON può aggiornare `aziende`
dal browser (RLS, 0 righe). Provato in produzione: banner 85%, cliente 404 su ricarica, ricarica 5$ → 14%, AI riparte; probe-ai-consumi ancora verde.
Trovato e corretto: password sonde non conformi alla nuova policy Supabase (31 file, anche global-setup).

## (storico) PRIORITÀ 15/09 sera — tetto AI: scritto, NON live
Francesco: «ho già fornito le password a più di un cliente e non vorrei che nel
tentativo di giocare possano già sforare». Delle 13 chiamate all'AI solo il
chatbot aveva un limite vero. Fatto sul ramo **`ai-consumi`** (pushato, build ok,
regole ok): `lib/ai-consumi.js` unico punto, tetto $ per azienda, riga in
`ai_consumi` per chiamata, avvisi 80/100%, Diagnostica, regola 12 in
verifica-regole. → [[project_ai_consumi]]
**Sequenza**: Francesco esegue **migration 119** (su main, idempotente anche se
avesse eseguito la prima versione) → merge del ramo in main → `deploy.ps1` →
`node tests/probe-ai-consumi.mjs` → aprire Diagnostica e un «Genera con AI».
⚠️ NON deployare il ramo prima della 119: senza tabella il controllo lancia e
l'AI si ferma per tutti. Da decidere con lui: tetto predefinito (messo **$5**).

## ▶️ 15/09/2026 — fatto stamattina

- **Diagnosi domini chiusa**: il gemello (con/senza www) dice `manca` →
  «aggiungi», `altrove` → «sostituisci» col record da cancellare,
  `certificato` → niente da fare. Prima diceva sempre «manca un record».
- **Rete di sicurezza del redirect, che il 14/09 avevo dichiarato e NON
  esisteva** (il cron rimisurava solo i pendenti). Opzione A di Francesco →
  [[reference_un_sito_un_indirizzo]]. Anche: un dominio attivo non viene più
  declassato da una prova a vuoto aprendo la pagina Domini.
- ⚠️ **Correzione a quanto scritto ieri**: `fondaconarni.com` NON ha lo stesso
  guasto di metodotvb. Lì il record A dell'apex **manca** (va aggiunto); su
  metodotvb c'è e punta ad Aruba (va sostituito).

### ✅ Migration 117 eseguita (15/09) e lavoro pubblicato
Migration eseguite: fino alla **117**. Live e provato: punto focale sulla
copertina del sito (striscia dell'app del QR), forma + punto focale sul blog
(senza forma resta la fascia da 340px; con forma la foto entra intera nello
schermo), valori ostili → null in creazione, modifica e PATCH entità.
`prodotti.immagine_focal` esiste ma NON è usata: aspetta la vetrina dello shop.

### ✅ BLOCCO SHOP — LIVE (15/09). Migration eseguite: fino alla **118**
Un visitatore ora può vedere e comprare. Provato: ordine completo dal sito
(prezzo riletto dal server, prova del consenso salvata, scorte NON scalate da
un ordine non pagato), casi ostili (400 senza consenso, 409 scorte), editor.
Dati di prova cancellati. La route pubblica dell'ordine ora risponde solo
`{ numero, checkout_url }` (prima la riga intera).
Per le prove d'ordine: email `delivered@resend.dev`, MAI un indirizzo inventato.

### ▶️ PROSSIMO: acquisto vero con Stripe (serve Francesco)
Mai provato un pagamento reale dal blocco Shop. Serve un'azienda con i
pagamenti attivi (Garage22 dopo l'onboarding Stripe): prodotto da 1–2 €, blocco
Shop su una pagina, acquisto con carta vera → soldi sul cruscotto Stripe del
cliente · email di conferma · ordine «pagato» · punti/gift card finalizzati.

### ✅ Fatto il 15/09 pomeriggio (live)
- **Una sola galleria** (`GalleriaFoto`) al posto di 5 copie: riordino, Unsplash,
  4 MB, errori nella pagina, un file sbagliato non ferma gli altri.
- **Miniature** (piatto, attività, escursioni): `useCaricaFoto`, stessa logica,
  aspetto invariato. Attività ed escursioni non controllavano il peso affatto.
- ⛔ **Le foto dei prodotti non si erano MAI potute caricare**: la route
  `minisito-image` non conosceva `entity_type=prodotto` (400). Corretto.

### ⚠️ Da dire / decidere con Francesco
- **Lo shop non ha una vetrina sui siti.** `ShopWidget` esiste ma nessuna pagina
  né blocco lo monta: pannello, carrello, pagamento e ordini ci sono, il catalogo
  pubblico no. È una funzione che un cliente non può usare davvero.
- Punto focale per singola foto nelle gallerie: richiede di cambiare la forma dei
  dati (elenco di indirizzi) letta da più punti → va chiesto prima.
- `RestaurantSection.jsx` ha ancora il limite a 2 MB ma nessuna route lo monta.

## ▶️ 14/09/2026 — SI RIPARTE ESATTAMENTE DA QUI

Tutto quello di oggi è **live e verificato in produzione**. Migration eseguite:
fino alla **116**. Nessuna migration in sospeso.

### La domanda aperta, da fare a Francesco appena si riprende
Il gruppo "libero" dei formati foto è finito. Restano **tre strade**, lui sceglie:

1. **Il secondo componente condiviso** — per le **gallerie a più foto**
   (prodotti shop, risorse prenotabili, gallery entità) e le **miniature dentro
   liste fitte** (foto del piatto nel menu, 56×56 in una riga densa).
   ⚠️ NON infilarci dentro `CampoImmagine`: snaturerebbe la pagina in cui il
   cliente lavora ogni giorno. Serve una forma diversa. Vedi
   [[reference_caricamento_foto]].
2. **Le migration per i formati mancanti** — servono a me le colonne per:
   copertina dell'entità (`cover_focal`/`formato` su `entita`), copertina del
   blog, foto dei prodotti. `cover_focal` oggi esiste **solo** su `eventi`
   (migration 083). Le migration le esegue lui.
3. **Il messaggio impreciso della diagnosi domini** (rimasto in coda due volte,
   lui ha detto «poi vediamo»): dice «manca un record nei DNS» anche quando il
   record **c'è ma punta altrove** — è successo su `metodotvb.it`, che punta ad
   Aruba invece che a Vercel, e ha fatto dubitare Francesco del pannello.
   Da far dire: «c'è un record ma porta da un'altra parte», col valore trovato.

### ⚠️ In attesa di Francesco (dominio)
**`metodotvb.it` senza www NON funziona**, e non è propagazione: il nameserver
autoritativo di Aruba pubblica **un solo** record A → `62.149.128.40` (Aruba,
risponde IIS sulla porta 80 e rifiuta la 443). Il `www` è giusto (CNAME Vercel,
200). Deve sostituire quel record A con i **due** che chiede Vercel — le due
righe che gli sembravano un doppione nel pannello **non lo sono**, servono
entrambe. Valori da leggere in `Admin → metodotvb → Domini` (li chiede a Vercel
dal vivo, mai scriverli nel codice). Stesso identico problema su
**`fondaconarni.com`** (apex irraggiungibile, www a posto). Garage22 è a posto.
Quando dice che ha salvato → rifare il giro dai tre resolver.
⚠️ Il resolver locale di Telecom **falsifica `nslookup`**: usare
`https://dns.google/resolve?name=…&type=A`. Vedi [[reference_un_sito_un_indirizzo]].

### Fatto oggi, tutto live
- **Un sito, un indirizzo** — se il cliente ha un dominio, il nostro percorso e
  il sottodominio ci mandano lì (307, query preservata, app del QR compresa), e
  il **QR si incide sul suo dominio**. Sistemate sitemap ed email che
  dichiaravano un indirizzo diverso dal canonical. → [[reference_un_sito_un_indirizzo]]
- **Caricamento foto**: `CampoImmagine` (campo unico) su copertina blog, logo +
  logo negativo + copertina delle Info dei tre tipi, Foto+Testo. Il peso massimo
  è **4 MB misurati** (sopra risponde 413 la piattaforma). Trovato che **solo le
  strutture non avevano il campo del logo negativo**, pur avendo colonna, route
  e sito. → [[reference_caricamento_foto]]
- **La forma la sceglie il cliente**: selettore condiviso su evento, **Team**
  (niente più cerchio obbligatorio), Foto+Testo, Carosello, Card paragrafi.
  ⚠️ Senza scelta resta il rapporto storico: i siti online non cambiano faccia.
- **Difetto ricorrente trovato due volte**: la foto si poteva solo *incollare*
  come indirizzo (blocco Team, poi Card paragrafi). Guardare gli altri blocchi.
- **Test reso meno fragile**: `public-render.spec.js` chiedeva `/r/garage22` sul
  nostro dominio → dal 14/09 fa 307, quindi due avvii a freddo, e gli smoke
  partono 15s dopo il deploy. A freddo una pagina impiega ~9s, a caldo ~1s, e il
  timeout era 10s: ha bocciato un deploy sano. Ora chiede l'indirizzo vero.

### Lezione da non ripetere
[[feedback_vincolo_o_scelta]] — avevo scritto che il formato «non avrebbe senso»
sul Team «perché la cornice è un cerchio fisso». Era una riga di CSS, non un
vincolo: una scelta di prodotto, che spetta a lui.

---

## ✅ RIPRISTINO PROVATO E RIUSCITO (13/09/2026)

Dettaglio in [[reference_backup_e_ripristino]] e INCIDENTE.md §3.2.
✅ **Migration `078b` e `115` eseguite in produzione il 13/09** e verificate:
4 tabelle e 12 colonne al loro posto, dati invariati, servizio in piedi. Da qui
le migration descrivono di nuovo la realtà. **Migration eseguite: fino a 115
(+078b).**

**Chiuso davvero il 13/09 sera**: rifatto su un secondo progetto e passata per
intero la lista di `tests/verifica-ripristino.mjs` — **24 controlli su 24**,
scritture comprese (un ospite manda una richiesta, il pannello crea e modifica,
il contenuto compare sul sito). Francesco ha anche guardato a mano.
Produzione mai sfiorata: righe invariate, zero tracce, sito 200.

**Resta:**
1. **Francesco**: cancellare il progetto Supabase di prova (autorizzato il
   13/09) e svuotare `tests/.env.ripristino`. Contiene una copia completa dei
   dati personali dei clienti.
2. ✅ **Immagini provate leggendo dall’archivio su R2** (13/09): copia dei file
   **e riscrittura degli indirizzi nel database**, senza la quale un ripristino
   vero riporta i siti con le foto morte. **Niente resta non provato.**


## ▶️ (storico) PROVA DI RIPRISTINO — come si è arrivati qui (12/09/2026)

Lo script c'è ed è provato: **`tests/ripristino.mjs`** (schema → account →
dati → verifica, tutto cronometrato; la sicura che rifiuta la produzione è
stata provata in tre casi). Manca solo quello che richiede l'account di
Francesco. **Claude non può fare questi due passi**: le chiavi R2 non esistono
in locale (`vercel env pull` scrive `[SENSITIVE]`) e nessuna route del pannello
scarica gli archivi — l'unica che esiste li *crea*.

**Passo 1 — Francesco: l'archivio.** Cloudflare → R2 → bucket → l'ultimo
`backup-*.json.gz` → Download. Poi dire a Claude il percorso del file.
→ Claude lancia `node tests/verifica-backup.mjs <file>`.
⚠️ Finito, **cancellare il file**: è il database dei clienti in chiaro.

**Passo 2 — Francesco: il progetto di prova.** Supabase → New project, piano
gratuito, regione EU (`oltrenova-ripristino`). Segnare la password del database
(si vede una volta sola). Creare `tests/.env.ripristino` — è in .gitignore,
**i valori non passano dalla chat**:
```
RIPRISTINO_SUPABASE_URL=https://xxxxx.supabase.co      (Settings → API)
RIPRISTINO_SERVICE_ROLE_KEY=...                        (Settings → API)
RIPRISTINO_DB_URL=postgresql://postgres:PWD@db.xxxxx.supabase.co:5432/postgres
                                                       (Settings → Database → URI)
```

**Passo 3 — Claude**: `node tests/ripristino.mjs <archivio> ` (simula) e poi
`--esegui`. Poi **la prova vera**, che non è «le righe sono entrate»: puntare
l'app locale al progetto ripristinato (env var) e **aprire il sito di un
cliente ed entrare nel pannello**.


Domanda a cui la prova risponde (aperta da luglio): **si può imporre l'id a un
account ricreato?** Se no, il ripristino deve riscrivere gli id nei profili e
in tutto ciò che li riferisce. Lo script lo misura e lo dichiara.
Vedi [[project_backup_lacune]], [[reference_backup_e_ripristino]].

## ✅ Migration 114 eseguita (12/09), e provata in produzione

Cambio indirizzo dal pannello → il vecchio risponde **308** verso il nuovo,
l'inesistente **404**. Provato con un evento di prova, poi cancellato.
Migration eseguite: fino alla **114**. Vedi [[reference_eventi_conclusi]].

⚠️ Da proporre a Francesco: l'evento di Garage22 «A cena con Chiara e Daniele»
ha ancora indirizzo `a-cena-con-sara-e-chiara`. Ora si può correggere senza
rompere niente — è un dato di un cliente, quindi si chiede prima.

## Fatto l'11/09 (live, verificato in produzione)

- **Eventi**: un evento finisce alla sua fine (non all'inizio), dopo non si
  prenota più (route + pagina), e il blocco eventi del sito mostra i **passati,
  acceso di default** (deciso da Francesco). → [[reference_eventi_conclusi]]
- **Orari che scivolavano**: modulo evento e newsletter programmate perdevano
  2h a ogni salvataggio. Corretto → [[reference_fuso_orario]].

### ⚠️ Da chiedere ai clienti (orari già scivolati: il DB non si ripara da solo)
- **Garage22, «Listening con Federico» del 17/09**: in DB 18:00–21:30. È l'ora
  giusta? Se era stato salvato più volte potrebbe essere scivolato (es. 20:00).
- **inLingua, Open Week**: 14/09 14:51 → 18/09 14:52 — minuti strani, sembrano
  l'ora di creazione. Chiedere orari veri: dalla fine dipende quando si chiude.
- **Offerte**: variante del difetto non corretta (istante sbagliato di 2h ma
  stabile). Decisione di Francesco se sistemarla — cambia l'ora mostrata.

### Email degli eventi: ora giusta (11/09, live) — manca la prova sull'email vera
Le route funzionano in produzione, ma **nessuno ha letto un'email vera**. Prova
di Francesco: evento di prova nell'azienda StayApp Development alle 20:30 →
prenotarlo con la sua email → la conferma deve dire «alle ore 20:30».
Poi cancellare evento e prenotazione.

### Fatto il 12/09
- **Email di conferma provata davvero**: evento di prova alle 20:30 → email a
  Francesco. Nella nota CRM scritta dalla produzione: «alle ore 20:30» (prima
  18:30). Tutto cancellato dopo, contatto rimesso com'era.
  ⚠️ La scrittura nel CRM avviene in `after()`, **dopo** la risposta: una
  pulizia fatta subito non trova ancora la riga.
- **Categoria orari chiusa + guardia** → [[reference_fuso_orario]] §12/09.
- **Blog automatico**: cercava `start_date` (colonna inesistente) → corretto.
- Garage22 ha corretto l'orario: il Listening ora è 20:30–23:30, salvato col
  codice nuovo. inLingua Open Week era **di prova**: nessuna telefonata.

### Trovato e NON toccato
- **Le due offerte già in archivio** hanno l'istante spostato di 2h (salvate col
  vecchio modo). Il codice ora salva giusto; quelle due righe no. Sono
  «Week end di Natale sconto 30%» e «Nuova offerta», entrambe con aria di
  prova: da guardare con Francesco prima di toccarle.
- **Avviso React «unique key prop»** sull'app di `deborahresinart`, solo in
  modalità sviluppo. Verificato il 12/09 che **non** viene dalle modifiche di
  oggi (provato con e senza, stesso dev): è preesistente, in
  `LandingBlockRenderer`.

## ✅ Archivio completo — resta da provare il ripristino

Chiuso il 09/09 pomeriggio: nel backup ora ci sono i **15 account di accesso**
e le **62 immagini** dei clienti, più una copia mensile tenuta un anno. Provato
in produzione. Due difetti trovati strada facendo: il pulsante «esegui backup
adesso» era rotto dal 29/08 (il bucket lock vieta di riscrivere il file del
giorno) e il cron non dichiarava un tempo massimo.

**Il ripristino resta da provare** — ora però su un archivio completo, che era
il punto. Piano e prima domanda a cui rispondere in [[project_backup_lacune]].

⚠️ **Due verifiche piccole prima di considerarlo chiuso davvero:**
1. **Francesco**: scaricare l'ultimo `backup-*.json.gz` dal bucket R2 su
   Cloudflare e lanciare `node tests/verifica-backup.mjs <file>` — nessuno ha
   ancora aperto un archivio **vero** fatto dal codice nuovo (in locale le
   chiavi R2 non si possono avere: `vercel env pull` le maschera). Poi
   cancellare il file: è il database dei clienti in chiaro.
2. La notte fra il **9 e il 10 settembre** è la prima volta che il cron gira col
   codice nuovo. Se fallisce arriva un'email.

Sessione chiusa il **9 settembre 2026** (sera). Tutto live e provato in
produzione; migration eseguite l'8: **112**, **113** — il 9 **nessuna**, niente
da eseguire su Supabase. Dettaglio in [[project_session_2026_09_08]].

## Fatto il 09/09

- **sharp non è più una fortuna.** Era una `optionalDependency` di Next: npm poteva
  saltarla **senza errore** e la compressione delle immagini sarebbe morta muta.
  Ora è dichiarata, e `tests/probe-compressione-immagini.mjs` se ne accorge —
  provata anche al contrario, togliendo sharp. Vedi [[reference_guasti_silenziosi]].

- **Il forfait vale solo per le sue date.** Il ponte 5→9 a €850 veniva applicato
  anche a chi ne prenotava due giorni: pagava €850 invece di €240. Ora solo le
  date esatte lo prendono, e chi ne sceglie una parte vede un riquadro con le
  date giuste e il prezzo, che tocca per impostarle. Vedi
  [[reference_offerte_risorse]].
- **I domini non si perdono più, da nessuna delle quattro porte.** La riga in
  `domini` spariva anche quando Vercel non era stato liberato, e l'hostname
  restava agganciato e invisibile. Corretto cancellando un'entità, cancellando
  un'**azienda** (che porta via tutto in cascata) e nel giro del cron. Chiusa
  anche la radice: i sottodomini nascono **`attivo`** e la manutenzione guardava
  solo i pendenti, quindi le righe orfane non le vedeva nessuno.
  **Pulizia**: erano 77 hostname su Vercel contro 15 righe nel database — 56
  staccati, residui delle sonde più `futura-club-spiagge-bianche`. Ora zero
  orfani, e il ciclo si richiude da solo. Vedi [[reference_domini_vercel]].
- **Patch di sicurezza**: `next 15.5.24` + `sharp 0.35.4`. Un RCE non
  autenticato che **questa volta ci riguardava davvero** — `/_next/image` era
  vivo e processava AVIF anche se `next/image` non è importato da nessuna parte.
  Vedi [[reference_triage_next_vulns]] §09/09.

## 🗑️ Futura Vacanze Spa — da cancellare (deciso da Francesco il 09/09)

Dentro c'è **una sola entità**, `piano-editoriale-futura-vacanze` (attività),
con 0 pagine, 0 offerte, 0 contatti, 0 eventi, 0 prenotazioni. E il suo
indirizzo `piano-editoriale-futura-vacanze.oltrenova.com`, che ora viene
staccato da Vercel **prima** che l'azienda sparisca.

Due cose da sapere (la terza è già fatta: `futura-club-spiagge-bianche` è stato
staccato da Vercel il 09/09 insieme agli altri 55 orfani):
1. L'indirizzo dell'entità viene staccato **prima**, e se Vercel non risponde la
   cancellazione si blocca invece di perderlo.
2. I **6 account restano attivi** e possono ancora entrare: Futura
   (admin_azienda), FV Hotels, Francesca Del Monte, Giulia Valletta, Fra Del
   Monte, Angela Salgarelli. Si tolgono da `/admin/users`, anche dopo la
   cancellazione. Vedi [[reference_domini_vercel]].
3. Se Vercel non risponde la cancellazione **si blocca** con un messaggio: è
   voluto, si riprova.

## ⚠️ Da chiedere a un cliente

1. **L'offerta «Ponte dell'8 dicembre» del Furgone (Automax).** È su «per tutto
   il periodo»: dal 5 al 9 dicembre costa **€850** invece di €600 di listino, e
   ora vale **solo** per quelle date esatte. **Confermare col cliente che
   intendesse €850 per tutto il ponte** e non €850 al giorno.

2. **Garage 22 e Stripe.** Prima corregge il nome dal pannello Stripe
   (Impostazioni → Dati dell'attività) con la ragione sociale **esatta della
   visura**, poi carica la visura. Rifare l'iscrizione dal nostro pannello senza
   correggere il nome riporta al punto di partenza — è già successo due volte.
   Vedi [[reference_stripe_onboarding_campo]].

3. **Il nome pubblico su Stripe** (`Impostazioni → Dati dell'attività` e
   `Impostazioni → Connect → Branding`, nome **e** logo): chi si iscrive legge
   «FRANCESCO MALAGOLI» mentre sta per consegnare IBAN e documento.

4. **Il primo incasso vero non è mai avvenuto.** Quando Garage 22 sarà attivo:
   una prenotazione da due euro, pagata davvero. Tre verifiche: soldi sul suo
   cruscotto Stripe · email di conferma · prenotazione che risulta pagata.

## Fatto l'08/09 (live e provato)

- **Lista d'attesa eventi** completa (iscrizione, promozione, conferma che parte).
- **La conferma di prenotazione non partiva per nessuno** — era spenta su tutti
  e quattro gli eventi veri. Migration **112**.
- **Booking a giornate**: il calendario nascondeva le prenotazioni e lo stesso
  furgone si vendeva due volte nello stesso giorno →
  [[reference_intervalli_date_booking]]. E «notti» ora segue la risorsa.
- **Offerte sulle risorse**: valevano solo per gli slot orari →
  [[reference_offerte_risorse]]. Migration **113**.
- **Eventi**: contatti nel CRM con tag, bottoni comprensibili, pannello degli
  invii con testo e spunte, descrizione formattabile.
- **15 contatti storici recuperati** nel CRM (`tests/recupera-contatti-eventi.mjs`).
  ⚠️ **Non iscritti alla newsletter**, deciso da Francesco: la formula che
  avevano accettato diceva «per gestire questa prenotazione», e 5 non hanno
  nemmeno quella. Se servirà: invito col double opt-in, che esiste già.

## Poi

**Il ripristino del backup non è mai stato provato**, e viene **dopo** aver
completato l'archivio (vedi la priorità in cima): `verifica-backup.mjs` dimostra
che l'archivio è leggibile e completo *rispetto alle tabelle che elenca*, non
che da lì si torna in piedi. Piano della prova già concordato in
[[project_backup_lacune]]. Vedi anche [[reference_backup_e_ripristino]].

**L'onboarding** ([[project_onboarding_mappa]]) resta il capitolo che vale di
più, tenuto per ultimo da Francesco perché vuole ragionarci di marketing.

Il **voto Google** ([[reference_voto_google]]) aspetta solo
`GOOGLE_PLACES_API_KEY` su Vercel.

## Fermo, e dipende da Francesco

- **Meta**: verifica business bloccata; restiamo Tech Provider, non BSP.
- **Termini e privacy** a un avvocato; le 10 aziende devono accettarli.
- **2FA** su Vercel, Supabase, Cloudflare, GitHub.
- **Ripristino del backup** mai provato (l'archivio però ora è completo).
- Le **13 prenotazioni storiche** degli eventi restano «in attesa»: nessuno le
  ha mai confermate e non le tocchiamo.
- ⚠️ Gli hostname staccati da Vercel **continuano a rispondere 200** finché il
  certificato già emesso resta valido: il routing passa dal wildcard
  `*.oltrenova.com`. Uno mai registrato dà 525. Quanto duri non è misurato.

## In coda, nessuno urgente

Next 16, multilingua DE, import documento v2, QR con logo, PWA installabile,
notifiche realtime, PMS, TripAdvisor (in attesa di Terra).
