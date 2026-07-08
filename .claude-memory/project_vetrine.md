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

**Preset `auto` (autosalone nuovo+usato) + capability generiche** LIVE 8/7:
- Preset `auto` in `vetrinePresets.js`: `condizione` (nuovo/usato) come stato, campi superset (marca/modello/anno/km/alimentazione/cambio/prezzo/garanzia…), `campiPrivati: []` (niente gating — per le auto si mostra tutto).
- **Filtro a livello di blocco** (`data.filtro`): una vetrina "Auto", due pagine (blocco pre-filtrato nuove/usate). Il filtro-compratore in-griglia si nasconde quando il blocco è pre-filtrato. Editor blocco (`VetrinaBlockEditor`) offre gli stati del preset della vetrina scelta.
- **CTA guidata dal preset** (`preset.cta.text/desc/success`): per le auto "Richiedi informazioni" invece del wording flipping. Ogni preset ha il suo.
- **Bottone WhatsApp** per-elemento sul dettaglio (`wa.me/{entity.whatsapp||minisito.social.whatsapp}` con testo precompilato col titolo), accanto al form→CRM. WhatsApp = chat diretta, NON logga nel CRM (il form sì).
- Editor: sezione "🔒 Riservato" nascosta quando `campiPrivati` è vuoto.

Per un nuovo verticale (es. immobili in vendita, nautica): nuovo oggetto preset (~20 righe) + eventuale `cta`, zero migration, zero modifiche a render/editor (già generici).

**Preset `viaggi` (agenzie/tour operator)** LIVE 8/7: tipologia (mare/città/tour/crociera…) come stato, campi destinazione/durata/date/prezzo_da/include/esclude/itinerario, CTA "Richiedi preventivo". Niente gating (lead→CRM).

**Filtri/ricerca server-side + paginazione** LIVE 8/7 (fatti UNA volta, scalabili — vedi discussione "non farlo due volte"):
- Endpoint `/api/guest/vetrina/[id]` accetta: `stato`, `sel_<key>` (eq sui campi select via `dati->>key`), `prezzo_min/max` (range su colonna `valore_primario`), `q` (ilike su titolo), `limit/offset` (+ `total`).
- `VetrinaGrid` genera la **barra filtri dal preset per convenzione**: ogni campo `select` → tendina, `valore_primario` → fascia prezzo, + barra ricerca. Debounce + "Carica altri". Nessun flag da mettere nei preset.
- Verificato live: select-facet (Diesel→2), range prezzo, ricerca titolo, combinato, paginazione (limit=2 di 4), filtro **stato** (raccolta/concluso), 0 leak. `dati->>key` di PostgREST funziona.
- ⚠️ NON saltare il campo `statoPubblico` nel ciclo dei filtri select dell'endpoint (bug fixato 8/7): la griglia lo manda come `sel_<key>` e il valore è anche in `dati.<key>` → filtra via `dati->>key`. Il param `stato` (colonna) resta per il pre-filtro blocco.
- UI barra filtri: contenitore arrotondato, controlli h44 coerenti, ricerca con icona, fascia prezzo raggruppata, link "Azzera".
- ⚠️ Range su numerici JSONB oltre il prezzo (km/durata) non ancora fatti: servono colonne generiche (framework già pronto → è un'aggiunta, non un rifacimento).

**Vetrine COMPLETA + verticali flipping, auto, viaggi + filtri/ricerca.** Migliorie future opzionali:
- Multilingua dei campi elemento (oggi il dettaglio /en localizza solo la chrome, non i dati).
- Auto-delivery dei numeri riservati via email dopo il lead.
- Filtri su JSONB (promuovere altri campi a colonna) — già mitigato con GIN.

Coerente con [[project_positioning_target]] (SMB, semplicità > potenza).
