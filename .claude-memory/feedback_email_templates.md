---
name: feedback_email_templates
description: Regola — ogni email passa da sendEmail + un template centralizzato; MAI HTML inline nelle route
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Ogni invio email DEVE passare da `lib/send-email.js` → `sendEmail(payload, ctx)` (o `_ctx` inline) e usare **un template centralizzato**. **MAI** scrivere `html: \`<div…>\`` inline dentro una route: è così che è nato il caos (3 sistemi + HTML sparso in ~15 file, footer/compliance da aggiornare ovunque).

I 4 template (in `lib/email-template.js` salvo newsletter) — scegli per **audience**:
- **`guestEmailTemplate`** → business→cliente (white-label, footer legale/privacy). Conferme, ordini, prenotazioni, iscrizione newsletter. Slot `intro`/`rows`/`bodyHtml`, `legale`/`privacyUrl`.
- **`platformEmailTemplate`** → OltreNova→utente con pulsante CTA. Signup, reset password, inviti.
- **`emailTemplate`** → notifiche OltreNova→titolare. `rows` + `bodyHtml`.
- **`buildNewsletterHtml`** → newsletter marketing (ha l'unsubscribe).

**Perché:** un solo punto per grafica, mittente (`fromName` = nome business), footer legale/privacy e osservabilità (`sendEmail` logga esito). Cambi di compliance/brand = 1 file, non 15.

**Come applicare quando aggiungi/tocchi una mail:**
1. `sendEmail({ _ctx: 'nome-flusso', fromName: <nomeBusiness se cliente>, to, subject, html: <template>(...) })`.
2. Mai `from` a mano se non serve (default gestito). Mai `.emails.send` diretto (solo `newsletter-send` usa `batch.send`, e logga l'errore).
3. Email al **cliente** → footer legale: passa `legale` (`getAziendaLegale(aziendaId)`) + `privacyUrl` (`/{s|r|a}/slug/privacy`). **Transazionali NO unsubscribe**, newsletter SÌ.
4. Contenuto ricco (tabelle/pulsanti) → slot `bodyHtml`, non un template nuovo.

Dettaglio architettura e diagnosi Resend in [[reference_email_resend]] · [[reference_eventi_notifiche_email]].
