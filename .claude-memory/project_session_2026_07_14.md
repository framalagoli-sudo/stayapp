---
name: project_session_2026_07_14
description: "Sessione 14/7 — chiusi i '6 punti' sicurezza (voto 7→~8): RLS lockdown (escalation CRITICA), monitoring in-casa, pentest AI, auth hardening. Manca: core journey."
metadata:
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Sessione lunga, tutta sicurezza: chiusi i **6 punti** emersi dalla valutazione onesta (Francesco: "voto da 1 a 10?" → 7 → "facciamoli tutti"). Tutto LIVE + committato + verificato. Punto di ripresa e dettaglio in [[todo_prossima_sessione]] (blocco 14/7). Sicurezza continua in [[reference_security_audit]].

**#1 Auth hardening** ([[project_session_2026_07_13]] l'aveva iniziato): upload blindati (allowlist immagini + ext/content-type forzati server), forgot-password enumeration chiusa. Login = Supabase Auth (leaked-password protection + min length attivati da Francesco).

**#4 RLS Fase 1 — il find più grave.** Audit delle policy esistenti (query su `pg_policies`/grant). Scoperto: RLS attiva ovunque ma quasi tutte 0-policy = **deny-all sicuro** per il browser (l'app gira su `service_role` che bypassa RLS; il browser legge solo `profiles`+`aziende` propri). MA le policy di quelle 2 erano **`ALL`/`UPDATE`** + grant UPDATE su `authenticated` → **un utente loggato poteva auto-promuoversi super_admin dal browser** (escalation CRITICA, live). Fix = policy ridotte a SELECT (migration **069**, +`properties`/`ristoranti`). 5 test regressione. **Fase 2** (togliere service_role dalle letture → RLS vero 2° muro per le API) = ri-architettura, **deprioritizzata** (valore/costo modesto, l'authz app è già solido).

**#3 Monitoring — fatto IN CASA.** Valutato Axiom → **scartato** (Francesco: "Vercel non ha nulla dentro?" — istinto YAGNI giusto). Vercel Pro ha già Observability+Logs per *vedere*; il buco era l'*alerting*. `lib/observability.js`: `logError(source, err, {alert})` → console (Vercel Logs) + Resend 1 mail/ora per source (dedup via check_rate_limit). `app/error.js` error boundary (prima assente) → `/api/client-error`. Agganciato a booking/shop/contact. Zero vendor nuovi.

**#5 Pentest AI-driven.** (a) Probe anon: 0 leak/0 write su 20 tabelle sensibili → DB blindato (+2 test). (b) Agente riutilizzabile `.claude/agents/security-reviewer.md`. (c) Audit white-box perimetro pubblico → 3 finding modesti, 2 fixati (wifi_password fuori dal minisito indicizzato; pageview validato+rate-limited), resto pulito. Esterno a pagamento solo per enterprise/compliance.

**#2 WAF**: Vercel/Cloudflare base ok (DDoS+Bot Fight gratis); managed WAF = Cloudflare Pro ~$20/mese, da valutare prima del lancio, non ora. **#6 Turnstile**: SOFT è scelta giusta, non un gap.

**Bilancio: 7→~8.** La sicurezza è fatta e sorvegliata (Dependabot+CI+auto-merge, SAST CodeQL 0 alert, test regressione, monitoring, agente). **Resta l'ALTRA METÀ del "pronto mercato": affidabilità del CORE JOURNEY** (iscrizione→onboarding→sito→pubblica→prenotazioni), con l'onboarding "Inizia qui" come pezzo più incompleto. **Da lì si riparte.**

**Lezione (Francesco l'ha chiesto: "perché tutti questi buchi se il codice lo scrivi tu?")**: le policy RLS erano **legacy** dell'era client-diretto, diventate residui pericolosi dopo la migrazione a server/service_role e mai riviste; gli audit precedenti guardavano lo strato applicativo, non la RLS (invisibile dal codice). La sicurezza viene dagli **strati di controllo** che beccano ciò che l'autore si perde, non dall'infallibilità di chi scrive.
