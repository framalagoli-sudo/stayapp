---
name: reference_anteprima_bozze_token
description: "?preview=1 mostrava le bozze a chiunque; ora token HMAC nell'URL perché iframe e window.open non portano il Bearer — controllo centralizzato in getPagina/getElementoVetrina"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-23T16:32:52.503Z
---

Chiuso il 23/08/2026. `?preview=1` saltava il filtro `status='pubblicata'` su route **pubbliche**: chiunque leggeva pagine, home ed elementi vetrina in bozza (listini, campagne, annunci non ancora usciti), con URL indovinabile. Verificato dal vivo su 3 bozze reali in produzione prima e dopo il fix.

**La trappola da ricordare**: l'anteprima si apre con `window.open` e dentro un `<iframe>` — sono **navigazioni del browser, non fetch**, quindi non possono portare un header `Authorization`. Il fix ovvio ("richiedi il token di sessione") avrebbe spento l'anteprima a tutti i clienti. Il permesso deve viaggiare **nell'URL, firmato**: `lib/preview-token.js`, HMAC su `tipo:entityId:scadenza`, 2h, rilasciato da `GET /api/pagine/preview-token` dietro `requireEntityAccess`. Stesso schema dello `state` di Google Calendar già presente nel codice.

**Il controllo sta in un punto solo**: `getPagina` e `getElementoVetrina` in `lib/guest-data.js`. Da lì passano insieme le 6 pagine SSR (`/{s,r,a}/[slug]`, `/p/[pageSlug]`, `/v/[itemSlug]`) e la route API guest — cambiare la firma lì ha chiuso tutti i punti in un colpo. Un nuovo contenuto con stato bozza va fatto passare di lì, non con un flag booleano `preview`.

Segreto: `CRON_SECRET` (ripiego `SUPABASE_SERVICE_ROLE_KEY`), già in produzione — nessuna env var nuova da configurare.

Vedi [[reference_security_audit]], [[feedback_sicurezza_priorita]], [[project_session_2026_08_23_check_A]].
