---
name: reference_siti_cross_browser
description: "CRITICO BUSINESS: i siti pubblici devono essere visibili da OGNI browser. Causa pagine bianche = service worker next-pwa (precache shell stale). Risolto: SSR + niente SW + guardrail test. MAI ri-aggiungere un SW che precachea."
metadata:
  node_type: memory
  type: reference
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

**Il business di Francesco si regge sui SITI (minisiti pubblici) + PWA.** I siti devono essere **siti web normali**, visibili da QUALSIASI browser, sempre. Una pagina bianca = soldi e clienti persi (18/6: un cliente in campagna non vedeva il sito su Chrome → prima lamentela).

## Causa delle pagine bianche (diagnosi definitiva, con prove)
Il sito è **server-rendered**: l'HTML contiene già tutto il contenuto visibile (nome, sezioni, testo, immagini — verificato: 1892 char su un'attività ricca, anche le scarne hanno nome+contatti+footer). Quindi un browser che riceve l'HTML **vede il sito anche senza JS**. È un sito vero, non una web-app JS-only. ✅

MA `next-pwa` registrava un **service worker** (`PWARegister` → `/sw.js`) che faceva `precacheAndRoute` dello shell con hash di chunk specifici + `clientsClaim()`. Dopo i (tanti) deploy gli hash cambiano → il SW serviva una versione stale/rotta INTERCETTANDO l'HTML buono → **pagina bianca**. Colpiva chi aveva il SW (visite precedenti); Edge senza SW vedeva il sito. Era l'**unica cosa capace di nascondere l'HTML server-rendered**.

## Fix (18/6) — perché non può più succedere
1. `next-pwa` **disabilitato** (`disable:true` in next.config) → nessun SW di precache generato.
2. `public/sw.js` = **kill-switch** committato (si auto-distrugge: svuota cache, unregister, ricarica le tab) → ripulisce anche i browser già incastrati.
3. `PWARegister` ora **disiscrive** invece di registrare.
4. HTML servito con `Cache-Control: no-store` + `X-Vercel-Cache: MISS` → mai cachato a CDN/browser, sempre fresco.
**Garanzia a 2 livelli:** (a) contenuto nell'HTML server → visibile su ogni browser anche con JS rotto; (b) niente SW → nessuno può intercettare/nascondere quell'HTML.

## REGOLA (non violare)
- **MAI ri-aggiungere un service worker che precachea lo shell** di un'app che deploya spesso = pagine bianche garantite.
- Se si vuole la PWA installabile, ri-abilitarla SOLO con strategia **NetworkFirst per la navigazione** (mai servire HTML/shell dalla cache), e testare i deploy successivi.
- I minisiti devono restare **server-rendered** (contenuto nell'HTML). Non spostare il contenuto a fetch client-side (renderebbe il sito dipendente dal JS = fragile cross-browser).

## Rete di sicurezza automatica
`tests/smoke/public-render.spec.js` (progetto Playwright `public`) gira ad ogni deploy e BLOCCA il deploy se: (a) un minisito s/r/a non ha il nome+contenuto nell'HTML server (>100 char visibili), o (b) `/sw.js` contiene `precacheAndRoute`. Così una regressione si becca PRIMA del cliente.

## Nota
Alcuni minisiti reali sono molto scarni (es. "Metodo TVB" ~238 char) perché il titolare ha messo poco contenuto: funzionano, è una questione di contenuto (il proprietario deve riempirli), non un bug tecnico.
