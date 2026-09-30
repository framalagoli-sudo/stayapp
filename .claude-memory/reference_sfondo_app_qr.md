---
name: reference-sfondo-app-qr
description: "Aspetto dell'app del QR scelto dal cliente senza toccare il sito (theme.appSfondo + theme.app): stili pronti, personalizzazione, palette unica per le 3 app; sonda probe-app-leggibile.mjs"
metadata:
  type: reference
---

**29/09/2026**: Garage 22 chiede l'app del QR con fondo nero (fatto: `appSfondo: 'scuro'`). Poi Francesco: «un cliente non può personalizzare l'app a piacere?» → approvato «procedi, mi fido».

- **Pannello**: «App del QR» → riquadro **«Aspetto dell'app»** (`components/admin/AspettoApp.jsx`, nelle 3 pagine moduli): 4 stili pronti (Come il sito · Scuro elegante · Caldo · Minimal), anteprima dal vivo, «Personalizza» con sfondo (anche colore mio), colore principale, icone, testi, caratteri, schede, angoli, intestazione, allergeni.
- **Dati**: `theme.appSfondo` ∈ sito/scuro/chiaro/personale + `theme.app` {sfondo, accento, icone, testo, fontTitoli, fontTesto, schede, angoli, intestazione, allergeni, stile}. Nel tema perché le 3 entità lo hanno uguale e tutte le scritture del tema fanno spread.
- **`lib/palette-app.js`**: `aspettoApp()` ripulisce (cataloghi chiusi + esadecimale: un valore ostile torna al predefinito, provato), `paletteApp()` decide tutto. Un colore illeggibile viene sostituito e finisce in `sostituiti` → il pannello lo dice. `brand` = colore originale per le isole (intestazione, chatbot, prenotazione, banner).
- **Ombre/bordi delle schede** = variabili CSS `--ombra-scheda`/`--bordo-scheda` impostate SOLO se il cliente sceglie; i componenti tengono il valore storico come ripiego → chi non tocca nulla è identico (0 differenze su 741 elementi, prod vs locale).
- **Allergeni**: obbligo di legge → 3 stili leggibili (`coloriAllergene`), mai colore libero.
- Prima lo scuro si riconosceva solo con fondo esattamente `#1a1a2e`.
- **Sonda `tests/probe-app-leggibile.mjs /r/slug [cartella]`**. ⚠️ Git Bash: `MSYS_NO_PATHCONV=1`. ⚠️ Non lanciarla in produzione MENTRE girano gli smoke del deploy: il 29/09 gli smoke sono falliti nel setup (corse sovrapposte), da soli 74/74.
- **Da decidere con Francesco** (toccano tutti, esistevano già): grigio `#777` = 4,48 nelle app chiare; bianco su verde WhatsApp = 1,98.

Collegati: [[reference_registro_visivo_siti]], [[reference-sonda-misura-sbagliata]], [[reference_smoke_corse_parziali]].
