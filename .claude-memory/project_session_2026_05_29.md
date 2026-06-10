---
name: project-session-2026-05-29
description: Piano editoriale — campagne, commenti, content score, team, permessi PE, fix FormCampagna
metadata:
  node_type: memory
  type: project
  originSessionId: current
---

## Feature completate (sessione 2026-05-29)

### Piano editoriale — Sprint feature

**Tab Team (PianoEditorialePage)**
- Prima voce del menu: mostra tutti i membri del team con permessi granulari PE
- 4 permessi configurabili per ogni staff: `pe_crea`, `pe_pianifica`, `pe_pubblica`, `pe_approva`
- Toggle chip UI (dark = attivo, grigio = disattivo) con PATCH `/api/users/:id`
- Il bottone "Nuovo contenuto" rispetta `pe_crea`

**Campagne (pe_campagne)**
- Nuova tabella `pe_campagne` — migration 052 eseguita ✅
- FK `campagna_id` su `piano_editoriale` (ON DELETE SET NULL)
- `CampaignView` in `PianoEditorialePage.jsx`: CRUD completo, 10 colori preset, date inizio/fine
- Filtro per campagna nella list view
- Badge campagna colorato su ogni PostRow e su calendario (dot colorato prima del chip ⏳)
- Dropdown selettore campagna in `PostEditorialePage`

**Commenti collaborativi (pe_commenti)**
- Nuova tabella `pe_commenti` — migration 053 eseguita ✅
- Sezione commenti in fondo a `PostEditorialePage`
- Avatar con iniziali, timestamp, Ctrl+Invio per inviare
- Elimina proprio commento o tutti (admin)
- API: GET/POST `/:id/commenti`, DELETE `/:id/commenti/:cid`

**Content score**
- Panel collassabile con punteggio 0–100 (verde ≥70, giallo ≥40, rosso <40)
- Check: titolo, testo, data, canali, immagine se richiesta
- Check per-canale: char limit, hashtag count ottimale, CTA presente
- Limiti piattaforma: IG 2200, X 280, LI 3000, TikTok 2200, FB 63206, GB 1500
- Hashtag ottimali: IG [3,30], FB [1,5], LI [3,5], TikTok [3,10], X [1,2]

**Approvazione**
- Bottone "Approva e pubblica" visibile per chi ha `pe_approva = true` (o admin)
- Icona `BadgeCheck`
- Row in lista con sfondo arancio chiaro `#fff7ed` + bordo `#fed7aa` se richiede approvazione

**HashtagView**
- Tab dedicata agli hashtag suggeriti per canale

### Fix
- **FormCampagna → renderForm**: il form campagna era definito come React component dentro `CampaignView` → unmount/remount ad ogni keystroke → i campi non si scrivevano. Convertito in plain function `renderForm(submitLabel, onCancel)` (vedi CLAUDE.md nota 22). Commit: `c7f4f82`. Deploy Vercel ✅.

## Migrations eseguite (2026-05-29)
- `052_pe_campagne.sql` ✅
- `053_pe_commenti.sql` ✅

## Migrations ancora da eseguire su Supabase ⚠️
- `045_idee_editoriali.sql`
- `046_piano_editoriale_v2.sql`
- `047_piano_editoriale_autore.sql`

## Stato deployment
- Git ✅ — commit `c7f4f82` su main
- Vercel ✅ — live su www.oltrenova.com
- Railway — nessuna modifica server in questa sessione (server già aggiornato)

## Note strategiche — pubblicazione social
- Integrazione diretta Meta API richiede App Review: 4–8 settimane + Business Verification
- Buffer e n8n non risolvono il problema multi-tenant (ogni cliente ha account propri)
- **Decisione**: lasciare pubblicazione manuale assistita per ora, avviare App Review Meta in parallelo
- Piano editoriale attuale copre il 90% del valore (copy ottimizzato, hashtag, orari suggeriti)

**Why:** La sessione ha completato la parte "collaborative + campaign management" del piano editoriale.
**How to apply:** Le migrations 045/046/047 sono ancora pendenti — ricordarlo se si lavora su idee editoriali o sui campi author/labels/pillar.
