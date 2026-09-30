---
name: project-session-2026-09-29-30
description: "Sessione 29–30/09: app del QR scura + «Aspetto dell'app», «Inizia qui» LIVE, Tech Provider approvato e WhatsApp solo super_admin, posti riservati chiusi al pubblico; prossimo: configurazione Meta a schermo"
metadata:
  type: project
---

- **Posta (27/09)**: decisioni prese, esecuzione alla prossima sessione → [[project-posta-elettronica]].
- **Garage 22** ha chiesto l'app del QR col fondo nero, il sito no → `theme.appSfondo`, poi esteso da Francesco («un cliente non può personalizzare l'app a piacere?… procedi mi fido») a **«Aspetto dell'app»** → [[reference-sfondo-app-qr]], nota 53 `CLAUDE.md`.
- **30/09, approvato**: nelle app verde WhatsApp `#128C7E` e grigio `#6b6b76`. Il sito NO (non approvato: `#25D366` in WhatsAppButton/LandingBlockRenderer/ArticoloPage, `#777` in EventoPage).
- Leggibilità misurata con `probe-app-leggibile`: fondaco 34→15, borgo 51→18, garage 2→0. Restano: icone spente della barra (opacità 0,4 = convenzione) e colori del marchio del cliente usati come testo (rosso #e63946 = 4,17).
- Deploy: due «Not authorized» transitori; una corsa di smoke fallita nel setup perché lanciavo sonde in produzione in contemporanea (da soli 74/74; sonde di sicurezza lanciate a mano, verdi).
- ⚠️ I `npm run dev` fermati con TaskStop lasciano vivi i node su :3001–:3003: fermarli per PID.
- 30/09: **«Inizia qui»** LIVE (nota 54): decisioni di Francesco — 1) lo vedono anche i clienti di oggi, 2) nessuna eccezione per Borgo del Lago («lo gestisco io»), 3) alla registrazione aperta il cliente sceglie fra le nostre categorie.
- 30/09: STRATEGIA §4.5-bis «ci sarò sempre io e uno staff umano» → landing nuova ([[project-landing-persona-umana]]).
- 30/09: **Tech Provider approvato** (Francesco). WhatsApp: collegamento SOLO super_admin per ora (non a Garage 22: «è l'unico che accede al pannello e non vorrei che si inalberi»), poi solo admin_azienda, mai staff. Ambiente di test = Giochi senza Panciere. Su Vercel c'è solo WHATSAPP_TOKEN_KEY; mancano 4 chiavi.
- 30/09: 🔒 **posti riservati** uscivano dalle route pubbliche degli eventi (dal 21/09): ora solo `posti_online`. La sonda colonne pubbliche provava UN evento a caso → ora tutti, con colonne vietate. Invariante 4 di SECURITY.md esteso ai dati operativi.
- ⚠️ Trovato DOPO aver scritto IniziaQui: esiste `components/admin/OnboardingPage.jsx` (wizard di giugno mai collegato). Non è un doppione ma è la base della v2: la domanda «esiste già?» andava fatta prima.
- Posta: in attesa per scelta di Francesco.
- Nessuna migration: ferme alla **129**.
