---
name: project_multilingua_roadmap
description: "Roadmap multilingua (IT+EN) — decisioni fissate + motore Claude Haiku, fasi 1-3"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2a1be9ea-f8b0-46bd-9c9b-087bb6fdbfb5
---

Roadmap multilingua del sito guest. Decisa con Francesco il 24/6. Filtro guida: [[project_positioning_target]] (SMB self-serve, semplicità).

## Decisioni FISSATE
- **Lingue:** IT (base) + EN. Niente altre per ora.
- **Contenuto:** auto-traduzione + **override manuale** (ibrido) — il cliente scrive IT, ottiene EN automatico, può correggere.
- **URL separati:** IT resta a root (non rompiamo QR/link stampati), **EN sotto `/en/...`**, con **hreflang** e SEO tradotta. SEO multilingua = SÌ (URL per-lingua indicizzabili).
- **UX:** autodetect browser + **bandierina** per lo switch (scelta salvata).
- **Motore traduzione: Claude (token).** DeepL SCARTATO. Analisi costi 24/6: con la cache il volume è minimo; per-unità Haiku ~$1,5/M caratteri vs DeepL ~€25/M; Claude già integrato (zero nuovo account), e accetta istruzioni di contesto (non tradurre brand, tono). **Default Haiku 4.5** (`claude-haiku-4-5`, $1/$5 Mtok); Sonnet 4.6 ($3/$15) per testi premium se serve qualità. NB: usare Anthropic SDK già presente; modello attuale progetto = Opus per AI feature, ma per traduzione Haiku.

## Stato attuale codice (verificato 24/6)
NESSUN framework i18n (no next-intl/i18next). Contenuto in JSONB per-entità, una lingua. Stringhe UI guest = italiano hardcoded nei componenti.

## STATO AL 24/6 (riprendere da qui)
**Fase 1 impianto ✅ LIVE** (commit f1cacd4): `lib/i18n.js` (LANGS, `t()`, detect, `pathForLang`, dizionario), middleware `/en/` (strip → `_lang=en` searchParam, domini propri+custom), `components/guest/LanguageSwitcher.jsx` (overlay bandierina + `<html lang>` + autodetect client SEO-safe), 3 pagine entità (`app/{s,r,a}/[slug]/page.js`) leggono `_lang` → hreflang/canonical/OG locale + montano lo switcher.
**Stringhe UI migrate finora:**
- ✅ Home renderer `LandingBlockRenderer` (commit 3de7d3e): titoli/sottotitoli sezioni auto-entità + conteggi + micro-testi (Prenota/Leggi/Gratuito/Vedi tutti) + form newsletter. NB: in questo file `t` importato come **`tr`** (collisione con var locale `t` nel map testimonianze).
- ✅ Footer `LandingFooter` (d5aae16): Contatti/Link utili/Seguici/Privacy/Cookie/copyright + link privacy-cookie prefissati `/en`.
- ✅ Sotto-pagine CMS `/p` — `GuestSubPage` + 3 route `app/{s,r,a}/[slug]/p/[pageSlug]/page.js`: `lang` threadato, link interni prefissati `/en`, hreflang/OG, switcher. (Quasi zero stringhe hardcoded: contenuto = renderer.)
- ✅ Privacy/Cookie `PolicyPage` (`components/public/PolicyPage.jsx`) — versione **EN completa parallela** (IT intatta), selezionata da `lang`; 6 route privacy/cookie leggono `_lang` + montano switcher. Decisione 24/6: tradurre tutto EN (riferimenti normativi GDPR/Garante restano italiani).
- `lang` collegato: page → Landing(struttura/ristorante/attivita) → LandingBlockRenderer + LandingFooter; route `/p` → GuestSubPage; route policy → PolicyPage.

### 🔴 BUG /en risolto 24/6 (BOM) — leggere [[feedback_bom_api_base]]
Lo switcher EN dava **404 su tutti gli /en** dal primo deploy impianto: `NEXT_PUBLIC_STAYAPP_DOMAIN` aveva un BOM (`﻿oltrenova.com`) → `isOwnDomain(www.oltrenova.com)` false → `/en` cadeva nel ramo domini-custom → 404. Invisibile per le pagine IT (fallback `next()` le serve), visibile solo su /en. **Non preso dagli smoke** (non testano /en) né dal build (compila e basta). Fix: `.trim()` su middleware + DominiPage + route domini. **Verificato dal vivo** (curl): /en, /en/blog, /en/r/<slug>, /en/.../privacy = 200 + stringhe EN reali ("Follow us" vs "Seguici"). Lezione → regola "verifica live prima di dire fatto" nel CLAUDE.md globale.

### Follow-up minori aperti
- `<html lang>` servito è `"it"` anche sulle pagine /en (root layout statico); lo switcher lo corregge client-side ma i crawler senza JS vedono `it`. SEO nicety, non bloccante. Per fixarlo davvero servirebbe root layout lang-aware.
- Smoke test su `/en` da aggiungere (così il 404 non può più passare silenzioso).

**PROSSIMI LOTTI stringhe UI (stesso pattern, build+deploy+smoke a ogni lotto):**
1. **`PaginaPage`** (sotto-pagine `/p/[pageSlug]`): è 'use client', legge `useParams`/`useSearchParams` → leggere `_lang` da searchParams; ha un proprio `renderBlock` con gli STESSI titoli sezione + `NewsletterForm`/`ContattiForm` definiti localmente da tradurre. Inoltre le route `app/{s,r,a}/[slug]/p/[pageSlug]/page.js` vanno wired come le pagine entità (hreflang + pass lang).
2. **`PolicyPage`** (intestazioni privacy/cookie) + route `/privacy` `/cookie`.
3. **Form contatti**: NB in `LandingBlockRenderer` il case `contatti` ritorna `null` (il form contatti home arriva via form_builder = contenuto utente, non traducibile da noi); i contatti home sono nel footer. Quindi "form contatti" riguarda soprattutto `PaginaPage`.
4. **PWA guest** (GuestApp/RestaurantApp/AttivitaPWA) — bassa priorità (dietro QR).
5. Marketing homepage `app/page.js` — non wired per /en (valutare se serve).
**Dizionario:** aggiungere chiavi in `lib/i18n.js` (blocchi `it` e `en`).

## Fase 2 LIVE (24/6) — traduzione contenuto via Haiku
`lib/translate.js`: walker JSONB (denylist config/id/url/colori/icone/`section_order`/`tipo`/`opzioni`/`valore`/`operatore`/`condizione`), cache `entity_translations` (hash sorgente → ritraduce solo se IT cambia), **una** chiamata Haiku per entità, fallback IT su errore, override Fase 3 prioritari. `localizeEntity(obj, tipo, lang)` agganciato a home + sotto-pagine 3 entità (`maxDuration=30`). TRANSLATABLE_FIELDS per tipo (struttura/ristorante/attivita/pagina/form). **Verificato live**: /en/r/fondaco-narni traduce contenuto reale (IT "piatti tipici umbri" → EN "Discover our menu / Book a table").
**Form builder tradotti**: `/api/form-builder/public/[token]?lang=en` traduce SOLO testo display-only (descrizione, campi[].label, campi[].placeholder); **MAI opzioni/valori** (sono valori inviati + logica condizionale → si romperebbero le submission). `FormBuilderBlock` riceve `lang`, fetch `?lang`, stringhe UI via `t()`.
**Note/aperti Fase 2:**
- `components/guest/PaginaPage.jsx` = CODICE MORTO (non importato da nessuna route; le sotto-pagine usano `GuestSubPage`). Ha un `ContattiForm` IT non tradotto ma non è renderizzato. Valutare rimozione.
- `ContattiForm` in `LandingBlockRenderer` (riga ~795) = morto (`case 'contatti'` ritorna null).
- Bug 404 segnalato su `www.fondaconarni.com/r/fondaco-narni/privacy`: NON riproducibile (200 ovunque a freddo) → probabile 404 cachato/swap deploy. Da riconfermare con hard refresh.
- PWA guest (GuestApp/RestaurantApp/AttivitaPWA) ancora non localizzate (dietro QR, bassa priorità).

## Fasi
- **Fase 1 — Impianto i18n + UI** (IN CORSO): sistema locale (dizionario stringhe UI IT/EN + helper `t`), `<html lang>`, persistenza scelta; routing `/en/...` via middleware (IT a root, EN prefissato, + domini custom); autodetect browser + bandierina switch; hreflang + SEO localizzabile; estrazione stringhe IT hardcoded → dizionario (la parte meccanica grossa, iterativa). Risultato: pagine /en/ esistono, UI in inglese (contenuto ancora IT).
- **Fase 2 — Auto-traduzione contenuto (cachata):** migration tabella `entity_translations` (grant/RLS, scope azienda no IDOR) — azione manuale Supabase; servizio walk JSONB → traduce campi testo via Claude Haiku → salva copia EN con hash sorgente (ritraduce solo se cambia originale); lazy + cache. Render guest EN legge tradotto. Qui arriva il vero valore SEO.
- **Fase 3 — Ibrido: correzione manuale:** sezione "Traduzioni" in admin per correggere stringhe EN; campi corretti "bloccati" così la ri-traduzione non li sovrascrive.

## Note
- Valore SEO reale arriva con Fase 2 (Google deve indicizzare contenuto davvero EN, non IT con UI EN).
- Multilingua collegato al ripensamento "worldwide / qualsiasi business" del prodotto.
