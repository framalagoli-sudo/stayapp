---
name: project_template_gallery
description: "Roadmap sistema TEMPLATE per l'AI builder (galleria stile Elementor) — visione Francesco 26/6"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2a1be9ea-f8b0-46bd-9c9b-087bb6fdbfb5
---

Sistema template per l'AI site builder. Visione Francesco (26/6): piattaforma per dummies. Vedi [[todo_prossima_sessione]] (unificazione editor) e l'AI builder esistente.

## Visione (parole di Francesco)
- **Galleria di siti-esempio belli e pieni**: il cliente vede struttura blocchi + stile (anteprime realistiche), tipo **Elementor di WordPress** (riferimento che usa da anni, "molto intuitivo").
- Il template porta **struttura blocchi + stile (colori/font)**. Immagini e testi li **adatta l'AI** ai desiderata durante il builder.
- **Due ingressi**: (a) GUIDATO — domande "che settore?/che obiettivo?" → filtra/suggerisce template; (b) SFOGLIA — scegli quello che ti piace, salti le domande.
- Dopo la scelta il cliente decide: **A) "lo voglio uguale"** / **B) "usalo come traccia"**. L'AI riempie coi dati del cliente.

## Decisioni prese
- **Storage template: IN CODICE** (`lib/siteTemplates.js`), set curato. No DB per la v1 (deciso 26/6).
- **Anteprima**: render dal vivo coi nostri blocchi (`LandingBlockRenderer` in scala) → realistico e sempre accurato, niente screenshot statici da mantenere. [v1 può partire con preview più semplice colori+stack, poi upgrade a live].

## Stato infrastruttura (già esistente, da sfruttare)
- AI builder (`app/api/ai/generate-site/route.js`) GIÀ genera BLOCCHI in `pagine` (__home__ + pagine) da obiettivo+template+answers. Wizard `AiSiteBuilderPage.jsx` con 6 OBIETTIVI, 3 TEMPLATES strutturali (essential/complete/narrative, wireframe astratti = i "disegnini"), 8 PRESET settore.
- Forme blocchi validate (da home reale): hero{title,tagline,cta1_text,cta1_url,bg_image_url,height}, about{title,text}, foto_testo{title,text,image_url,inverti,button_label,button_url}, highlights/steps{titolo,items:[{icon,text}]}, stats{titolo,items:[{label,value}]}, faq{titolo,items:[{question,answer}]}, cta_banner{title,subtitle,button_text,button_url}. `BLOCK_DEFAULTS` in `lib/blockTypes.js`. Gli items prendono id via addItemIds (vedi generate-site).
- Editor unificato: sidebar "Sito web" → SitoPage (block editor, hub). Vedi [[todo_prossima_sessione]].

## ⚠️ ANTEPRIME DA RIFARE (feedback Francesco 26/6): "così è VERGOGNOSA"
Le card mostrano un iframe MINUSCOLO non navigabile → inutile ("che vedo? non posso navigare, tanto lavoro per nulla"). La route `/template-preview/[id]` però È il sito reale a piena pagina e navigabile. FIX (stile Elementor, piccolo): thumbnail nella griglia + pulsante **"Anteprima"** che apre `/template-preview` **a tutto schermo / modale navigabile / nuova scheda**. NON rifare la route, solo l'interazione "clic → vedi davvero". Da fare DOPO la Fase B (priorità Francesco).

## 🚨 DECISIONE 26/6 (corretta dopo un mio ERRORE): AI SITE BUILDER È LA FEATURE PRINCIPALE — NON TOCCARLA
**AI Site Builder** (voce sidebar top-level → `app/admin/ai-site-builder` + `AiSiteBuilderPage.jsx` + `/api/ai/generate-site`: wizard obiettivo+template-strutturali+preset → genera sito **multi-pagina**) è **LA feature più importante di OltreNova**, ci hanno lavorato tantissimo. È IL modo di creare il sito con l'AI. **Va tenuta esattamente com'è. NON rimuovere mai la voce sidebar né la pagina.**
I **template** (la galleria che ho fatto, `lib/siteTemplates.js` + tab "Template" in SitoPage, Fase A+B) sono **solo una SCORCIATOIA dentro l'editor a blocchi "per fare prima con i blocchi"** — NON un secondo tool, NON sostituiscono il builder. Parole di Francesco: "i template ci sono ma per fare prima con i blocchi".
⚠️ MIO ERRORE 26/6: avevo frainteso un AskUserQuestion ("unificare sulla galleria") e **rimosso la voce sidebar AI Site Builder** → Francesco giustamente furioso. **Ripristinata** subito (git checkout HEAD~1 di AdminLayout + redeploy). Lezione: AI Site Builder = intoccabile; quando una scelta tocca una feature core, NON dedurre da una mia domanda mal posta — chiedere esplicitamente "tolgo X?".

## STATO
- ✅ **Fase A FATTA (26/6)**: `lib/siteTemplates.js` (3 template: vetrina-elegante, servizi-pro, evento — struttura+tema+contenuti esempio, forme blocco validate). API `POST /api/site-templates/apply` (auth requireEntityAccess, crea __home__ + applica theme + attiva minisito). `components/admin/SiteTemplateGallery.jsx` + tab "Template" in SitoPage (card con anteprima colori/struttura + "Usa questo template"). Verificato: 401 unauth, template renderizza su /s/prova (tutti i markers), smoke verde. Anteprima v1 = stack colorato (non live render).
- ⏭️ DA FARE: Fase B (AI fill testi/immagini al business), Fase C (wizard filtri settore/obiettivo + "Sfoglia"); upgrade anteprima a live-render; più template; collegare alla scelta "uguale vs traccia". Verificare a video l'apply dall'UI (auth).

## Piano a fasi
- **Fase A — Fondamenta**: `lib/siteTemplates.js` (set curato, struttura+tema+contenuti esempio) + API "applica template" (crea __home__ coi blocchi + tema, auth requireEntityAccess) + galleria con anteprima + "Applica" → si modifica in SitoPage.
- **Fase B — AI fill**: l'AI adatta testi/immagini del template al business ("uguale coi miei dati" / "come traccia"); estende generate-site con seed di blocchi.
- **Fase C — Wizard guidato**: domande settore/obiettivo → filtri template, integrato nel flusso AI builder; + "Sfoglia template".
