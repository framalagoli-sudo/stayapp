---
name: project_session_2026_06_13b
description: "Sprint C form builder — conditional fields + multi-step form, migration 057, deploy"
metadata:
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Implementato Sprint C completo sul sistema Form Builder.

## Sprint C — Campi condizionali + Form multi-step

### Cosa fa
- **Campi condizionali**: ogni campo (non consenso) può avere `condizione: { campo_id, operatore: 'eq'|'neq'|'contains', valore }` nel JSONB. Il campo appare solo se la condizione è soddisfatta. I campi nascosti vengono esclusi dal payload prima dell'invio.
- **Form multi-step**: `form.multi_step: boolean` + `campo.step: int` (0-based). Il form mostra un passo alla volta con progress bar e bottoni Avanti/Indietro. Validazione dei required per ogni passo prima di avanzare.

### File modificati
- `supabase/migrations/057_form_multistep.sql` — `multi_step boolean DEFAULT false` su form_builder (⚠️ da eseguire su Supabase)
- `server/src/routes/form_builder.js` — `multi_step` nell'allowed PATCH + SELECT pubblico
- `client-next/components/admin/FormBuilderEditorPage.jsx` — toggle multi-step, step indicator +/- per campo, sezione "Mostra solo se..." (campo_id + operatore + valore)
- `client-next/components/public/FormPublicPage.jsx` — fieldVisible(), multi-step con allStepNumbers/currentStepNumber, progress bar, bottoni Avanti/Indietro
- `client-next/components/LandingBlockRenderer.jsx` — stessa logica in FormBuilderBlock (funzione `fbFieldVisible` per evitare collision)

### Architettura condizioni (client-side)
```js
function fieldVisible(campo, dati) {
  if (!campo.condizione?.campo_id) return true
  const val = String(dati[campo.condizione.campo_id] ?? '').toLowerCase()
  const target = String(campo.condizione.valore ?? '').toLowerCase()
  // eq | neq | contains
}
```

### Architettura multi-step (client-side)
```js
const allStepNumbers = [...new Set(campi.map(c => c.step ?? 0))].sort()
const totalSteps = Math.max(allStepNumbers.length, 1)
const isMultiStep = !!(form.multi_step && totalSteps > 1)
const currentStepNumber = allStepNumbers[currentStep]
const visibleCampi = campi.filter(c =>
  (!isMultiStep || (c.step ?? 0) === currentStepNumber) && fieldVisible(c, dati)
)
```

**Migration 057 eseguita ✅** 2026-06-13

**Deploy**: commit 65aaf43, Vercel prod deploy ✅ 2026-06-13

