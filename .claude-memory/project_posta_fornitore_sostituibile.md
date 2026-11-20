---
name: project_posta_fornitore_sostituibile
description: "Deciso 20/11/2026 — posta in uscita con interfaccia unica lib/posta/, newsletter su Amazon SES, servizio su Resend gratis; piano in POSTA.md"
metadata:
  node_type: memory
  type: project
  originSessionId: 6db5af17-bebc-4477-910d-584528ca5346
  modified: 2026-11-20T10:27:37.081Z
---

Il 19/11/2026 due newsletter di Garage 22 (53+55) hanno superato il tetto di Resend gratis:
100 email/giorno **per tutta la piattaforma** — quando è pieno si ferma anche la posta di
servizio di tutti i clienti. Francesco non vuole pagare Resend Pro (20 $/mese) per ora.

Decisione (20/11, «penso sia la soluzione migliore»): interfaccia unica `lib/posta/` con Resend e
Amazon SES sotto, fornitore scelto per flusso da un'impostazione Vercel. Newsletter → SES a
consumo; servizio → Resend gratis. Quando il servizio sforerà (decine di clienti), si cambia
l'impostazione o si paga Pro. In più: tetto newsletter per azienda (schema del credito AI,
predefinito proposto 1.000/mese), freno sui rimbalzi, allarme sul totale.

**Why:** evitare di ricominciare da capo a ogni crescita (obiezione di Francesco: «se i moduli
superano 100 al giorno siamo daccapo») e separare la reputazione delle newsletter da quella
delle email critiche.

**How to apply:** parte quando Francesco crea l'account AWS. Fino ad allora: Garage 22 max una
newsletter al giorno; non accendere aperture/clic su Resend; ignorare l'avviso Resend Forge
(toccherebbe i record `send`). Webhook Resend iscritto a delivered/opened/clicked dal 20/11,
battito `consegna-posta` acceso. Dettaglio in `POSTA.md` e `DA_FARE.md` (A6, C1).
Mia svista ammessa: Resend scelto il 28/04 senza valutare il tetto unico.
Collegati: [[reference_email_resend]], [[project_ai_consumi]], [[project_registrar_domini]].
