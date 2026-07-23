---
name: project_session_2026_07_23
description: "Sessione 23/7 — pulizia dipendenze: RIMOSSO Sentry (era inerte) + override → vuln Dependabot 19→1 (resta solo Next). Chiarito: sicurezza applicativa ≠ vuln npm"
metadata: 
  node_type: memory
  type: project
  originSessionId: 165ce5f9-511b-40fa-b628-fa6fa4ab6a6d
---

Francesco: "le 19 vulnerabilità, ma non avevamo sistemato tutto?" → chiarita la distinzione:
la **sicurezza applicativa** (authz/RLS/IDOR/gating) È chiusa; le **19 di Dependabot** sono
vulnerabilità nelle **dipendenze npm**, altra cosa. Vedi [[project_session_2026_07_14]].

**Diagnosi (dati veri via gh CLI, non a memoria):** 19 alert, tutti in `client-next/`.
- **14/19 = Next.js** → fix solo in Next 15/16 (major). Lasciati: NON si fa il major ora.
- **5/19 = transitivi** da due genitori: `@sentry/nextjs` (uuid, @opentelemetry/core, rollup) e `next-pwa`→workbox (rollup, serialize-javascript); `postcss` da Next.

**Errore mio corretto in corsa:** avevo rimesso "Sentry" come motivazione dell'upgrade Next 15.
Ma il **14/7 avevamo deciso di NON usare Sentry** (monitoring in casa `lib/observability.js`).
Sentry era **installato ma inerte** (mai inizializzato su Next 14 — il famoso "blocco").

**Fatto (LIVE, smoke 66/66, build verde, home+guest 200):**
- **RIMOSSO `@sentry/nextjs`** + 4 file (`instrumentation.js`, `sentry.{client,server,edge}.config.js`) + ripulito `next.config.js` (via `withSentryConfig` + `experimental.instrumentationHook`). Codice morto.
- **`overrides`** in package.json: `postcss ^8.5.10`, `rollup ^3.30.0`, `serialize-javascript ^7.0.3`.
- **`npm audit fix`** (non-breaking) per `brace-expansion` + `fast-uri`.
- Risultato: `npm audit` 32→**1** (solo Next). Dependabot 19→**14 attesi** (asincrono, i 5 chiudono al re-scan).
- **Bonus**: rimuovere Sentry ha tagliato JS condiviso **148→88 kB** e middleware **86→27 kB**.

**Nota next-pwa**: è `disable: true` (kill-switch SW statico in public/sw.js). rollup/serialize-javascript venivano dal suo workbox build-time (plugin disabilitato) → rischio reale ~0, chiusi comunque via override.

**Se un giorno Next 15/16**: ri-aggiungere Sentry = `npm install @sentry/nextjs` + wizard. Nessun lock-in.
Aggiornare [[project_google_calendar_pending]] (Sentry non più "superato" ma RIMOSSO).
