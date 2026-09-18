---
name: reference-seo-primo-giro
description: "Primo giro SEO (18/09/2026): la pagina evento era VUOTA per Google, il nostro sito senza canonical, pagine CMS senza descrizione, H1 multipli. Sonda: probe-seo.mjs"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-18T13:51:20.486Z
---

`tests/probe-seo.mjs` legge la sitemap di ogni sito e controlla pagina per pagina: titolo, descrizione, canonical, H1, immagine social, indirizzi morti nella sitemap, **duplicati** (stesso titolo o stesso canonical su più pagine). Da 13 segnalazioni a **zero** nello stesso giorno. Siti controllati: garage22terni.it, metodotvb.it, fondaconarni.com, oltrenova.com (inlingua non ha ancora il dominio collegato).

**I quattro difetti veri, tutti nostri:**
1. ⛔ **La pagina di un evento non aveva contenuto nell'HTML**. `EventoPage` è codice di browser e chiedeva i dati **dopo**, mentre il server li aveva già: 15 KB senza titolo né testo → ora 42 KB con l'H1. È la regola «i siti sono SSR» che era saltata in un punto. Ora `lib/evento-pubblico.js` è il punto solo, usato dalla route **e** dalla pagina. ⚠️ L'elenco delle colonne era scritto due volte, e quello della pagina era più corto: passarlo così avrebbe reso l'evento a metà.
2. **Nessuna pagina di `oltrenova.com` dichiarava il canonical** — i siti dei clienti sì. La home non poteva: era `'use client'`, e una pagina di browser non può scrivere i metadati.
3. **Pagine CMS senza descrizione** (tutte quelle di metodotvb): ora il ripiego la ricava dal contenuto vero (`lib/seo-testo.js`). Stessa cosa per le schede di una vetrina.
4. **Più H1 nella stessa pagina**: il carosello ne metteva uno **per diapositiva**. Ora il primo è H1, gli altri H2.

**Secondo giro, stesso giorno — il blog era invisibile** (la misura decisiva: *quante parole ci sono nell'HTML senza JavaScript*):
- articolo **4 parole**, nessun H1; elenco **10 parole**; e gli articoli non erano in **nessuna sitemap**. Il blog è ciò che si scrive apposta per farsi trovare.
- Ora articolo ed elenco li prepara il server. Il contenuto si ripulisce con **`sanitize-html`** (gira in Node) invece di DOMPurify, che gira solo nel browser ed era il motivo per cui non si poteva stampare dal server.
- Misura per tipo di pagina, dopo: home sito 70–374 parole · pagina CMS 445 · scheda vetrina 114 · evento 117 · articolo 336 · nostra home 1392. Privacy e cookie restano quasi vuote **ed è voluto**: sono `noindex`.

⛔ **La cosa che decide se un sito verrà indicizzato non è tecnica**: `entita.indicizzabile` ha `DEFAULT false` (migration 116), quindi **ogni sito nuovo nasce invisibile ai motori** finché qualcuno non accende l'interruttore in «Sito web». È una scelta giusta (il giorno della registrazione il sito contiene il testo di esempio), ma **nessun passo lo ricorda**: va legato all'onboarding → [[project_onboarding_mappa]].

⚠️ **Falsi allarmi da evitare quando si legge la sonda**: `https://host` e `https://host/` sono la stessa pagina (la sonda normalizza, prima si segnalava un duplicato su ogni sito). E il testo **sopra un'immagine** non si giudica coi colori — vale per `probe-contrasto`.

**Quello che questa sonda NON sa**: cosa Google ha davvero indicizzato. Per quello serve Search Console, che al 18/09 non esiste → [[project_search_console]].

Vedi [[reference_un_sito_un_indirizzo]], [[reference_visibilita_motori]], [[reference_siti_cross_browser]].
