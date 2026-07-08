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

**Fase 2 LIVE dal 2026-07-08** (vetrina pubblica):
- Blocco `vetrina` nel site-builder (`blockTypes` + `VetrinaBlockEditor` in PaginaEditorPage: sceglie quale vetrina, colonne, filtri). Griglia **client-fetch** (come eventi/news) via endpoint pubblico `GET /api/guest/vetrina/[id]` che ritorna `{preset, elementi}` con **solo colonne pubbliche** (gating). Componenti `VetrinaGrid` + `VetrinaDettaglio` in `LandingBlockRenderer` (case `vetrina` e `vetrina_dettaglio`).
- Dettaglio **SSR** a `/{s|r|a}/[slug]/v/[itemSlug]` (3 route): loader `getElementoVetrina` (solo colonne pubbliche), reso via **pagina sintetica + GuestSubPage** (nav/footer/lingua gratis). Voce in sitemap per elemento. Link interni lang/dominio-aware via `base`.
- Verificato live: endpoint e HTML dettaglio NON espongono `dati_privati` (0 leak), SSR ok.

**Fase 3 LIVE dal 2026-07-08** (lead → CRM):
- Il CTA "Voglio partecipare" del dettaglio apre `VetrinaLeadForm` (in `LandingBlockRenderer`): nome/email/messaggio + privacy + Turnstile → `POST /api/guest/contact` con `source:'vetrina'`. Riusa l'endpoint contatti esistente → **upsert nel CRM `contatti`** (NON un silo nuovo, era il requisito di Francesco), tag `['lead', entity_tipo, 'vetrina']`, progetto nella nota via prefisso `[Interesse progetto: nome]`, notifica email al titolare, automazione `nuovo_contatto`. Unica modifica endpoint: la `source` finisce nei tag del contatto.
- Numeri riservati: NON consegnati in automatico — il titolare ricontatta dal CRM (auto-delivery via email = opzione futura, richiede caricare dati_privati server-side).
- Verificato live: POST → 200, lead in `contatti` con tag `vetrina` e progetto in nota.

**Vetrine COMPLETA (Fasi 1+2+3 live).** Migliorie future opzionali:
- Multilingua dei campi elemento (oggi il dettaglio /en localizza solo la chrome, non i dati).
- Auto-delivery dei numeri riservati via email dopo il lead.
- Filtri su JSONB (promuovere altri campi a colonna) — già mitigato con GIN.

Coerente con [[project_positioning_target]] (SMB, semplicità > potenza).
