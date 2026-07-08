---
name: project_vetrine
description: "Funzione \"Vetrine\" — motore generico collezioni+elementi; Fase 1 (dati+admin) LIVE, Fase 2/3 da fare"
metadata: 
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

**Vetrine** = motore generico "collezioni + elementi" per presentare liste adattabili a più verticali (immobiliare, autosaloni, portfolio…). Non è un modulo immobiliare hardcoded: i verticali sono **preset** dello stesso motore. Nato da un cliente reale di **flipping immobiliare** (compra/ristruttura/cerca soci).

**Decisioni chiave:**
- Motore generico sotto, UX verticale sopra (il cliente vede "Progetti immobiliari", non un database builder).
- **Solo vetrina + lead**, soldi FUORI piattaforma (evita normativa finanziaria: no investimento/pagamento on-platform).
- Numeri sensibili (prezzo acquisto, budget, margine, business plan) = **esca dietro lead**: stanno in `dati_privati`, mai nella select pubblica.

**Architettura (Fase 1 LIVE dal 2026-07-08):**
- Migration `065_vetrine.sql`: tabelle `vetrine` + `vetrina_elementi` (entity-scoped come `pagine`). Colonne calde `valore_primario` (numeric) + `stato_pubblico` (text) per sort/filtro; `dati` jsonb (pubblici, +GIN), `dati_privati` jsonb (gated), `immagini` jsonb; ON DELETE CASCADE; RLS on.
- Preset nel codice: `client-next/lib/vetrinePresets.js` (`VETRINA_PRESETS`, `getPreset`, `fieldOptions`). Primo preset `progetti_immobiliari`. Aggiungere un verticale = nuovo oggetto, zero migration.
- API: `/api/vetrine` + `/api/vetrina-elementi` (+ `[id]`), `requireEntityAccess`. Whitelist ALLOWED nei PATCH.
- Admin: tab **Vetrine** (icona Store) in tutti e 3 gli `*_SUBS` di `AdminLayout`; `VetrineListPage` (lista+crea) + `VetrinaEditorPage` (editor elementi guidato dal preset, sezione 🔒 riservata, galleria upload). Editor vetrina a `/admin/vetrine/[id]`.
- Verificato live: insert/select/gating/cascade sul DB prod; API 401 senza token; UI create+save OK.

**Da fare:**
- **Fase 2** — vetrina pubblica: blocco `vetrina` nel site-builder (griglia+filtri) + pagina dettaglio SSR (usa il `siteHref` di [[reference_link_interni_renderer]], sitemap per elemento).
- **Fase 3** — lead gated: CTA "Voglio partecipare" → `requests` con prefisso `[Interesse progetto: nome]` (pattern nota 9); i `dati_privati` recapitati solo dopo il lead (email).
- Spike futuri se cresce: filtri su JSONB (promuovere altri campi a colonna) già mitigato con GIN.

Coerente con [[project_positioning_target]] (SMB, semplicità > potenza).
