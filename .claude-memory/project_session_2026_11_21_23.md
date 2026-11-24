---
name: project_session_2026_11_21_23
description: "Sessione 21–23/11/2026 — intestazione a pillola; eventi con opzioni (posti, prezzo, quota propri, prenotazioni miste) per Garage 22, migration 148; «cosa comprende» solo nell'opzione e frase «come si paga» dalla quota vera. Ripresa il 24/11 dopo riavvio del PC."
metadata:
  node_type: memory
  type: project
  originSessionId: d09b33e7-1ae1-47da-8d70-17e8498ffdf1
  modified: 2026-11-24T13:37:19.727Z
---

**21/11** — intestazione a pillola sistemata (commit e40f355a).

**23/11** — eventi con opzioni (CLAUDE.md nota 94, migration 148 eseguita da Francesco), commit ab2a5c27 + bcaea00c, entrambi in produzione:
- ogni opzione ha posti, posti per il telefono, prezzo e quota proprie; il totale dell'evento si calcola; prenotazioni con quantità miste; lista d'attesa per opzione;
- con le opzioni «cosa comprende» sta solo dentro l'opzione (prima finiva sotto tutte, ricevuta Stripe compresa);
- sotto ogni prezzo la pagina scrive come si paga (`fraseQuota`), dalla quota vera (0 se il locale non incassa online).

Verificato dal vivo il 24/11 sulla serata vera di Garage 22 del 26/11 (De Cicco & Simoniello): «20% alla prenotazione, il resto sul posto» sotto la cena, «Si paga sul posto» sotto il drink; nessun campo riservato nell'HTML. Garage 22 ha già tolto dalle descrizioni le frasi sul pagamento scritte a mano.

Il deploy del 23/11 è stato fermato dal sistema per memoria dopo Vercel, push e smoke 74/74: le sonde da probe-enumerazione in poi sono state rilanciate a mano il 24/11: 14/14 verdi. Tolte con `cancellaAziendaDiProva` due coppie ZZ-ENUM lasciate da sonde interrotte (23/11 18:58 e 24/11). ⚠️ probe-enumerazione dura più di 7 minuti: mai lanciarla con `timeout` corto.

Il PC si è riavviato la notte del 23→24/11 dopo una compattazione del contesto: non si era perso niente (lavoro committato e pubblicato). La trascrizione della sessione precedente sta in `~/.claude/projects/C--Users-francesco-progetti-hospitality/*.jsonl` ed è il modo per ricostruire dove eravamo.

Domande aperte a Francesco (dal riassunto del 23/11):
- cancellare le aziende ZZ-ENUM-A/B del 18/11 o tenerle per provare la lentezza dell'esportazione GDPR;
- chiudere la voce DA_FARE «spiegare le opzioni a Garage 22» (le usano già);
- pagina «metodo» con «7 fasi» contro «3 fasi 9 passaggi» delle slide;
- testo alternativo alle slide del carosello.
Non provato: un pagamento vero con quote diverse per opzione — seguire la prima prenotazione vera di Garage 22.

**24/11 — backup fermato dal tempo massimo** (commit b48e3106, deploy: smoke 74/74, sonde verdi tranne il robots noto). Il cron aveva 60 s e Vercel l'ha fermato mentre caricava → niente archivio il 24/11, e l'allarme è arrivato solo dal battito mancante, 30 ore dopo. In più, dal 19/11 le foto nuove non venivano copiate (il tetto di 45 s era contato dall'inizio del giro). Ora le route hanno 300 s, le foto si fermano a un minuto dalla fine, e se le foto vengono rimandate senza copiarne nessuna parte un allarme (CLAUDE.md nota 34). Backup lanciato a mano da POST /api/admin/backup con super_admin `@playwright.internal`: 53 s, 34 foto copiate, archivio del 24/11 scritto; battito scritto a mano (il backup a mano non lo scrive → DA_FARE A4).
