---
name: reference_triage_next_vulns
description: Triage 18/08/2026 delle 21 vulnerabilità Dependabot (tutte su next, nessuna applicabile) — poi RISOLTE con l'upgrade a Next 15; chiuso anche sharp: zero alert
metadata:
  type: reference
---

Le 21 vulnerabilità aperte su GitHub sono **tutte sullo stesso pacchetto: `next`** (siamo su **14.2.35**, l'ultima della linea 14). Ogni patch indicata sta nella serie **15.x** → la linea 14 non riceve più fix di sicurezza.

**Nessuna è applicabile a noi**, per motivi verificati:

| Gruppo | Perché non ci tocca |
|---|---|
| 8 advisory su **Server Actions / Server Functions** (DoS RSC CVE-2026-23864/23869/23870, SSRF, payload illimitati, disclosure endpoint) | non usiamo Server Actions: `grep "use server"` non trova nulla, l'endpoint da colpire non esiste |
| 3 su **Image Optimizer** (CVE-2026-44577, CVE-2025-59471, CVE-2026-27980) | riguardano il **self-hosting**; CVE-2026-27980 dice esplicitamente "does not impact platforms that have their own image optimization, **such as Vercel**" |
| CVE-2026-44578 (SSRF via WebSocket upgrade) | l'advisory dice testualmente "**Vercel-hosted deployments are not affected**" |
| CVE-2026-64645 (SSRF in rewrites), CVE-2026-29057 (request smuggling in rewrites) | richiedono `rewrites()`/`redirects()` in `next.config` verso **backend esterni**: il nostro config non ne ha; i 2 `NextResponse.rewrite` del middleware sono interni |
| CVE-2026-44573 (bypass middleware) | riguarda il **Pages Router**, noi siamo App Router |
| CVE-2026-44581 (XSS con **nonce CSP**) | la nostra CSP usa `'unsafe-inline'`, nessun nonce |
| CVE-2026-44580 (XSS `beforeInteractive`) | non usiamo `next/script` con `beforeInteractive` |
| CVE-2026-44576, CVE-2026-44572, CVE-2026-44582 (cache poisoning RSC / redirect) | richiedono che una **cache condivisa memorizzi** le risposte. Misurato dal vivo: le pagine rispondono `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` con `Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch`, `X-Vercel-Cache: MISS` e nessun `CF-Cache-Status` → niente da avvelenare |
| CVE-2026-64647/64648 (cache confusion con body non-UTF8) | le nostre `fetch` server-side usano JSON UTF-8 |

**Conclusione**: nessuna urgenza di sicurezza (conferma il triage dell'11/08 con dati aggiornati), **ma** restare su 14.2.35 significa che il prossimo advisory che *ci riguarda davvero* non avrà una patch applicabile senza fare comunque l'upgrade. L'upgrade a **Next 15** va pianificato come manutenzione necessaria, non rimandato a oltranza: chiude tutti e 21 gli alert e ci rimette su una linea supportata. Ultime disponibili al 18/08: 15.5.23 e 16.3.1.

**Non fare dismissing degli alert**: sono l'unico promemoria visibile che la linea è fuori manutenzione.


---

**Esito (18/08/2026, stesso giorno)**: chiuse tutte con l'upgrade a **Next 15.5.23 + React 19** (vedi [[project_upgrade_next15]]), più l'override di `sharp` a 0.35.3. Da **21 vulnerabilità (8 alte) a zero**.

Il triage resta valido come **metodo**: confrontare ogni advisory con la configurazione reale — usiamo Server Actions? siamo self-hosted? abbiamo rewrites verso backend esterni? le risposte finiscono in cache condivise? — invece di reagire alla sola severità.
