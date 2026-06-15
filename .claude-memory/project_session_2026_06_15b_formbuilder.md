---
name: project_session_2026_06_15b_formbuilder
description: "Session 2026-06-15b — Debug completo Form Builder: email Resend non inviate (env Vercel vuote), CRM, bug .catch() Postgrest, UX consensi GDPR"
metadata:
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## Obiettivo sessione
Fix Form Builder: i form richiamati dalle pagine non scrivevano contatti nel CRM e le email di conferma non arrivavano. Risolto end-to-end + migliorata UX consensi GDPR.

## CAUSA RADICE #1 — Env Vercel vuote ✅ FIXATO (dashboard)
Su Vercel progetto **oltrenova-next**, `RESEND_API_KEY=""` e `RESEND_FROM=""` erano **stringhe vuote** → `new Resend("")` → ogni invio email falliva in silenzio (`.catch()` ingoiava l'errore). Il contatto CRM invece si creava (usa Supabase). Francesco le ha reimpostate dal dashboard a:
- `RESEND_API_KEY` = `re_Vbk7Apm7_m38uhF4VDPfG54PE1zBSEoYG` (stessa di server/.env)
- `RESEND_FROM` = `noreply@oltrenova.com`

## CAUSA RADICE #2 — Bug codice `.catch()` su Postgrest ✅ FIXATO
`supabaseAdmin.from('contatti').update(upd).eq('id', x).catch(...)` → **500 "catch is not a function"**.
Il `PostgrestFilterBuilder` è *thenable* ma **NON ha `.catch()`** (solo `.then()`). Crashava il submit per ogni contatto **già esistente** (visitatore di ritorno). Latente perché si testava sempre con email nuove.
**Fix** in `app/api/form-builder/public/[token]/submit/route.js`: usato `await` + `if (error) console.error(...)`. Stesso per l'auto-tag (ora `await`, non più fire-and-forget che in serverless si perdeva).
**Regola**: mai `.catch()` diretto su query builder Supabase — usare `await` + check `error`, oppure `.then(ok, err)`.

## CAUSA RADICE #3 — Config form: manca campo Email ✅ UX FIXATA
Il submit crea contatto CRM e manda autoresponder SOLO se il form ha un campo `tipo:'email'`. Form senza → "inviato" ingannevole, niente di fatto.
**Fix UX** in `FormBuilderEditorPage.jsx`: banner giallo "Manca il campo Email" + bottone "Aggiungi campo Email"; avvisi inline su toggle "Email di conferma" e "Newsletter optin" quando manca email.

## UX Consensi GDPR rifatta
Tolti dal dropdown "Tipo" → pannello dedicato "Consensi GDPR" con 2 toggle: **Consenso privacy (verde, obbligatorio)** + **Consenso marketing (viola, facoltativo)**. Nuovo tipo campo `consenso_marketing` (in submit route → se flaggato setta `iscritto_newsletter=true`). Link policy esterna nascosto di default (la piattaforma ha già le sue pagine privacy). Modificati: FormBuilderEditorPage.jsx, FormPublicPage.jsx, LandingBlockRenderer.jsx, submit/route.js, FormBuilderListPage.jsx (template).

## Verificato funzionante (test live su prod)
Contatto "Giovanni" <oltrenova@gmail.com>: `iscritto_newsletter=true`, `tags=["provafix"]`, email autoresponder arrivata, upsert per email (no duplicati). Prova consenso GDPR salvata in `form_submissions` (consenso_dato, consenso_privacy_url, ip — art.7 GDPR).

## Newsletter — conformità legale OK
`lib/newsletter-html.js` footer: link "Annulla iscrizione" + motivo + mittente. `lib/newsletter-send.js`: URL con `unsubscribe_token` reale, invia solo a `iscritto_newsletter=true`. Autoresponder transazionale NON richiede disiscrizione (solo le newsletter).

## File nuovi creati
- `app/admin/form-builder/[id]/submissions/page.js` (route "Risposte" dava 404)
- `supabase/migrations/059_form_newsletter_tag_filter.sql` (allinea repo: newsletter_optin + tag_filter, già eseguite a mano il 14/6)

## Resend — stato
Dominio `oltrenova.com` **verificato** su Resend (eu-west-1, creato 24gg fa). `onboarding@resend.dev` = sandbox, consegna SOLO al titolare account (fra.malagoli@gmail.com) → inutile per clienti reali. Usare sempre `noreply@oltrenova.com`.

## Note infrastruttura IMPORTANTI (per non riperderci)
- **Due progetti Vercel**: root `.vercel` → `stayapp` (vecchio Vite, MORTO, solo var VITE_). `client-next/.vercel` → `oltrenova-next` (Next.js LIVE). Comandi `vercel env` SOLO da `client-next/`.
- **`vercel env pull` maschera le var Sensitive**: restituisce `""` per TUTTE le var utente (anche SUPABASE_SERVICE_ROLE_KEY che funziona). NON si possono verificare i valori via CLI → solo test funzionale.
- **`npx vercel env add` via stdin NON funziona su Windows**: npx non inoltra stdin al processo figlio (provati pipe PS, redirect cmd, Start-Process, echo pipe — tutti falliti, salvano vuoto). Var sensitive → impostare SOLO da dashboard.
- **Tecnica diagnostica**: service role key in `tests/.env.test` → script node `.mjs` per query dirette al DB prod e submit live a `https://www.oltrenova.com/api/...`. (script cancellati dopo l'uso per non committarli — il deploy fa git push).
- **deploy.ps1**: lanciare SEMPRE dalla root con `powershell.exe -ExecutionPolicy Bypass -File ".\deploy.ps1"` (usa Set-Location relativi). Non lanciare due deploy in parallelo (conflitto su tests/.auth/). Tutti i deploy: 37/37 smoke ✅.

## Per domani — continuare a fixare
Restano nel DB 2 form "Nuovo form" vuoti (campi=[]). Continuare il debug funzionale degli altri moduli admin.
