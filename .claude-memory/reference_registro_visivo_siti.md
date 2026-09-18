---
name: reference-registro-visivo-siti
description: "Le 8 aggiunte del 18/09/2026 che portano i siti al registro moderno: font display, fondo scuro (277 colori fissi → variabili), alone, etichetta, parola evidenziata, barra a pillola"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-18T08:11:30.084Z
---

Francesco ha portato due riferimenti (iagentica.it, infodtechstudios.com) e ha chiesto perché i nostri predefiniti sembrano «vecchiotti». Misurati con un browser: **fondo scuro, un accento saturo, titolo 90–102px in font display, alone luminoso, etichette in maiuscoletto, numeri che salgono**. La struttura delle sezioni era già la nostra: mancava il registro, non i blocchi (ne abbiamo 39).

Fatto il 18/09, tutto **spento di default** (nessun sito online cambia):
- **3 font display**: Space Grotesk, Sora, Unbounded (+3 abbinamenti). ⚠️ La mappa dei font era **copiata in 9 file**: ora fonte unica in `lib/fonts.js` (`FONT_CSS_URLS`, `caricaFont`).
- **Fondo scuro davvero possibile**: `body { background:#fff; color:#1a1a2e }` era scritto a mano nelle tre landing e nelle sotto-pagine, e dentro i blocchi c'erano **277 colori fissi**. Ora `lib/superficie.js` dà le variabili (`--sup`, `--txt`, `--txt-tenue`, `--bordo`); **in chiaro valgono i valori storici** — verificato con due foto a confronto di siti veri, identiche.
- **Alone** per sezione (`style.glow`), **etichetta sopra il titolo** (`style.etichetta`, sta in `applyBlockStyle` perché i titoli sono in 15 `case` diversi), **`<mark>`** per la parola in accento (colore via CSS `--accento`: il tag resta senza attributi), **barra a pillola** (`header_cfg.style:'pillola'`), **pulsante con alone**. I numeri animati (CountUp) **c'erano già**.
- Nuovo template **«Notte (scuro)»**: gli altri otto erano tutti bianchi. Serve anche da banco di prova.

**Sonda nuova: `tests/probe-contrasto.mjs`** — apre la pagina, scorre (i blocchi compaiono allo scroll: senza scorrere sono trasparenti) e misura colore del testo vs sfondo reale. Ha trovato 4 punti illeggibili nel tema scuro e, su un sito vero, **i link del banner cookie invisibili** (colore del tema del cliente su banner scuro → ora `readableOn`). ⚠️ Non misura il testo sopra un'immagine: bianco su foto è corretto, ed è quasi ogni hero.

⛔ **Difetto vecchio trovato per caso**: `haFormattazione` in `lib/testo-ricco.js` usava una regex **globale** con `.test()`, che ricorda la posizione → sullo stesso testo rispondeva true, poi false. Un titolo formattato di un cliente usciva **coi tag in chiaro a chiamate alterne**: intermittente, per questo mai preso.

⚠️ Due trappole di metodo: lanciare `npm run build` mentre gira `npm run dev` fa servire al dev una copia vecchia (mi ha fatto credere per due giri che il codice non funzionasse); e una sostituzione automatica su `lib/siteTemplates.js` ha toccato **due** template invece di uno — controllare sempre quante volte una stringa compare.

Vedi [[project_block_system_roadmap]], [[reference_sonda_misura_sbagliata]], [[project_landing_marketing]].
