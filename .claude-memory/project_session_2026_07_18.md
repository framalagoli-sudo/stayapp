---
name: project_session_2026_07_18
description: "Sessione 18/7 — feature design app/sito: scelta logo PWA, colore icone (globale+per-blocco positivo/negativo), allineamento footer, home 'crea a mano', verifica AI builder"
metadata:
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Giornata di feature design, tutte LIVE + verificate dal vivo + smoke 66/66. Dettaglio completo in [[project_header_footer_design]].

1. **Scelta logo nella PWA app** (Automatico/Chiaro/Scuro): l'header app è sempre scuro ma mostrava sempre logo_url → ora default "auto" usa il logo negativo (logo_dark_url) se caricato. `lib/appLogo.js`. Selettore nelle pagine logo.
2. **Colore icone GLOBALE** (tema): CSS var `--icon-color` con fallback a primary — le ~58 icone `color={primary}` → `` var(--icon-color, ${primary}) ``; var impostata sul root app/sito da `theme.iconColor`. Editor: preset + picker + hex nelle 3 pagine Tema. **Pattern chiave: CSS var + fallback = zero prop threading.**
3. **Colore icone PER-BLOCCO** (la richiesta vera: "positivo/negativo di blocco in blocco"): `block.style.iconColor` → `applyBlockStyle` setta `--icon-color` sul blocco. Select nel BlockStylePanel di PaginaEditorPage.
4. **Allineamento footer** left/center (17/7 tardi): `footer_cfg.align`.
5. **Home "Crea a mano"**: bottone in SitoPage che crea `__home__` vuota (POST /api/pagine slug=__home__) → editor blocchi, senza AI. Prima solo via AI/documento.
6. **Verifica AI Site Builder (#1)**: NON super-only. admin_azienda lo vede UNA volta (menu entità, dopo "Sito web"). Super lo vede due volte (anche menu piatto Marketing). Nessun fix.

Tutti i deploy: build locale + CI verde + Vercel --force + verifica live (spesso set DB temp su entità test struttura-test/s-prova + revert) + smoke. Ultimo HEAD live = 1c9c56f.

**Ripresa**: la serie di feature design/tema è completa. Il grande capitolo aperto resta l'**onboarding "Inizia qui"** (core journey) — vedi [[todo_prossima_sessione]].
