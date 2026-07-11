---
name: project_session_2026_07_11
description: "Sessione 11/7 — sistema email rifatto (osservabile+white-label+GDPR+unificato) + AUDIT SICUREZZA pre-mercato (16 fix, sistema a strati, Dependabot)"
metadata:
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Sessione lunga, due grossi blocchi. Tutto LIVE + committato/pushato.

**1. Sistema email rifatto da zero** (vedi [[reference_email_resend]], [[feedback_email_templates]]):
- Diagnosi Resend: FUNZIONA (dominio verificato, chiave send-only). Le notifiche vanno all'email ENTITÀ, non a Francesco; Gmail le mette in Spam le prime volte.
- `lib/send-email.js` centralizzato + OSSERVABILE (log `[email:<ctx>]`); prima ogni errore era invisibile (.catch vuoto).
- Mittente white-label (nome business), footer GDPR (identificazione legale + link privacy, no unsubscribe sulle transazionali).
- **Unificati TUTTI i template** (zero HTML inline): guestEmailTemplate (business→cliente), platformEmailTemplate (OltreNova→utente), emailTemplate (notifiche titolare), buildNewsletterHtml. Regola in memoria: mai HTML inline.

**2. AUDIT SICUREZZA pre-mercato** (vedi [[reference_security_audit]] + `SECURITY.md §0` nel repo = FONDAMENTALE):
- Motivo: Francesco ha detto "non pronto per il mercato = rifinitura + **sicurezza**". Fatto lo scout inline (io) → **workflow di audit** (4 dimensioni + verifica avversariale) → **18 finding, 18 confermati** → **16 fix** live → **+3 test** in security.spec.js (verificati 12/12).
- Buchi trovati (nei moduli nuovi: newsletter-azioni/loyalty/shop/chat/calendar): IDOR newsletter cross-tenant, bypass billing (aziende PATCH), cost-abuse chatbot, CSRF OAuth calendar, rate-limit mancanti (loyalty/register/booking/shop), XSS stored (siteHref/consent), injection filtri, cron fail-open.
- **Sistema a strati** (per monitorare SEMPRE senza sprechi): Strato 0 dipendenze (Dependabot+npm audit), Strato 1 test CI (ogni deploy, gratis), Strato 2 convenzione, Strato 3 review AI sul diff (on-demand), Strato 4 workflow audit (raro). NON c'è un agente che parte ad ogni operazione (scelto: costo).
- **Dependabot** configurato (`.github/dependabot.yml`) + `npm audit` nel deploy.

**Il grande quadro**: "pronto per il mercato" = rifinitura + sicurezza. La **sicurezza è fatta**. Resta l'altra metà = **affidabilità del core journey** (percorrere iscrizione→onboarding→sito→pubblica→prenotazioni e togliere gli spigoli). Vedi [[todo_prossima_sessione]] per il punto esatto di ripartenza + le azioni manuali di Francesco.
