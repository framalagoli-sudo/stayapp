---
name: project_session_2026_10_15
description: "Sessione 15/10/2026 — resoconto per email (spento, lo accende Francesco; cadenza per azienda scelta da lui), stato vero del conto Stripe, sonde senza sottodomini, onboarding «Che attività hai?», backup del Club. Migration 139–140"
metadata:
  node_type: memory
  type: project
  originSessionId: 6f9bd65f-b088-450b-a68e-2f83f514299f
  modified: 2026-10-15T08:02:07.883Z
---

Sessione del 15/10/2026, dopo il reset del PC (chiusura del 13–14/10 fatta a
posteriori: [[project_session_2026_10_13_14]]). Migration **139–140** eseguite da Francesco.

**Fatto e live** (dettaglio in `CLAUDE.md` nota 76, nota 54, nota 48, roadmap):
- Resoconto per email ai titolari (nota 76). Francesco: «la mail se la vuoi
  impostare ma poi devo attivarla io» → nasce spento (Impostazioni). Cadenza:
  «solo ogni settimana o ogni mese, lascia la possibilità di settarlo a me dal
  cruscotto» → `aziende.resoconti`, scelta dal super_admin sotto «Cosa succede»;
  predefinito ogni mese (scelto da me, detto a lui). Il titolare non sceglie.
- «Per adesso il club non ha senso»: Club fermo, e con lui «com'è andata».
- Stato vero del conto Stripe: puoIncassare chiede a Stripe. Verificato su
  Garage22 in produzione prima/dopo (riepilogo identico).
- Il giro domini non registra indirizzi delle aziende «ZZ…» (due strade:
  righe in attesa lasciate dalla creazione locale, e riparazione).
- Onboarding v2 + lib/crea-entita.js (tre route unificate).
- Trovato da me: le tabelle del Club non erano nel backup notturno.

**Errori miei della sessione** (da non ripetere): due `cat > file` senza
heredoc che aspettavano stdin; id di un evento copiato male (mescolato con un
altro uuid) → «Evento non trovato» che sembrava un guasto; una sonda che legge
`TEST_LOCALE` lanciata con `TEST_URL` ha girato in produzione e sembrava una
prova del codice locale — controllare SEMPRE nel log del server locale che le
richieste siano arrivate lì. Vedi [[reference_trappole_script_e_sonde]].

**Pomeriggio** (dopo il «togli la chat… procediamo con l'interprete vocale»):
- Chat con la reception tolta tutta (nota 78), autorizzata. StayApp Development
  cancellata (sua, di prova; via anche l'account f.malagoli@futuravacanze.it).
- «Dimmi cosa cambiare» (nota 77): lib/interprete.js + route ai-comando +
  DimmiCosaCambiare.jsx; microfono solo su /admin. Mio errore ripetuto: uno
  script di aggancio scritto con heredoc ha perso un `\` → errore di sintassi
  visto solo dal server locale. Le modifiche con barre rovesciate: Edit, non shell.
