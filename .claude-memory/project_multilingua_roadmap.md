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

## Fasi
- **Fase 1 — Impianto i18n + UI** (IN CORSO): sistema locale (dizionario stringhe UI IT/EN + helper `t`), `<html lang>`, persistenza scelta; routing `/en/...` via middleware (IT a root, EN prefissato, + domini custom); autodetect browser + bandierina switch; hreflang + SEO localizzabile; estrazione stringhe IT hardcoded → dizionario (la parte meccanica grossa, iterativa). Risultato: pagine /en/ esistono, UI in inglese (contenuto ancora IT).
- **Fase 2 — Auto-traduzione contenuto (cachata):** migration tabella `entity_translations` (grant/RLS, scope azienda no IDOR) — azione manuale Supabase; servizio walk JSONB → traduce campi testo via Claude Haiku → salva copia EN con hash sorgente (ritraduce solo se cambia originale); lazy + cache. Render guest EN legge tradotto. Qui arriva il vero valore SEO.
- **Fase 3 — Ibrido: correzione manuale:** sezione "Traduzioni" in admin per correggere stringhe EN; campi corretti "bloccati" così la ri-traduzione non li sovrascrive.

## Note
- Valore SEO reale arriva con Fase 2 (Google deve indicizzare contenuto davvero EN, non IT con UI EN).
- Multilingua collegato al ripensamento "worldwide / qualsiasi business" del prodotto.
