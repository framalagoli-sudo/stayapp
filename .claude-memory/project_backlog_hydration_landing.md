---
name: project_backlog_hydration_landing
description: BACKLOG — la landing pubblica emette ~8 errori di hydration React
metadata: 
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

**Backlog (trovato 9/7 testando il blocco eventi, non ancora indagato).** Aprendo `/a/inlingua-terni` con Playwright, la console mostra **~8 × "Minified React error #425"** = *Text content does not match server-rendered HTML* (mismatch idratazione SSR vs client). React recupera ri-renderizzando lato client → la pagina non crasha, ma è un difetto reale (flash, SEO/performance, rischio bug sottili).

**Non l'ho fixato**: fuori scope dalla sessione eventi, va indagato a parte. Sospetti tipici in `LandingBlockRenderer`/landing: valori che differiscono SSR vs client (date/locale, `window`, random, contenuti async che cambiano il markup iniziale), o testo che dipende da `lang`/dominio risolto solo client-side. Riprodurre con Playwright (`page.on('pageerror')`) su una landing con blocchi e isolare il blocco che causa il mismatch.

Non coperto dal guard nuovo (`public-flows.spec.js` non fallisce sulla landing per gli #425, solo su crash veri/opacity). Se si vuole blindare, aggiungere un check pageerror sulla landing. Vedi [[reference_migrazione_react_router_next]], [[project_session_2026_07_07]] (fix hydration precedente sulla landing).
