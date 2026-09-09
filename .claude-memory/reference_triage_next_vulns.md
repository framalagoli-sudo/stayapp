---
name: reference_triage_next_vulns
description: Metodo di triage degli advisory Next — ma il 09/09 uno CI RIGUARDAVA (RCE AVIF su /_next/image, vivo anche senza usare next/image nel codice)
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-09T07:13:07.800Z
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

---

## ⛔ 09/09/2026 — la volta che invece ci riguardava

Due triage di fila avevano concluso «nessuna ci tocca», e quella conclusione
stava diventando un riflesso. Il 09/09 `npm audit` è passato da zero a **1
critical + 1 high** e stavolta eravamo esposti davvero.

**GHSA-2xp9-vwfh-vxw4** (CVSS 9.5) — RCE non autenticato nell'ottimizzazione
immagini con file **AVIF**. Il ragionamento a tavolino diceva di archiviarlo:
`next/image` **non è importato da nessuna parte** nel nostro codice. Ma
`images.remotePatterns` è configurato in `next.config.js`, e questo **basta a
tenere vivo l'endpoint**:

    GET /_next/image?url=<un AVIF vero su supabase>&w=640&q=75
    → HTTP 200 · image/avif · 55.441 byte

Pubblico, senza login, e processava AVIF davvero.

**GHSA-rgj7-g3m4-5g8c** — la stessa `libheif` dentro `sharp`, che usiamo
**anche direttamente** in `lib/upload-helper.js` per comprimere le foto che
caricano i clienti: secondo fronte, dal pannello.

Corretto con `next 15.5.24` + `sharp 0.35.4` (due patch, non un salto di
versione). La 15.5.24 **disattiva l'ottimizzazione AVIF**: verificato dal vivo
che l'immagine esce identica all'originale — passthrough, `libheif` non
invocata.

**La lezione**: «non lo importiamo» non vuol dire «non è raggiungibile». Un
endpoint che il framework monta da sé si prova con una richiesta vera, non si
deduce dal `grep`. E il metodo del triage vale solo finché ogni advisory viene
confrontato con la realtà **misurata** — non finché si ripete la conclusione
delle volte prima.

⚠️ Emerso strada facendo: `sharp` sta in `overrides` e **non** in
`dependencies`, pur essendo importato da `upload-helper`. Funziona solo perché
ce lo tira dentro Next: il giorno che smettesse di dipenderne, la compressione
delle immagini si romperebbe senza che nessuno abbia toccato niente.
