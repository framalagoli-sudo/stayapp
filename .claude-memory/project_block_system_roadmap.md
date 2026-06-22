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
- **Fase 0 — Schema stile per-blocco** (fondamenta, rischio ~0): `block.style = { bg, paddingY, align, maxWidth }` applicato da unico `BlockShell` + pannello "Stile" condiviso. Additivo/retrocompat, NESSUNA migration (JSONB in pagine.blocks). Valori da whitelist (no colore/HTML arbitrario nel DOM).
- **Fase 1 — Rich text** ✅ DECISO: **Tiptap WYSIWYG con toolbar minimale** (grassetto/corsivo/link/liste/forse H2-H3/allineamento; NIENTE colori-parola/tabelle/font inline). Markdown SCARTATO (sintassi viola la semplicità del target). Sicurezza by design: salvare **JSON strutturato** + render via schema whitelist fisso → XSS chiuso alla radice (non "ripulito dopo"). Guest riceve HTML pre-generato dallo schema. Retrocompat: testi semplici esistenti rendono come paragrafo.
- **Fase 2 — Media Library + Blocco Immagine + Galleria custom** (disaccoppia dall'app): tabella media azienda-level riusabile (migration con grant/RLS, scope per azienda no IDOR). Blocco Immagine (alt SEO/a11y + didascalia + link + larghezza/align via Fase 0); Galleria a immagini scelte; gallery-entità resta variante dinamica opt-in.
- **Fase 3 — Pulsante standalone + Sezioni predefinite (pattern)**: ⬆️ ALZATA di priorità per il target (parti da bello, non da bianco). Pattern = array di blocchi pronti, tutto frontend zero-backend. Forse anticipare subito dopo Fase 2.
- **Fase 4 — Sito autonomo**: tema per-sito come override opzionale del tema entità (default ereditato); riformulare auto-entità come "Contenuti piattaforma" con UI "+ Collega dati". Fase più architetturale, a freddo.

## Fuori scope per il target (item "da agenzia")
CSS custom per blocco/sito, editing responsive per-breakpoint → rimandati/esclusi (roba da designer, non per SMB self-serve).

## Già pari a WordPress (NON rifare)
Revisioni → Snapshot "Versioni" (Opzione B) ✅; Header/Footer builder ✅; Blog/CMS ✅; Form Builder ✅; SEO per pagina ✅; ruoli/permessi staff ✅; contenuti dinamici (auto-entità) ✅ (anzi avanti a WP base).

## Decisioni aperte
- Anticipare Fase 3 prima/dopo Fase 2 (da confermare quando partiamo).
- Convergenza editor-pagine ↔ minisito (MiniSitoPage/SitoPage hanno un loro sistema di sezioni che si sovrappone): valutare unificazione in Fase 0/4.
