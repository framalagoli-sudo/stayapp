---
name: project_block_system_roadmap
description: "Roadmap evoluzione block system del sito (editor pagine CMS) — fasi 0-4, disaccoppiamento app/sito"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2a1be9ea-f8b0-46bd-9c9b-087bb6fdbfb5
---

Roadmap per evolvere il block system del sito (editor pagine CMS: `PaginaEditorPage.jsx`, `lib/blockTypes.js`, renderer `PaginaPage.jsx`). Decisa con Francesco il 22/6 dopo analisi vs competitor + WordPress. Filtro guida: [[project_positioning_target]] (SMB self-serve ≤€100/mese, semplicità).

## Stato attuale (analisi 22/6)
24 blocchi in 5 gruppi. Editor: drag&drop handle-only, picker, SEO per pagina, upload immagini, AI sul testo about, bozza/pubblicata, preview. **Lacune chiave:** testi = stringa semplice (solo a-capo via `pre-line`, NIENTE rich-text); stile quasi solo dal tema globale dell'entità (per-blocco: solo Hero overlay/altezza + foto_testo inverti); galleria pesca SOLO foto entità; nessuna media library; sito = "specchio dell'app", non autonomo.

## Principio architetturale (chiave di volta, deciso da Francesco)
I blocchi auto-entità (Servizi/Galleria/Eventi/...) NON sono "dell'app": sono **contenuti della PIATTAFORMA** (livello entità/azienda), una sola fonte di verità che **sia app sia sito richiamano**. Direzione: **sito autonomo di default, binding ai dati piattaforma OPT-IN** (non l'unico modo di riempire una pagina) → niente doppia manutenzione, e copre sia chi usa l'app sia chi vuole solo il sito.

## Principi trasversali (ogni fase)
- **Sicurezza:** route scopate per azienda (requireEntityAccess/resolveAziendaId, no IDOR); migration con GRANT espliciti + RLS (nota 19 CLAUDE.md); rich-text sanitizzato; upload validati (tipo/size).
- **Pulizia:** stile per-blocco in UN wrapper comune (`BlockShell`), non nei case; rich-text = un componente unico riusato; convergere editor-pagine e minisito invece di duplicare.
- **Performance:** editor rich-text SOLO admin (dynamic import), mai nel bundle guest; immagini lazy + responsive; rendering pubblico SSR-friendly + paginare la media library.

## Fasi (ognuna rilasciabile + 45/45 smoke)
- **Fase 0 — Schema stile per-blocco** ✅ FATTO (22/6, LIVE, commit a207201, 45/45 smoke). `block.style = { bg, paddingY }` additivo/retrocompat, NESSUNA migration (JSONB in pagine.blocks). Helper condiviso `applyBlockStyle` in `lib/blockTypes.js` applicato in ENTRAMBI i renderer (`PaginaPage` sotto-pagine + `LandingBlockRenderer` home/GuestSubPage) — un solo punto via cloneElement, no riscrittura dei case. Pannello "Stile sezione" in `PaginaEditorPage` (`BlockStylePanel`). Valori da whitelist. **Spedito = sfondo (solo tinte CHIARE white/light/muted, escluso su hero/stats/cta_banner/video per leggibilità) + spaziatura verticale** (preserva padding orizzontale nativo). **Rimandati** (servono colori-contenuto ereditati): sfondo scuro/colorato, allineamento, larghezza max.
- **Fase 1 — Rich text** ✅ FATTO (22/6, LIVE, commit f5ef450, 45/45 smoke al re-run). Applicato a **`about.text` + `foto_testo.text`** (gli altri campi item restano plain per ora). Riusato `components/admin/RichTextEditor.jsx` esteso con `format='json'` + `minimal` (blog INVARIATO, continua HTML); toolbar essenziale B/I/H2/H3/liste/link; Link a protocolli sicuri http/https/mailto/tel. Storage = **ProseMirror JSON**. Render guest = nuovo **`lib/richText.jsx`** (`RichText`, `richIsEmpty`, `isRichDoc`): walker JSON→React con whitelist nodi/marks, href validati, **NESSUN dangerouslySetInnerHTML → zero XSS, guest senza Tiptap**. Retrocompat: stringhe legacy rese come `<p>` pre-line. Wired in `PaginaPage` + `LandingBlockRenderer` (+ guard `richIsEmpty`). NB: il blog (`ArticoloPage`) renderizza ancora HTML grezzo con dangerouslySetInnerHTML senza sanitize — debito noto, non toccato (annotato in [[todo_prossima_sessione]]).
- **Fase 1.5 — Tipografia** ✅ FATTO (22/6, LIVE, commit b06c19d, smoke verdi). Su Blocco testo + Foto+Testo: **allineamento** (TextAlign in toolbar, per paragrafo/titolo, vale anche per blog), **dimensione testo** (preset Piccolo/Normale/Grande, scala sul base) e **colore testo** (palette ristretta: dark/grey/primary-tema, no picker libero) — gli ultimi due in `block.style` (`textSize`/`textColor`), nel pannello "Stile sezione" solo per blocchi con testo (`blockHasText`). Helper in `lib/blockTypes.js` (`textSizeScale`, `textColorFor`). Walker applica textAlign. **Font per-blocco SCARTATO** (design): il font resta del tema.
- **Fase 2 — Immagine + Galleria custom** ✅ FATTO core (22/6, LIVE, commit a8a0fbe + 4b27a4d, 45/45). DECISIONE: niente tabella media/migration — gli URL si salvano nel blocco via upload Storage esistente. **Blocco `immagine`** (image_url+alt+caption+link+larghezza piena/grande/media/piccola). **Blocco `galleria_immagini`** (griglia 2/3/4 colonne, alt per img, titolo); la vecchia `gallery` rinominata "Galleria foto (app)" = variante dinamica entità. Editor in PaginaEditorPage, render in PaginaPage + LandingBlockRenderer. Disaccoppiamento immagini sito↔app raggiunto. **Parte 3 OPZIONALE non fatta:** media library "sfoglia/riusa" upload passati (richiederebbe listing Storage) — nice-to-have, non blocca.
- **Fase 3 — Pulsante standalone + Sezioni predefinite (pattern)**: ⬆️ ALZATA di priorità per il target (parti da bello, non da bianco). Pattern = array di blocchi pronti, tutto frontend zero-backend. Forse anticipare subito dopo Fase 2.
- **Fase 4 — Sito autonomo**: tema per-sito come override opzionale del tema entità (default ereditato); riformulare auto-entità come "Contenuti piattaforma" con UI "+ Collega dati". Fase più architetturale, a freddo.

## Fuori scope per il target (item "da agenzia")
CSS custom per blocco/sito, editing responsive per-breakpoint → rimandati/esclusi (roba da designer, non per SMB self-serve).

## Già pari a WordPress (NON rifare)
Revisioni → Snapshot "Versioni" (Opzione B) ✅; Header/Footer builder ✅; Blog/CMS ✅; Form Builder ✅; SEO per pagina ✅; ruoli/permessi staff ✅; contenuti dinamici (auto-entità) ✅ (anzi avanti a WP base).

## Coppie di font curate ✅ FATTO (22/6, LIVE, commit 363a45a, 45/45)
`lib/fonts.js` (HEADING_FAMILIES/BODY_FAMILIES + 6 coppie: Elegante/Raffinato/Moderno/Minimal/Friendly/Pulito) + `components/admin/FontPairPicker.jsx` condiviso. Sezione "Abbinamenti consigliati" aggiunta sopra i selettori font nelle 3 pagine Tema (property/ristorante/attivita) — un click imposta fontHeading+fontBody. Selettori singoli restano come avanzato. NB: i selettori singoli locali (HEADING_FONTS/BODY_FONTS) NON sono stati centralizzati (restano duplicati nelle 3 pagine) — cleanup futuro possibile.

## Decisioni aperte
- Anticipare Fase 3 prima/dopo Fase 2 (da confermare quando partiamo).
- Convergenza editor-pagine ↔ minisito (MiniSitoPage/SitoPage hanno un loro sistema di sezioni che si sovrappone): valutare unificazione in Fase 0/4.
