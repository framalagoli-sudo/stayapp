---
name: project-session-2026-10-11
description: "Sessione 11/10/2026 — pannello Domini corretto, banner cookie, nome/icona Stripe, e l'editor visuale delle pagine fatto in autonomia (Francesco non l'ha ancora visto)"
metadata:
  node_type: memory
  type: project
  originSessionId: 83de693b-bb51-4ae3-be58-46648e944853
  modified: 2026-10-11T17:05:57.040Z
---

**11/10/2026.** Mattina con Francesco, pomeriggio in autonomia («lascio il pc acceso»). Migration ferme alla 135.

- **Pannello Domini**: «Online» solo se a rispondere siamo noi (`rispondeDaNoi`, CLAUDE.md nota 62).
- **Banner dei cookie**: i pulsanti fissi dei siti stanno sopra il banner (nota 63).
- **Stripe**: nell'iscrizione dei clienti ora c'è «OltreNova» col simbolo → [[reference-stripe-onboarding-campo]] §4. Automax è collegato **a metà**.
- **Editor visuale delle pagine** (nota 64): chiesto da Francesco come «drag e drop tipo Elementor». Fatto per **sezioni intere**; le colonne libere annidate non sono state fatte e sono una decisione sua. LIVE, provato in produzione con `tests/probe-editor-visuale.mjs` e aprendo (senza salvare) le home vere di 7 clienti. **Francesco non l'ha ancora visto.**
- Due difetti del testo formattato trovati provando: aprire un blocco lo segnava «non salvato» (il database riordina le chiavi del JSON, il confronto era fra stringhe); scrivendo in fretta si perdeva una lettera (tornava indietro la versione di un istante prima).

**Cosa ho imparato (mio):** la prima ipotesi sul «non salvato» era sbagliata e l'avevo già scritta nel codice; l'ha smentita rimisurare e poi leggere il dato vero nel database. E la sonda, verde in locale, in produzione dava due rossi perché controllava senza aspettare l'esito — vedi [[reference-trappole-script-e-sonde]].

**12/10 — Francesco l'ha provato e l'ha bocciato** («sembra la versione cinese di Elementor»): trascinava un blocco, scriveva a sinistra e sulla pagina non compariva niente. Causa: i blocchi non disegnano nulla finché non hanno un elemento, e la mia sonda controllava dove cadeva il blocco, non che si vedesse. Corretto lo stesso giorno: blocchi che nascono già scritti + testi scrivibili direttamente sulla pagina (`lib/editor-visuale.js`, CLAUDE.md nota 64). Avevo scritto «quello che scrivi si vede subito»: era vero solo per i blocchi che avevo provato io (testo, copertina).

Da dove si riprende → [[todo-prossima-sessione]].
