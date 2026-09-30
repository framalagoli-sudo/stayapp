---
name: project-session-2026-09-29-30
description: "Sessione 29–30/09: app del QR scura per Garage 22, «Aspetto dell'app» per tutti, verde/grigio leggibili nelle app, «Inizia qui» LIVE; prossimo Meta"
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
- Nessuna migration: ferme alla **129**.
