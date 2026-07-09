---
name: reference_migrazione_react_router_next
description: "Residui react-router→Next che crashano/rompono — useSearchParams destructuring, router.push(-1), blocchi async e reveal animazione"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Bug trovati 9/7 (feature EVENTI), tutti residui della migrazione da react-router a Next `next/navigation`. Cercare questi pattern se qualcosa "non funziona" in pagine migrate:

**1. `const [x] = useSearchParams()` → CRASH.** In react-router `useSearchParams()` ritorna `[params, setParams]` (array); in `next/navigation` ritorna l'oggetto direttamente. Il destructuring ad array prende la prima coppia `[key,value]` (o `undefined` se nessun param) → `x.get()` lancia `TypeError`. **Fix**: `const x = useSearchParams()`. Trovato in 8 file (unsubscribe, recensione, preventivo pubblico, conferma iscrizione, cancella prenotazione, blog list, articolo, PostEditoriale admin) — tutti sistemati. Verificato a freddo con node.

**2. `router.push(-1)` → non torna indietro.** In `next/navigation` `push` vuole un URL stringa; `push(-1)` naviga verso il path `/-1`. **Fix**: `router.back()`. Pattern robusto usato: `goBack()` = se c'è `?back=` → `router.push(backUrl)`; else se `window.history.length>1` → `router.back()`; else fallback (home entità ricavata dal path `^/(?:s|r|a)/[^/]+`, o `/`). Applicato a EventoPage, ArticoloPage, PacchettoPage, OffertaPage.

**3. Blocchi async invisibili ("tutto bianco").** In `LandingBlockRenderer`, i blocchi `eventi`/`news` caricano i dati con `guestFetch` in useEffect e ritornano `null` finché vuoti. L'animazione reveal (`.lbr-anim .lbr-reveal { opacity:0 }` in globals.css, poi `.in` via IntersectionObserver) è settata in un useEffect con dep `[blocks]`: i blocchi async compaiono DOPO → mai osservati → restano opacity 0. **Fix**: dep `[blocks, eventi.length, articoli.length]` così ri-scansiona all'arrivo dei dati. (Con `prefers-reduced-motion` erano visibili → bug intermittente per impostazione utente.)

Nota link: eventi/news linkano a route globali `/eventi/[id]` e `/blog/[slug]` (non entity-scoped) passando `?back=<homeUrl lingua/dominio-aware>`. Vedi [[reference_link_interni_renderer]], [[reference_eventi_aziendali]].

**Guard aggiunto (9/7)**: nuovo `tests/smoke/public-flows.spec.js` (project `public-flows` in playwright.config) — apre con browser VERO i flussi pubblici (unsubscribe/recensione/conferma/cancella/blog/dettaglio evento) e fallisce su qualunque `pageerror` o boundary "Application error" → avrebbe beccato tutti gli 8 crash. Più un guard anti-"tutto bianco": carica la landing con blocco eventi, scrolla, e verifica `opacity>0.5` della section `lbr-reveal`. Gira nello smoke di ogni deploy (~22s, 0 token). Motivo per cui i bug erano rimasti nascosti: lo smoke copriva solo le 36 pagine ADMIN, non i flussi pubblici JS-driven.
