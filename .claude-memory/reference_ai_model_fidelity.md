---
name: reference_ai_model_fidelity
description: "Per task AI ad alta fedeltà (trascrivere/non perdere contenuti) Haiku riassume → usare Sonnet + prompt \"trascrittore\""
metadata: 
  node_type: memory
  type: reference
  originSessionId: 844014e8-2f2a-4883-b100-4833c30dc32f
---

**Lezione (4/7, confermata da Francesco "molto molto migliorato").** Quando un task AI deve **preservare integralmente** dei contenuti (es. convertire un documento cliente in blocchi sito — `/api/ai/from-document`), **Claude Haiku riassume/salta** anche se il prompt dice "non riassumere". Fix che ha funzionato:

1. **Modello più capace**: passare a **Claude Sonnet** (`claude-sonnet-4-6`). `callClaude(prompt, maxTokens, model)` accetta il modello come 3° param (default Haiku, invariato per gli altri usi economici come traduzioni/generate-site).
2. **Prompt da "trascrittore", non copywriter**: inquadrare l'AI come *"riporta INTEGRALMENTE, NON riassumere, usa quanti blocchi servono, MAI scartare un contenuto"*. Il framing "web designer/copywriter" invita alla sintesi.
3. **Budget output adeguato**: `max_tokens` alto (16000) — se il budget è stretto il modello comprime per rientrarci. Alzare anche `maxDuration` (Sonnet è più lento; callClaude aborta a 90s).
4. **Niente cap nascosti**: attenzione a `slice()` su blocchi/input che tagliano in silenzio.

Regola generale: **fedeltà = Sonnet; volume/costo/velocità = Haiku.** Vedi [[todo_prossima_sessione]] (sezione import documento).
