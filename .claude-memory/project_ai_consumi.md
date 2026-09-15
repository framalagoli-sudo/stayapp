---
name: project_ai_consumi
description: "Contatore dei consumi AI e tetto mensile in dollari per azienda (15/09/2026) — perché, come è fatto, cosa non copre"
metadata: 
  node_type: memory
  type: project
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-15T17:01:59.506Z
---

**Perché**: il 15/09/2026, con le credenziali già consegnate a più clienti, delle 13 chiamate all'AI solo il chatbot pubblico aveva un limite vero (40/h per IP). Quattro avevano un «limite mensile» in una `new Map()` (su Vercel riparte a ogni istanza: decorativo), otto nessuno — incluso `from-document` con Sonnet fino a 15 chiamate parallele. Nessuna registrava la spesa. Francesco lo ha messo come priorità assoluta.

**Come è fatto** (ramo `ai-consumi`, migration `119`):
- `lib/ai-consumi.js` → `chiamaAI({ azienda_id, funzione, prompt|messages, system, maxTokens, modello, timeoutMs, controllaBudget })`. Prima `ai_speso_mese` (RPC: la somma la fa il DB, non il codice — PostgREST taglia a 1000 righe), dopo insert in `ai_consumi` con i token di `data.usage`. Listino Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15 per MTok; modello ignoto = prezzo più alto.
- Tetto: `aziende.ai_budget_mensile_usd`, NULL = `BUDGET_MENSILE_PREDEFINITO_USD` (5, provvisorio, da confermare con Francesco). Mese UTC. Nessun campo UI: si cambia via SQL; il PATCH aziende NON lo accetta (whitelist).
- **Chi paga = l'azienda di chi preme il pulsante**. Il super_admin non ha azienda → riga con `azienda_id` NULL, nessun tetto. (Prima genera/social-post/blog-auto usavano l'id UTENTE come azienda per il super_admin.)
- Se la lettura del budget fallisce **si lancia** (fail closed). Per questo il ramo non va deployato prima della 119.
- 429 con `messaggioBudgetEsaurito()` (data di rinnovo, niente dollari). Al cliente si mostra solo la **percentuale** (`usage.percentuale`, `/api/ai/usage`).
- Eccezioni ragionate: **traduzioni** contate ma mai fermate (`controllaBudget:false`: si pagano una volta per contenuto, fermarle lascerebbe /en in italiano); **chatbot** a credito finito risponde 200 con i contatti dell'entità; **ai-fill** e **from-document** controllano PRIMA (ai-fill su errore AI riscriveva la home con i testi d'esempio); **blog automatico** salta l'articolo e passa alla data dopo.
- Avviso a `ERROR_ALERT_EMAIL` all'80% e al 100%, una volta per soglia/azienda/mese (chiave `check_rate_limit` con finestra 40 giorni).
- Diagnostica: riquadro «Consumi AI del mese» (RPC `ai_consumi_riepilogo_mese`).
- `verifica-regole.mjs` regola 12: `api.anthropic.com` fuori da `lib/ai-consumi.js` blocca il deploy.
- Trovato per strada: `ai/blog-auto` accettava l'entità di un altro cliente (solo `requireAuth`) → `requireEntityAccess`.

**Ricarica (15/09, migration 121)**: `ai_extra_usd` + `ai_extra_mese` (AAAA-MM, vale solo quel mese), route `/api/aziende/[id]/credito-ai` solo super_admin, il valore SOSTITUISCE (non somma). Banner cliente dall 80% in AdminLayout. Chiave avviso include il tetto → dopo una ricarica un nuovo 100% riavvisa.

**Cosa NON copre**: concorrenza (chiamate partite insieme a un passo dal tetto lo superano di centesimi); il tetto dell'intera piattaforma è il **limite di spesa sulla Console Anthropic** (detto a Francesco di impostarlo). Un visitatore ostile del chatbot può consumare il credito del cliente e fermargli gli strumenti AI del mese: scelto consapevolmente, meglio che consumare i nostri soldi senza limite.

**Sonda**: `tests/probe-ai-consumi.mjs` (azienda ZZ-AI effimera; fa partire davvero l'avviso 100% verso l'operatore).

Vedi [[reference_ai_model_fidelity]], [[reference_guasti_silenziosi]].
