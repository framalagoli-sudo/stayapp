---
name: project-agenti-automatismi
description: "24/10 Francesco: a OltreNova mancano agenti/automatismi che lavorano al posto del titolare (il mercato va lì; il fratello automatizza i social con Claude). Proposte date, niente deciso."
metadata:
  node_type: memory
  type: project
  originSessionId: e568d56c-329d-4803-8f55-d2ef213a3ede
  modified: 2026-10-25T07:52:34.869Z
---

**24/10/2026, Francesco:** «a OltreNova manca qualcosa: agenti AI o automatismi che fanno cose al posto del titolare. Il mercato sta andando lì. Mio fratello da un mese usa Claude e ha automatizzato la pubblicazione social. Visto lo stato della piattaforma, cosa possiamo automatizzare di utile a livello commerciale?» Chiesto un parere, non un lavoro.

**Why:** cambia il racconto commerciale («OltreNova lavora mentre tu lavori»); si regge su dati e azioni già dentro la piattaforma (contatti con consenso, liste, eventi e posti, consigli con segnali, newsletter per lista, recensioni, chatbot, Club).

**Proposte date (ordine mio):** 1) «riempi la serata» — evento poco prenotato → l'agente prepara l'email per la lista giusta, il titolare approva con un tocco; 2) segretaria delle richieste — bozza di risposta a ogni messaggio, dalle Informazioni e dalla conoscenza del chatbot; 3) recensioni chieste da sole dopo evento/soggiorno; poi riattivazione dei clienti fermi, occasioni del Club → sezione pronta per il sito; social solo come «eco» di quello che succede in OltreNova, e dopo l'approvazione Meta. Principio: **l'agente prepara, il titolare approva** (poi pilota automatico per tipo di azione, se lo sceglie lui).

**24/10, secondo giro** (Francesco: «non analizzare solo Garage 22, ricerca il mercato; quanto varrebbe un agente che compila i moduli di contatto per OltreNova?»). Ricerca fatta (Wix Symphony, HubSpot Breeze, GHL AI Employee 50–97 $/mese; Polimi 07/2026: 8% PMI con AI attiva). Proposta: un agente per momento del ciclo cliente, uguale per tutti i mestieri — **risponditore** (risposta immediata dai dati veri), **agenda piena** (buchi → lista giusta), **no-show**, **richiami** (ritmo di ritorno per mestiere nei profili: dentista 6 mesi, abbonamento che scade), **reputazione**. Base comune: operazioni in `lib/` + coda delle proposte («Cosa fare adesso») + registro di cosa ha reso. Agenti dentro gli 80 €, non extra.
- **Agente che compila i moduli altrui in massa: sconsigliato** — art. 130 Codice privacy (consenso preventivo per promo via email; il Garante è severo anche sul B2B; detto a memoria + fonti web, serve parere legale), contraddice ciò che vendiamo (anti-spam ai nostri stessi clienti). Alternativa proposta: **check-up gratuito del sito** sulla landing (lead con consenso) + messaggi uno a uno preparati dall'agente e mandati da Francesco, dopo parere legale.
- Chiesto a Francesco: scrivere in STRATEGIA.md e scegliere il primo pezzo (risponditore o check-up).

**25/10, OmniSocials** (lo usa il fratello come connettore Claude per pubblicare): strato social per agenti, MCP + API REST/SDK, 11 piattaforme compresa Google Business, ~10–12 $/mese per spazio (fonti discordanti, prodotto giovane), white label non risulta. Parere: per Francesco sui social di OltreNova sì, subito; per i clienti è il candidato per l'«eco» (evento → post su IG e Google Business) senza aspettare l'app review Meta, MA prima verificare dalla documentazione: più clienti in un conto, collegamento per il cliente finale senza account loro, art. 28/dati, solidità (interfaccia nostra in `lib/`, fornitore sostituibile). Alternative da confrontare (PostPlanify ha white label a 200 $/mese).

**25/10, chiarito da Francesco: NON usare OmniSocials, COPIARLO.** Parere: il codice è facile (Studio contenuti + piano editoriale con stati/approvazioni + cron ci sono già; manca la pubblicazione vera e il collegamento OAuth dei profili), il muro sono le approvazioni delle piattaforme. Proposta: solo **Instagram+Facebook** (stessa app Meta e stessa App Review di WhatsApp → aggiungere i permessi di pubblicazione alla stessa richiesta) e **Google Business** (accesso API da chiedere a Google); TikTok/X/LinkedIn solo se richiesti. Stima ~3–5 sessioni + attese. Idea più grande: **OltreNova come strato per agenti** (connettore MCP sulle operazioni in `lib/`). Chiesto a Francesco l'ok ad aggiungere i permessi di pubblicazione alla revisione Meta quando la riprendiamo.

**25/10, Francesco: «sì va bene»** → quando si riprende Meta (blocco in [[todo-prossima-sessione]]), nella App Review vanno **anche i permessi di pubblicazione IG/FB**. Il valore: il post nasce dove nasce il fatto (evento, offerta, serata quasi piena). Contro le API che cambiano, regole concordate: (1) solo `lib/social/` parla coi social, regola in `verifica-regole` che blocca il deploy; (2) versione API scritta + allarme 90 giorni prima della fine vita; (3) sonda giornaliera che pubblica/rilegge/cancella su un profilo di prova nostro, con battito e allarme; (4) post fallito mai perso né silenzioso (resta in coda col motivo, avviso, «copia e pubblica tu», retry dei transitori); (5) token scaduto → «Ricollega Instagram»; (6) superficie minima, solo API ufficiali; (7) fornitore di riserva per piattaforma dietro la stessa interfaccia.

**How to apply:** ⚠️ in tensione con «non sui social» del 14/10 ([[project_positioning_target]]): detto a Francesco. Niente è deciso; prima di costruire, una scelta sua e una voce in `STRATEGIA.md`. Lega con [[project_agente_vocale]] (le operazioni in `lib/` sono la base comune).

**In sospeso dallo stesso giorno:** il punto 5 della lista del 23/10 — contenuto di **Halloween (31/10)** nel Club, testo di Francesco, bozza AI dalla regia se la vuole. Rimandato da lui («facciamo altro, tienilo in memoria»).
