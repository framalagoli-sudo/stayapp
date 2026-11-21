---
name: reference_email_resend
description: "Email/Resend — funziona (dominio verificato, chiave send-only); invio centralizzato+osservabile in lib/send-email.js"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

**Resend FUNZIONA** (diagnosticato 10/7, prove a freddo). Su Vercel prod: `RESEND_API_KEY` (valida, **send-only** = `restricted_api_key`), `RESEND_FROM=noreply@oltrenova.com`, dominio `oltrenova.com` **verificato** (Resend rifiuta invii da domini non verificati → accettati = verificato). Invio test → message-id + `error:null`.

**Perché sembrava "non partono":**
1. La notifica prenotazione/richiesta va all'**email dell'entità** (o azienda se aziendale), NON alla casella di Francesco → lui non la vedeva. (Es. eventi Inlingua → `info@inlinguaterni.it`.)
2. Gmail filtra i primi invii da `noreply@` su dominio "giovane" in **Spam/Promozioni** (verificato: la DIAG era lì → cercare `oltrenova` in Gmail cerca anche lì).
3. **Causa tecnica del "dramma"**: ogni invio era fire-and-forget con `.catch()` vuoto + la SDK Resend ritorna `{data,error}` e NON lancia → ogni errore invisibile.

**Fix (commit 9824278, 10/7): `lib/send-email.js` → `sendEmail(payload, ctx)`** unico punto d'invio, logga sempre nei log runtime Vercel: `[email:<ctx>] ok → to=.. id=..` / `FALLITA → err=..` / `THREW`. Non lancia (fire-and-forget o await invariato); `from` default; `_ctx` inline o 2° arg. Migrati 17 punti (eventi/contatti/richieste/booking/form-builder/newsletter-test/survey/recensioni/shop/demo/blog/signup/reset/inviti). `newsletter-send` usa `resend.batch.send` (+ log errore), `automazioni-scheduler` usa fetch diretto (già logga). Verificato live: la riga `[email:evento-guest] FALLITA → to=delivered@resend.dev` è comparsa nei log = osservabilità ON.

**Mittente white-label (opzione 1, commit cb8848e, 10/7)**: le email cliente/titolare mostrano il **nome del business** come mittente (`Fondaco Narni <noreply@oltrenova.com>`) invece del nudo noreply. `sendEmail` accetta `fromName` → costruisce `Nome <addr>` estraendo l'indirizzo e sanitizzando il nome (anti header-injection). L'indirizzo resta `oltrenova.com` (verificato) → **zero setup DNS**. Applicato: eventi (titolare+ospite, +replyTo entità), contatti, richieste, prenotazione risorse guest, survey, newsletter (invio/test/iscrizione), shop. NON coperti (mittente default, no regressione): booking risorse conferma, form-builder autoresponder, recensione (nome non a portata). Email piattaforma (signup/reset/inviti/demo) restano brand OltreNova (corretto).

**Footer conforme GDPR/e-commerce (10/7)**: le email al CLIENTE identificano il mittente (ragione sociale, P.IVA, sede via `getAziendaLegale`) + link informativa privacy (`/{s|r|a}/slug/privacy`). `lib/email-template.js` → `legalFooterHtml()`; `guestEmailTemplate` accetta `legale`/`privacyUrl` (degrada se dati mancanti). Fatto su: **conferma evento ospite**, **newsletter** (nlFooter, mantiene l'unsubscribe), **conferma prenotazione risorse**, **ordine shop**. Regola: **transazionali NO unsubscribe** (non è marketing), **newsletter SÌ**. Il footer mostra solo i dati compilati in Admin → Azienda (es. Inlingua ha ragione sociale+indirizzo ma **P.IVA vuota** → non appare finché non la inseriscono).

**Unificazione rendering COMPLETA (10/7)**: **zero HTML inline** nelle route — ogni email passa da un template unico per audience. Slot `bodyHtml` in `guestEmailTemplate` ed `emailTemplate` per contenuto ricco (tabelle, pulsanti). I 4 template:
- **`guestEmailTemplate`** (`lib/email-template.js`): business→cliente, white-label + footer legale/privacy. Usato da: conferma evento, conferma prenotazione risorse, ordine shop, iscrizione newsletter.
- **`platformEmailTemplate`** (nuovo): OltreNova→utente con pulsante CTA. Usato da: signup, forgot-password, invite, resend-invite.
- **`emailTemplate`**: notifiche OltreNova→titolare (rows + bodyHtml). Usato da: contatto/richiesta/guest-book/eventi-owner, help/segnala, recensione, form-builder (flood + notifica), demo.
- **`buildNewsletterHtml`** + `buildAutoresponderHtml`: builder dedicati (newsletter marketing, autoresponder form).

Shop: link privacy risolto usando la prima entità attiva dell'azienda. Note oneste **chiuse**.

**Opzione 2 (BACKLOG, non fatta)**: inviare DAVVERO da `@dominiocustom` (es. `@fondaconarni.com`) → verificare quel dominio su **Resend** (record DNS SPF/DKIM, separati da quelli del sito) per ogni business + registro domini di invio + logica per-entità. Deliverability/autenticità massime ma lavoro per-cliente. Il dominio del SITO ≠ dominio di INVIO email.

**Come debuggare le email d'ora in poi**: `cd client-next && npx vercel logs <dep-url> --json | grep email:` (oppure dashboard Vercel → Logs). NON serve più costruire route diagnostiche. La chiave è send-only → lo **stato di consegna** (delivered/bounced) si legge SOLO dal **dashboard Resend → Emails/Logs**, non via API. Vedi [[reference_eventi_notifiche_email]].

**20/11/2026**: piano gratuito = **100 email/giorno per tutta la piattaforma** (superato il 19/11 da due newsletter di Garage 22: si ferma anche la posta di servizio). Webhook iscritto a bounced/complained/delivered/opened/clicked dal 20/11 (provato col battito `consegna-posta`). Tracciamento aperture/clic sul dominio NON acceso di proposito; avviso «Resend Forge» ignorato (sostituisce i record `send`). Piano: [[project_posta_fornitore_sostituibile]] / `POSTA.md`.
