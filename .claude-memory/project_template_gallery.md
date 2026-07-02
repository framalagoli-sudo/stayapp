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

### ✅ ANTEPRIMA con HEADER + FOOTER + MOBILE — LIVE (1/7, verificato a video):
Feedback Francesco (1/7): template "meglio di prima ma senza header né footer; serve anteprima mobile; stile carino ma troppo simili tra loro, intensificare (carosello?); più template solo se DIVERSI; ok Fase C".
- `TemplatePreviewClient.jsx` riscritto: rende NAV (nome+link+Prenota, overlay sull'hero, responsive) + blocchi + `LandingFooter` riusato (entità fittizia realistica) → anteprima = sito completo. Nav overlay ok perché tutti i template iniziano con hero_slider (immagine scura).
- **Toggle Desktop/Mobile**: barra in alto SOLO standalone (`window.self!==window.top`). Mobile = iframe 390px in cornice telefono → viewport reale, media query scattano (mobile fedele). Embedded (thumbnail galleria o iframe mobile) = solo chrome.

### ✅ CAROSELLO contenuti — NUOVO blocco LIVE (1/7, verificato a video):
Blocco `carosello` (Francesco ha scelto questo per primo). File:
- `blockTypes.js`: BLOCK_TYPES (group media) + BLOCK_DEFAULTS `{titolo,items:[],per_view:3,autoplay,interval:5,show_arrows,show_dots}`.
- `LandingBlockRenderer.jsx`: componente `Carousel` (track translateX, per_view responsive via resize→1 su <640px, frecce disabilitate ai bordi, puntini=pagine, swipe, autoplay+pausa, card immagine 4:3 + titolo + testo + pulsante opz.). Case `carosello`.
- `PaginaEditorPage.jsx`: `ItemListEditor` esteso con prop entityId/entityTipo + tipo campo `image` (preview + UnsplashPicker + UploadBtn + url) — riusabile per altri blocchi. Case editor carosello (lista item + per_view/autoplay/interval/frecce/puntini).
- `unsplash.js` resolveBlockImages: gestisce anche `carosello` items[].image_query.
- Aggiunto un carosello "Le nostre proposte" (4 card) al template vetrina per demo → immagini Unsplash pertinenti OK.
- Carousel-like ora: hero_slider (hero), carosello (contenuti), clienti (loghi).

### ✅ SMART HEADER (headroom) — LIVE (1/7, verificato a video):
Francesco voleva l'effetto di borgodellago.com. VERIFICATO borgodellago (Elementor `header-scroll-smart`): in cima visibile, scroll giù→nascosto (translateY -100%), scroll su→riappare, IDLE→resta nascosto (NON riappare da fermo — Francesco ricordava male, glielo ho detto). Replicato ESATTO (no idle-reappear).
- Opzione `scroll_behavior: 'smart' | 'appear'` in header_cfg. `appear`=default (appare dopo scroll), `smart`=headroom, `always_visible`=override.
- 3 landing (LandingStruttura/Ristorante/Attivita): stato `navVisible` + effetto direzione scroll; transform usa navVisible.
- ⚠️ FIX bug pre-esistente: i landing leggevano `mini.header` ma SitoPage salva `mini.header_cfg` → la config header di SitoPace NON arrivava ai siti. Ora `mini.header_cfg || mini.header` (fallback). Quindi ora la config header di SitoPage si applica davvero (verificare che non cambi header a siti live che avevano header_cfg diverso — rischio basso, valori benigni).
- Config UI in SitoPage: select "Comportamento allo scroll" (disabilitato se Sempre visibile).
- Preview (`TemplatePreviewClient`): nav ora FIXED + smart headroom (demo), barra Desktop/Mobile spostata in pill flottante in BASSO per non scontrarsi. Verificato: top Y0 → down Y-76 → up Y0.

### ✅ 8 TEMPLATE PER VERTICALE — LIVE (1/7, verificato a video, distinti):
`siteTemplates.js` riscritto: da 3 a 8 template dal DNA diverso (Francesco: "8, uno per tipo"). Sostituiti i vecchi (vetrina/servizi-pro/evento rimossi; evento folded in esperienze).
1. hotel (navy/playfair, luxury) 2. ristorante (bordeaux/cormorant) 3. prodotti (blu/montserrat, hero sinistra, showroom) 4. servizi (ciano/dm-sans, conversione) 5. esperienze (teal/raleway, avventura) 6. beauty (rosa/cormorant, spa) 7. fitness (arancio/montserrat, bold, con pacchetti) 8. professionista (slate/playfair, sobrio, hero singolo).
Ognuno: theme distinto + mix blocchi diverso (hero_slider/hero, carosello, steps, pacchetti, testimonianze, paragrafi...) + image_query a tema + campi `settori`/`obiettivi` pronti per Fase C.
- Rifiniture note (non bloccanti): query "product showcase studio" (prodotti) rende uno studio fotografico più che prodotti; prodotti/servizi sono la coppia più simile (dark/ufficio). Ritoccabili via image_query.

### ✅ HEADER/FOOTER PER-PAGINA (opzione B) — LIVE + VERIFICATO (1/7):
Fix header sotto-pagine: `GuestSubPage` ora legge `mini.header_cfg || mini.header` (config SitoPage si applica) + smart headroom anche sulla sub-nav (prima sempre visibile). Footer già applicato.
Opzione B (scelta da Francesco): header/footer condivisi di default, ma ogni pagina può nasconderli (landing distraction-free). NON multi-header chooser (contro "for dummies").
- Migration `063_pagine_hide_header_footer.sql` (hide_header/hide_footer boolean default false) — ESEGUITA da Francesco 1/7.
- PATCH `/api/pagine/[id]` ALLOWED += hide_header/hide_footer. Editor: 2 toggle in PaginaEditorPage (accanto a status/nel_menu). Rendering: GuestSubPage salta nav (+ padding-top 0) e/o LandingFooter. Home (__home__ via LandingStruttura) tiene sempre header/footer.
- Verificato a video: pagina temp su entità 'prova' (id 270f8e90...) con hide entrambi → DOM hasNav:false hasFooter:false, screenshot ok; pagina poi cancellata. (Verifica DB fatta via REST + service role da tests/.env.test, project ref decodificato dal JWT.)
- Nota minore aperta: su landing con header nascosto lo switcher lingua (chip GB/EN) resta visibile — eventualmente nasconderlo anche lì.

### ✅ FASE C — wizard galleria template (1/7, deploy fatto):
`SiteTemplateGallery.jsx`: wizard chip "1. Di cosa ti occupi?" (8 settori → intersecano i `settori` dei template) + "2. Obiettivo?" (vetrina/lead_gen/prenotazioni, opzionale, ordina i risultati) + link "Sfoglia tutti i template". Header risultati "Consigliati per te (N)" / "Tutti i template (N)". Nessuna API — filtro client puro. Costanti WIZARD_SECTORS/WIZARD_GOALS in cima al file.
- ⚠️ È area admin (sotto login): verificato build + logica; la UX la verifica Francesco interattivamente (Sito → Template).
- Da committare (flusso "salva").

### 🎉 FEEDBACK 1/7 COMPLETATO: carosello ✅ + template diversi (8) ✅ + Fase C ✅. Anche header/footer per-pagina (opzione B) ✅ + smart header ✅ + anteprima header/footer/mobile ✅.

### ✅ BACKLOG 1-2-3 fatti (1/7, deploy):
1. **Query immagini AI dal brief**: `ai-fill/route.js` nuova `aiImageQueries(blocks, business)` → l'AI genera una query foto EN per ogni slot immagine (hero/foto_testo/slider/carosello) mirata al business; poi resolveBlockImages con extraTerms=[] (o [settore] se l'AI fallisce). Fallback: query del template. Solo via AI-fill (auth) → Francesco verifica interattivo.
2. **Rifinite query template**: prodotti hero 'product showcase studio'→'retail product display shelf', 'modern factory production'→'factory production line'.
3. **Switcher lingua nascosto su landing header-nascosto**: le 3 route /p/ montano LanguageSwitcher solo se `!pagina.hide_header`.

## 🎨 DEEPENING DESIGN SYSTEM (2/7) — Francesco: "voglio fare tuttoooooo". Piano 7 filoni, a batch deployabili.
Gap identificati (mia analisi): non manca la QUANTITÀ di blocchi (~30) ma la PROFONDITÀ. Ordine: sfondi sezione → picker unsplash ovunque → accento → varianti → blocchi nuovi → animazioni/duplica → anteprima live editor.

### ✅ FATTO (2/7, live+verificato):
- **Picker Unsplash ovunque**: aggiunto a hero, foto_testo, immagine (hero_slider/carosello già l'avevano) in PaginaEditorPage.
- **Duplica blocco**: `duplicateBlock` in PaginaEditorPage (nuovi id per items/slides) + pulsante Copy nella toolbar blocco.
- **Sfondi di sezione (FLAGSHIP)**: `blockTypes.js` BLOCK_BG + 'dark'/'primary'/'image'; `resolveBlockBg(style,primary)`→{background,inverted}; `applyBlockStyle(el,block,{primary})` aggiunge classe `lbr-inv` se scuro; `blockInverted()`. globals.css `.lbr-inv h2{color:#fff!important}` (titoli; card usano h3→restano scure). Testo diretto adattivo via prop `inverted` in renderBlock (about/foto_testo/steps/team: cTitle/cBody). Editor: BlockStylePanel opzioni + pannello immagine (Unsplash/upload/url + velo). Verificato a video su pagina test 'prova': sezione scura (titolo bianco+testo chiaro+card chiare che staccano), sfondo immagine con velo, sezione chiara invariata. VERIFICA DB via mksec.mjs (service role), pagina poi cancellata.

### ✅ FATTO (2/7 continua): colore secondario + animazioni
- **Colore secondario/accento**: theme.secondaryColor sulle 3 pagine Tema (default ''→come primario); passato a LandingBlockRenderer (prop `secondary`, `sec=secondary||primary`) da tutti i renderer + TemplatePreviewClient; usato in filetto about + badge promozioni/pacchetti. Template Fitness ha secondaryColor '#111827' (verificato: badge "Più scelto" scuro, prezzi arancioni).
- **Animazioni scroll**: LandingBlockRenderer wrappa i blocchi in div[ref], IntersectionObserver aggiunge `.in`; classe `.lbr-anim` aggiunta da JS (SSR-safe: senza JS tutto visibile); blocchi già a schermo mostrati subito (no flash); primo blocco/hero escluso. CSS in globals.css. Verificato: 0 blocchi rimasti nascosti dopo scroll.
- **Fix pacchetti/promozioni**: leggevano SOLO da mini.* (dati entità) → ora fallback su d.items → rendono anche nei template. (Prima "Abbonamenti" Fitness non appariva.)

### 🔴 INCIDENTE 2/7 (mio errore, risolto): 500 sui minisiti in prod
Il wrap animazioni faceva `cloneElement(el)` anche su blocchi che rendono `null` (blocchi vuoti) → throw in SSR → 500 su TUTTI i minisiti. Deploy mette live PRIMA dello smoke → prod 500 per ~min. Lo smoke public-render l'ha beccato. FIX: `(!el || i===0) ? el : cloneElement(...)`. Redeploy → IT/EN=200. LEZIONE: quando si clona/mappa gli elementi dei blocchi, SEMPRE gestire il caso null (molti blocchi ritornano null se vuoti).

### ✅ TUTTI E 7 I FILONI COMPLETATI (2/7):
5. **Varianti blocco**: testimonianze (grid|quote), stats (dark|plain). Campo `variant` + branch renderer + select editor.
6. **Blocchi nuovi**: `colonne` (2-3 col titolo+testo), `divisore` (spazio|linea, small/med/large), `annuncio` (striscia primary/secondary/dark + link). Catalogo+editor+renderer+icone. (Menù ristorante NON fatto: entità-driven grosso, lasciato fuori.)
8. **Anteprima live in-editor**: drawer laterale in PaginaEditorPage (toggle "👁 Anteprima") con iframe alla preview URL (?preview=1), toggle Desktop(scale 0.4 su iframe 1350)/Mobile(390 phone frame), reload al salvataggio (previewNonce). Auth-gated → build verificata, UX da Francesco.
- ⚠️ FIX BUG: `save()` NON inviava hide_header/hide_footer → i toggle opzione B non si salvavano dall'editor (verificati prima solo via REST). Aggiunti al body PATCH.

### 🎉 INIZIATIVA "profondità design" COMPLETA (7/7): sfondi sezione, unsplash ovunque, duplica blocco, secondario, animazioni, varianti, blocchi nuovi, anteprima live.
### ✅ RIFINITURE site-builder (2/7 sera, live+verificato, commit 033ae2e):
- pacchetti: usa d.titolo/d.sottotitolo se impostati (prima titolo fisso i18n) + campo sottotitolo editor.
- Nuove varianti: cta_banner (centrato|diviso testo+pulsante a lato), highlights (card|minimal).

### ✅ BLOCCO MENÙ RISTORANTE — LIVE+verificato (commit 1d3d5d6): blocco `menu` (entità-driven) riusa MenuTab; mostra i menù del ristorante sul sito (verificato su ristorante-borgo-del-lago: 3 menù selezionabili). NB fondaco-narni ha menù vuoto → blocco rende null (corretto). getRistorante include già `menu`.

## 🏁 CAPITOLO SITE-BUILDER CHIUSO (2/7)
Fatto tutto: 8 template per verticale, hero_slider, carosello, sfondi sezione dark/immagine + testo adattivo, colore secondario, animazioni scroll, varianti (testimonianze/stats/cta_banner/highlights), blocchi nuovi (colonne/divisore/annuncio/menù), duplica blocco, picker Unsplash ovunque, immagini AI, opzione B header/footer per-pagina, smart header, anteprima live in-editor. Site-builder MATURO.

## 🧩 CLOSING PACK builder (2/7 sera) — confronto vs Elementor, chiude i "dettagli mancanti"
Analisi gap fatta con Francesco: il set blocchi era ampio, mancavano controlli/dettagli. Fatto tutto il "vale la pena" + dettagli minori; NON fatto l'off-brand (colonne annidate con qualsiasi blocco, responsive per-breakpoint, tipografia per-elemento, CSS custom, canvas WYSIWYG — deliberatamente, per restare "per dummies").
Commit 74c90f5 + chunk3:
- **Capacità**: nascondi blocco su mobile/desktop (style.hide_mobile/hide_desktop + CSS), sfondo **gradiente** (primary→secondary), **stats count-up** (CountUp anima allo scroll, snap all'originale).
- **Blocchi nuovi**: accordion, HTML/embed (iframe sandbox), countdown (gate-on-mount anti-hydration), before/after (clip-path drag), social (pill etichette — lucide NON ha icone brand!), + divisore con **shape** onda/diagonale.
- **Video sfondo hero** (data.bg_video mp4).
- **Editor UX**: undo/redo (stack past/future su patchBlocks + Ctrl+Z/Y, esclude i campi testo), **copia/incolla blocco tra pagine** (localStorage lbr_block_clip: Clipboard su ogni blocco + "Incolla blocco copiato"). FIX collaterale già fatto: save() invia hide_header/footer.
- ⚠️ SKIP onesti: breadcrumbs + table-of-contents (goffi/basso valore nell'architettura a blocchi); libreria blocchi salvati backend-side (il copia/incolla localStorage copre il bisogno).
- Tutto verificato a video (chunk1/2 su pagine test 'prova' poi cancellate); undo/redo/video = editor/additivo, verifica interattiva Francesco.
- 🏁 BUILDER: ora completo "a livello Elementor" per il target SMB.

### ⏭️ PROSSIMO FRONTE (cambio tema): Stripe billing (monetizzazione, alto impatto — Stripe già installato, campi trial/subscription a DB) oppure Sentry (visibilità errori). Vedi [[project_roadmap_sprint]] Sprint 10.

### ⏭️ BACKLOG (nice to have):
- (eventuale) l'AI sceglie anche template/blocchi, non solo testi/immagini.
- Screenshot Playwright in scratchpad (temporanei).

## STATO
- ✅ **Fase A FATTA (26/6)**: `lib/siteTemplates.js` (3 template: vetrina-elegante, servizi-pro, evento — struttura+tema+contenuti esempio, forme blocco validate). API `POST /api/site-templates/apply` (auth requireEntityAccess, crea __home__ + applica theme + attiva minisito). `components/admin/SiteTemplateGallery.jsx` + tab "Template" in SitoPage (card con anteprima colori/struttura + "Usa questo template"). Verificato: 401 unauth, template renderizza su /s/prova (tutti i markers), smoke verde. Anteprima v1 = stack colorato (non live render).
- ⏭️ DA FARE: Fase B (AI fill testi/immagini al business), Fase C (wizard filtri settore/obiettivo + "Sfoglia"); upgrade anteprima a live-render; più template; collegare alla scelta "uguale vs traccia". Verificare a video l'apply dall'UI (auth).

## Piano a fasi
- **Fase A — Fondamenta**: `lib/siteTemplates.js` (set curato, struttura+tema+contenuti esempio) + API "applica template" (crea __home__ coi blocchi + tema, auth requireEntityAccess) + galleria con anteprima + "Applica" → si modifica in SitoPage.
- **Fase B — AI fill**: l'AI adatta testi/immagini del template al business ("uguale coi miei dati" / "come traccia"); estende generate-site con seed di blocchi.
- **Fase C — Wizard guidato**: domande settore/obiettivo → filtri template, integrato nel flusso AI builder; + "Sfoglia template".
