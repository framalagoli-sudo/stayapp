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

## ✅ ANTEPRIME FIXATE (30/6) — stile Elementor "clic → vedi davvero"
Storia: il 26/6 le card mostravano un iframe scalato BLOCCATO (`pointerEvents:'none'`, `scrolling="no"`) senza modo di aprire il sito → Francesco: "sono sempre immagini, non aprono i siti". FIX (30/6, LIVE, deploy+46/46 smoke, route verificata 200 a freddo): in `SiteTemplateGallery.jsx` la thumbnail è ora un `<a target="_blank" href="/template-preview/[id]">`: al hover compare overlay scuro + pulsante "Anteprima" (icona lucide Eye), clic → apre il template REALE e navigabile a tutto schermo in nuova scheda. La route `/template-preview/[id]` (render via LandingBlockRenderer) era già a posto, mancava solo l'aggancio dall'UI. Da verificare a video da Francesco (tab "Template" in Sito, sotto auth).

## ℹ️ NON è doppio lavoro — 3 livelli distinti (chiarito a Francesco 30/6)
Francesco ha notato "template" anche su Pagina→crea nuova e ha chiesto se è doppione. NO, 3 cose diverse:
1. **Template di sito** (`lib/siteTemplates.js`, tab "Template" in Sito): crea la HOME intera (6-7 blocchi) + applica TEMA (colori/font) + attiva minisito. Vedi `apply/route.js`. = casa chiavi in mano.
2. **Sezioni pronte** (`lib/blockPatterns.js`, "Inserisci sezione pronta" in PaginaEditorPage): inserisce 1-2 blocchi SINGOLI (chi_siamo/faq/cta/servizi_3/galleria_testo) in una pagina già aperta, NON tocca tema. = mattoncino.
3. **AI Site Builder** (3 template strutturali): genera sito multi-pagina con AI. = cantiere.
Sovrapposizione solo concettuale (entrambi "blocchi pre-riempiti") + naming confuso ("template" in 2 posti). Possibile miglioria futura: rinominare le "sezioni pronte" per distinguerle. Nessun codice duplicato da buttare.

## 🚨 DECISIONE 26/6 (corretta dopo un mio ERRORE): AI SITE BUILDER È LA FEATURE PRINCIPALE — NON TOCCARLA
**AI Site Builder** (voce sidebar top-level → `app/admin/ai-site-builder` + `AiSiteBuilderPage.jsx` + `/api/ai/generate-site`: wizard obiettivo+template-strutturali+preset → genera sito **multi-pagina**) è **LA feature più importante di OltreNova**, ci hanno lavorato tantissimo. È IL modo di creare il sito con l'AI. **Va tenuta esattamente com'è. NON rimuovere mai la voce sidebar né la pagina.**
I **template** (la galleria che ho fatto, `lib/siteTemplates.js` + tab "Template" in SitoPage, Fase A+B) sono **solo una SCORCIATOIA dentro l'editor a blocchi "per fare prima con i blocchi"** — NON un secondo tool, NON sostituiscono il builder. Parole di Francesco: "i template ci sono ma per fare prima con i blocchi".
⚠️ MIO ERRORE 26/6: avevo frainteso un AskUserQuestion ("unificare sulla galleria") e **rimosso la voce sidebar AI Site Builder** → Francesco giustamente furioso. **Ripristinata** subito (git checkout HEAD~1 di AdminLayout + redeploy). Lezione: AI Site Builder = intoccabile; quando una scelta tocca una feature core, NON dedurre da una mia domanda mal posta — chiedere esplicitamente "tolgo X?".

## 🎨 SVOLTA QUALITÀ DESIGN (30/6) — Francesco: "i template sono una merda, sembra una fregatura". HA RAGIONE.
Screenshottati i template live (Playwright headless su /template-preview): difetti OGGETTIVI, non gusto. **Diagnosi radice: i template valgono quanto i BLOCCHI con cui sono fatti; il problema non è la galleria.** L'AI builder eredita lo stesso soffitto (genera gli stessi blocchi). Lavoro in ordine: PAVIMENTO (bug) → IMMAGINI → SOFFITTO (design blocchi) → AI bespoke.

### ✅ PAVIMENTO fixato + LIVE (30/6):
- **Stat invisibili**: `case 'stats'` usava `color: primary` su banda scura → se primary È scuro (vetrina #1a1a2e) spariva. Fix: helper WCAG `readableOn(color,bg,fallback)` in `lib/blockTypes.js` (+ `contrastRatio`). Ora numeri bianchi se primary non contrasta.
- **Icone → tutte stelle**: `HIGHLIGHT_LUCIDE` in LandingBlockRenderer non aveva 8 chiavi usate dai template (check-circle, check, clock, phone, calendar, coffee, users, gift) → fallback Star. Aggiunte.

### ✅ HERO SLIDER — nuovo blocco `hero_slider` LIVE (30/6, verificato desktop+mobile):
Francesco vuole "hero slider tipo Slider Revolution ma EASY, ottimizzato desktop/mobile". Riferimenti suoi (suo gusto = full-screen, tipografia serif protagonista, sottotitolo corsivo, frecce, luxury/editoriale): **borgodellago.it** (il più calzante), corpetti.it, malagoliwedding.com.
- Deciso: blocco NUOVO a fianco dell'hero esistente (rischio zero sui siti live).
- File: `lib/blockTypes.js` (BLOCK_TYPES + BLOCK_DEFAULTS `{slides:[],autoplay,interval,height:'full',overlay_opacity,text_align}` + BG_EXCLUDED), `components/admin/UnsplashPicker.jsx` (NUOVO, riusa GET /api/ai/unsplash), `PaginaEditorPage.jsx` (SlidesEditor + case), `LandingBlockRenderer.jsx` (componente `HeroSlider`: crossfade, frecce, puntini, swipe mobile, autoplay+pausa, clamp tipo, gradiente overlay, lazy/eager img), `siteTemplates.js` (Vetrina usa hero_slider 3 slide), `site-templates/apply` addIdsToData gestisce anche `slides`.
- **Unsplash GIÀ configurato**: env `UNSPLASH_ACCESS_KEY`, route `GET /api/ai/unsplash?q=&n=` (requireAuth) → {url,thumb,alt,author}.

### ✅ IMMAGINI PERTINENTI (Unsplash) — LIVE (30/6, verificato a video):
Niente più picsum random. `lib/unsplash.js` (NUOVO, server-only): `searchUnsplash(q,n)` con cache per-processo + `resolveBlockImages(blocks, extraTerms)` che riempie gli slot `image_query`→URL (hero.bg_image_url, foto_testo/immagine.image_url, hero_slider slides[].image_url), una ricerca per query, distribuzione senza ripetizioni, fail-safe (senza chiave torna [] e i blocchi restano coi fallback). 
- Template (`siteTemplates.js`): le immagini ora sono `image_query` a tema (es. 'elegant interior warm light', 'artisan craftsmanship detail', 'modern bright office workspace', 'event audience celebration'), NON URL picsum.
- Risolto in: `apply/route.js` (terms []), `ai-fill/route.js` (terms = settore SECTOR_TERM{struttura:hotel,ristorante:restaurant,attivita:''} + prime 3 parole del brief), `template-preview/[id]/page.js` (server component risolve e passa `blocks` al client → la GALLERY mostra foto vere).
- `/api/ai/unsplash` refactorata per riusare `searchUnsplash`.
- ⚠️ FIX translate.js: aggiunte 'query','image_query' a CONFIG_KEYS → `image_query` NON viene riscritta dall'AI né tradotta EN (è config, non prosa). Senza, l'AI fill avrebbe trasformato la query in prosa italiana rompendo la ricerca.
- Verifica live: preview vetrina = interno elegante boiserie + artigiano + angolo cozy; servizi = ufficio moderno. Coerenti e belli.

### ✅ SOFFITTO pass 1 — LIVE (30/6, verificato a video tutti e 3 i template):
- servizi-pro ed evento ora usano **hero_slider** (3 slide ciascuno, image_query a tema) come vetrina → tutti i template partono con hero a tutto schermo.
- **highlights** in LandingBlockRenderer: da icone sparute a **card** (bg #fafafa, bordo, radius 16, padding) + griglia ora RESPONSIVE (`repeat(auto-fit,minmax(220px,1fr))`, prima era `repeat(min(items,3),1fr)` fissa = 3 col strette su mobile) + icona 56→60, testo 15→16.
- **about**: filetto d'accento (barra primary 54×3) sotto il titolo + più aria (84px) + testo 17→18 lh 1.8 → look editoriale (stile riferimenti).
- ⚠️ Modifiche a highlights/about toccano TUTTI i siti live (sono blocchi condivisi) ma sono migliorie additive, nessun break. Verificato: 46/46 smoke.
- Risultato: i 3 template ora sembrano siti veri e coerenti. Francesco: "il fregatura è andato" (obiettivo raggiunto).

### ⏭️ PROSSIMO (rifiniture, quando si torna):
- **Feedback Francesco sullo stile** dei template dall'editor (deve provarli sotto auth: Sito→Template).
- **AI bespoke avanzato**: query immagini più mirate dal brief (oltre al settore), magari l'AI che sceglie i soggetti delle foto.
- Eventuali altri blocchi da rifinire (paragrafi/team/steps già decenti); più template in galleria; Fase C wizard filtri settore/obiettivo + "Sfoglia".
- Screenshot Playwright dei riferimenti/template in scratchpad sessione (temporanei).

## STATO
- ✅ **Fase A FATTA (26/6)**: `lib/siteTemplates.js` (3 template: vetrina-elegante, servizi-pro, evento — struttura+tema+contenuti esempio, forme blocco validate). API `POST /api/site-templates/apply` (auth requireEntityAccess, crea __home__ + applica theme + attiva minisito). `components/admin/SiteTemplateGallery.jsx` + tab "Template" in SitoPage (card con anteprima colori/struttura + "Usa questo template"). Verificato: 401 unauth, template renderizza su /s/prova (tutti i markers), smoke verde. Anteprima v1 = stack colorato (non live render).
- ⏭️ DA FARE: Fase B (AI fill testi/immagini al business), Fase C (wizard filtri settore/obiettivo + "Sfoglia"); upgrade anteprima a live-render; più template; collegare alla scelta "uguale vs traccia". Verificare a video l'apply dall'UI (auth).

## Piano a fasi
- **Fase A — Fondamenta**: `lib/siteTemplates.js` (set curato, struttura+tema+contenuti esempio) + API "applica template" (crea __home__ coi blocchi + tema, auth requireEntityAccess) + galleria con anteprima + "Applica" → si modifica in SitoPage.
- **Fase B — AI fill**: l'AI adatta testi/immagini del template al business ("uguale coi miei dati" / "come traccia"); estende generate-site con seed di blocchi.
- **Fase C — Wizard guidato**: domande settore/obiettivo → filtri template, integrato nel flusso AI builder; + "Sfoglia template".
