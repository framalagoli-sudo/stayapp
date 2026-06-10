---
name: feedback-guestfetch
description: "Pagine/componenti guest usano sempre guestFetch, mai apiFetch — regola critica per QR code e primo caricamento"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

Nelle pagine e componenti accessibili da ospiti (guest), usare sempre `guestFetch`, mai `apiFetch`.

**Why:** `apiFetch` chiama `supabase.auth.getSession()` prima di ogni richiesta. Se nel browser è salvata una sessione admin scaduta, Supabase fa una chiamata di rete per rinnovarla — bloccando il caricamento iniziale della pagina. Questo causava il bug del QR code che non caricava al primo scan (necessitava refresh). Clienti reali si sono lamentati.

**How to apply:**
- `guestFetch` → qualsiasi endpoint `/api/guest/*`, `/api/blog/public*`, `/api/contatti/subscribe`, `/api/guest/contact`, `/api/guest/book`, `/api/guest/eventi/*/book`
- `apiFetch` → solo endpoint admin autenticati (tutto sotto `/admin/`, `/api/properties`, `/api/staff`, ecc.)
- Il confine è semplice: se la pagina è visibile senza login, usa `guestFetch`

Vedi anche [[feedback-icone-flat]] per altre regole di coerenza UI.
