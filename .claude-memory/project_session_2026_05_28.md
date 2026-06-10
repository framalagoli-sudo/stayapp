---
name: project-session-2026-05-28
description: "Feature e fix completati il 2026-05-28 — Sprint 9 fix critici deploy/invite/email-scanner"
metadata:
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

## Feature e fix completati (sessione 2026-05-28)

### Fix critici

- **vercel.json SPA routing** — `client/vercel.json` con rewrites → index.html. Senza questo file tutti gli URL diretti davano 404 su Vercel.
- **favicon.svg** — `client/public/favicon.svg` con logo OltreNova (testo "ON" bianco su sfondo #0F7B6C). Risolve favicon WordPress in tab browser.
- **CLIENT_URL Railway** — cambiato da `https://oltrenova.com` a `https://www.oltrenova.com` per evitare che Cloudflare 301 strip il fragment `#access_token=...`.
- **ResetPasswordPage** — race condition fix: gestisce INITIAL_SESSION/SIGNED_IN quando flowType non è 'unknown'; rilevamento immediato errore hash (`error=access_denied` → mostra "link non valido" subito senza aspettare 10s); supporto `?flow=` query param da AcceptInvitePage.
- **AcceptInvitePage** (`/admin/accept-invite`) — pagina intermedia che riceve `?token_hash=&type=` nell'URL e verifica via `supabase.auth.verifyOtp()` SOLO quando l'utente clicca il pulsante. Evita che Outlook/antivirus/email scanner pre-fetchino il link Supabase diretto e consumino il token OTP. Server ora manda email con link a questa pagina invece del link Supabase diretto.

**Why:** Il collaboratore riceveva `otp_expired` perché il suo email client (non Gmail) pre-fetchava il link diretto Supabase, consumando il token OTP prima che l'utente cliccasse.

### Piano editoriale — firma autore
- Migration 047: colonne `created_by`, `created_by_name`, `updated_by`, `updated_by_name` su `piano_editoriale`
- Server: POST e PATCH ora salvano i dati autore
- UI: firma visibile in PreviewModal e PostEditorialePage

### Staff — "Reinvia invito"
- Bottone sempre visibile per tutti i collaboratori
- Endpoint `POST /api/users/:id/resend-invite` genera recovery link

## Stato deployment finale sessione
- Git ✅ — tutto pushato su GitHub (main)
- Railway ✅ — server aggiornato con fix email scanner
- Vercel ✅ — client deployato con AcceptInvitePage + tutti i fix

## Piano editoriale — tipo contenuto (sessione serale 2026-05-28)

- 10 tipi: Post, Reel, Story, Carosello, Video, Blog Post, Newsletter, Evento, Ads, Collab.
- Badge colorati su calendario (bordo sinistro chip) e lista
- Campo `design_url` (Canva/Figma/Adobe) con anteprima iframe popup
- Collegamento interno opzionale (articolo/newsletter/evento) per Blog Post, Newsletter, Evento
- `TIPO_COPY`: label testo, placeholder, titolo pagina, label immagine, distribuzione, articolo — tutti dinamici per tipo
- Sezione Canali: badge distribuzione fisso (Blog/Email/Pagina evento) + social opzionali
- Bottone "Nuovo post" → "Nuovo contenuto"; confirm elimina dinamico per tipo
- Migration 049 eseguita ✅: `tipo_contenuto`, `ref_id`, `ref_tipo` su `piano_editoriale`
- Commit: `08ba198`, Vercel + Railway aggiornati ✅

## Migrations ancora da eseguire su Supabase ⚠️
- `045_idee_editoriali.sql`
- `046_piano_editoriale_v2.sql`
- `047_piano_editoriale_autore.sql`

## Procedura deploy Vercel (locale, finché GitHub→Vercel non è collegato)
1. `cd client && npm run build`
2. Cambia `rootDirectory: "client"` → `null` in `client/.vercel/project.json`
3. `npx vercel build --prod && npx vercel deploy --prebuilt --prod`
4. Ripristina `rootDirectory: "client"` in `project.json`
