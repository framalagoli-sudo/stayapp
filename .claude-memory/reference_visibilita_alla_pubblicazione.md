---
name: reference-visibilita-alla-pubblicazione
description: "Pubblicare un sito lo rende trovabile su Google (migration 124), e chi spegne di proposito non viene riacceso; titolo e descrizione li propone l'AI"
metadata:
  type: reference
---

**19/09/2026.** I siti nuovi nascono invisibili ai motori (`indicizzabile DEFAULT false`, migration 116 — giusto: il primo giorno contengono il testo di esempio) ma **nessun passaggio ricordava di accenderli**: un cliente poteva pubblicare e restare fuori da Google per sempre senza saperlo.

**Ora**: quando il minisito passa a `active: true`, se nessuno ha ancora deciso la visibilità si accende insieme. La regola sta in **`campiAmmessi` (`lib/entita.js`)**, cioè nel punto da cui passano tutte e tre le pagine da cui si pubblica — non in una sola delle tre.

`entita.indicizzabile_scelto` (migration **124**) registra **una decisione presa da una persona**: si mette a `true` ogni volta che qualcuno tocca l'interruttore, e da lì nessuna automazione ribalta la scelta. Backfill: `true` per i nove siti già visibili, così nessuno di loro viene toccato.

Provato in produzione, in tutti e due i versi:
- sito non deciso → pubblicato → **visibile = true** ✓
- cliente che spegne di proposito → poi pubblica → **resta spento** ✓ (l'entità di prova è stata rimessa com'era)

**Titolo e descrizione proposti dall'AI** — `POST /api/entita/[id]/seo-proposta?tipo=`, pulsante «Proponili tu» nel pannello [[reference_stato_sito]], dove la mancanza è già segnalata. Passa da `chiamaAI`, quindi dentro il tetto dell'azienda. ⚠️ **Propone, non salva**: si vedono e poi si tengono («Usa questi») o si buttano — le parole con cui un'attività si presenta sono sue.

⚠️ **`entityDataSummary` è un SUPPLEMENTO** (servizi, orari, dotazioni): non contiene nome, settore e descrizione. Passandolo da solo la proposta usciva «Attività commerciale in Via Galvani 14» per uno studio di investimenti immobiliari. Col contesto completo (nome, settore, slogan, titoli delle pagine, testi della home **comprese le diapositive**): «Metodo TVB - Investimenti Immobiliari in Umbria».

⚠️ `innerText` di Playwright **rispetta `text-transform`**: cercare «Proposta» non trova un titolo reso in maiuscolo. Mi ha fatto credere per due giri che il riquadro non comparisse.

Vedi [[reference_seo_primo_giro]], [[reference_visibilita_motori]].
