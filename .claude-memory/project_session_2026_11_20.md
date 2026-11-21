---
name: project_session_2026_11_20
description: "Sessione 20/11/2026 — ricostruita la sessione persa del 19/11, webhook Resend iscritto alle consegne (provato), tetto 100 email/giorno, piano POSTA.md"
metadata:
  node_type: memory
  type: project
  originSessionId: 6db5af17-bebc-4477-910d-584528ca5346
  modified: 2026-11-21T07:59:43.886Z
---

Nessun codice cambiato: solo fornitori, decisioni e documenti.

- La finestra della sessione del 19/11 si era chiusa: il lavoro del mattino era tutto in git; il
  pomeriggio (statistiche newsletter di Garage 22 a zero) era solo conversazione, ricostruita
  dalla trascrizione `.jsonl` in `~/.claude/projects/...` — utile quando Francesco «non ricorda».
- **Webhook Resend**: Francesco ha aggiunto `email.delivered`/`opened`/`clicked` (prima solo
  bounced/complained — per questo le statistiche erano a zero). Provato: «Fai girare la sentinella
  adesso» da Diagnostica → battito `consegna-posta` creato per la prima volta (08:21 UTC).
  L'email `[Prova]` dice ancora «nessuna conferma»: è calcolata prima che la consegna torni.
- **Resend Forge** (avviso nel loro pannello): nuovo motore, secondo fonti di terzi niente
  aperture/clic e sostituisce MX/SPF su `send` → ignorato.
- **Tetto 100 email/giorno superato il 19/11** (Garage 22, 53+55). Francesco non vuole Resend Pro
  ora → deciso il piano [[project_posta_fornitore_sostituibile]] (`POSTA.md`).
- Francesco ha chiesto se contano le email dei moduli: sì, ogni avviso al titolare (e la
  risposta automatica) è un'email spedita da noi. Le email in entrata (info@) passano da
  Cloudflare, non da Resend.
- Ammesso: Resend è entrato il 28/04 senza valutare il tetto unico.
