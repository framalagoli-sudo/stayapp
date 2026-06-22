---
name: project_session_2026_06_22
description: "Session 22/6 — block system completo (Fasi 0-5 + coppie font + sito autonomo), Supabase Pro, deploy function"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2a1be9ea-f8b0-46bd-9c9b-087bb6fdbfb5
---

Sessione lunga 2026-06-22. Tutto LIVE su prod, ogni step con 45/45 smoke verdi, zero migration in tutta la sessione.

## Infra / tooling
- **Export contatti CSV** in `/admin/contatti` (BOM + `;`, client-side). Vedi [[project_session_2026_06_21]].
- **`deploy.ps1` ancorato a `$PSScriptRoot`** + funzione `deploy` nel `$PROFILE` PowerShell (lanciabile da ovunque). Recovery doc in CLAUDE.md passo 5.
- **Supabase Pro acquistato** (spend cap ON, PITR saltato). Vedi [[project_acquisti_pendenti]].
- Output rosso PowerShell = stderr nativo benigno; il `CommandNotFoundException` su `.\deploy.ps1` era invece reale (cwd in subfolder).

## Block system — ROADMAP COMPLETA (Fasi 0-5). Dettaglio in [[project_block_system_roadmap]]
- **Fase 0** stile per-blocco (sfondo+spaziatura, `block.style`, `applyBlockStyle`).
- **Fase 1** rich text (Tiptap JSON + walker `lib/richText.jsx` → zero XSS, no dangerouslySetInnerHTML) su about/foto_testo.
- **Fase 1.5** tipografia (allineamento/dimensione/colore per-blocco).
- **Coppie font** curate (`lib/fonts.js` + `FontPairPicker`) nelle 3 pagine Tema.
- **Fase 2** Blocco Immagine + Galleria immagini custom + Media library "Sfoglia" (`/api/media`, `MediaPicker`).
- **Fase 3** Blocco Pulsante + Sezioni predefinite (pattern, `lib/blockPatterns.js`).
- **Fase 4** Sito autonomo: stile sito indipendente opzionale (toggle "Usa stesso stile dell'app", `resolveSiteTheme`, override in `minisito.theme`). Regola: app→theme, sito→minisito.theme se use_app_style===false.
- **Fase 5** Blocchi auto-entità configurabili (titolo/sottotitolo/limite/colonne) + **colonne mobile-safe** (`gridTemplate` = auto-fill minmax(min(100%,Npx),1fr)).

## Principio prodotto consolidato
Filtro di ogni scelta: SMB self-serve ≤€100/mese, semplicità > potenza da designer. Preset > valori liberi; "parti da bello". Vedi [[project_positioning_target]].

## File chiave creati
`lib/richText.jsx`, `lib/fonts.js`, `lib/blockPatterns.js`, `lib/siteTheme.js`, `components/admin/FontPairPicker.jsx`, `components/admin/MediaPicker.jsx`, `app/api/media/route.js`.
