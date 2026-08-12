---
name: project_header_footer_design
description: "Feature design header/footer sito: SiteNav condiviso (3 layout+hover+bottoni) + icone social; follow-up footer_cfg landmine + GuestSubPage + cleanup"
metadata:
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Richiesta Francesco (17/7): su header/footer 3 tipi di design selezionabili (logo centro/sx, menu parallelo/sotto, hover voci), + bottoni extra menu (multipli, forma/colore, link interni o manuali), + icone social coi loghi veri invece del testo.

**✅ FATTO E LIVE (17/7):**
1. **Icone social** — `lib/socialIcons.jsx` (loghi ufficiali simple-icons inline SVG, CSP-safe, currentColor; instagram/facebook/whatsapp/tripadvisor/tiktok/youtube/linkedin/x+twitter). `LandingFooter` usa icone tonde con hover invece del testo. + `safeUrl` su social/extra_links (sicurezza). Verificato su r/fondaco-narni.
2. **Header condiviso `components/guest/SiteNav.jsx`** (estratto dai 3 Landing inline → chiude backlog SiteNav). Configurabile via `mini.header_cfg`:
   - `layout`: classic (logo sx/menu dx) | centered (logo centro/menu ai lati) | stacked (logo sopra/menu sotto)
   - `hover`: underline | highlight | color | none (effetto voci menu)
   - `buttons[]`: {id,label,url,shape:pill/rounded/square, variant:solid/outline/text, color:primary/secondary/#hex} — bottoni extra in header+mobile
   - Editor in `SitoPage` card "Navigazione". Rimosso vecchio "Bottone CTA" header (era codice morto, mai reso). Default layout=classic → siti esistenti invariati.
   - Cablato in LandingStruttura/Ristorante/Attivita. Verificato live 3/3 + 66 smoke.

**✅ FOLLOW-UP COMPLETATI (17/7):**
- ✅ **#1 GuestSubPage** cablato a SiteNav (header coerente home/sottopagine). Aggiunto prop `currentSlug` a SiteNav (evidenzia pagina corrente in grassetto).
- ✅ **#2 Cleanup**: rimosso tutto il codice nav morto nei 3 Landing + GuestSubPage (state, scroll effect, consts navBg/navDark/…, CSS .land-nav/.sub-nav, import LangToggle). Verificato: land-nav residuo=0 live.
- ✅ **#3 FOOTER landmine RISOLTA**: `LandingFooter` ora legge `footer_cfg` (editor SitoPage) con fallback al `footer` legacy. Diagnosi confermata sui dati: inlingua/metodotvb avevano footer_cfg IGNORATO (LandingFooter leggeva footer=undefined→default). Ora supporta layout minimal/standard/full + stile dark/light (bg/testo/bordi adattivi) + toggle contatti/social/descrizione + copyright + extra_links. Verificato live: struttura-test→light rende #f6f6f8; legacy (fondaco) e default restano #1a1a2e (no regressione).
- **Fix centrato (17/7)**: layout 'centered' duplicava le voci (menu completo sx + metà dx) → poi le allineava ai bordi. Risolto: gruppo [metà-sx | logo | metà-dx] centrato, azioni a destra con spacer 1fr bilanciante.

- ✅ **Footer allineamento (17/7)**: aggiunto `footer_cfg.align` (left|center). Centrato = logo/nome/descrizione/social/link/contatti/copyright tutti centrati (single column). Selettore "Allineamento" nell'editor footer. Verificato live. Default left.

- ✅ **Scelta logo nella PWA app (18/7)**: l'header delle 3 PWA (GuestApp/RestaurantApp/AttivitaPWA) ha SEMPRE sfondo scuro (cover con velo o colore primario, testo bianco) ma mostrava sempre `logo_url` (per sfondo chiaro) → logo scuro invisibile. Il `logo_dark_url` (negativo) esisteva ma solo il SITO lo usava, non le app. Fix: `lib/appLogo.js` `pickAppLogo(entity, mini)` legge `minisito.app_logo`: auto (default→negativo se caricato) | light | dark. Applicato ai 2 header di ogni PWA. Selettore "Logo nell'app ospite" nelle pagine logo (PropertyGallery/Ristorante-Info/Attivita-Info). Verificato live (garage22 ora usa il negativo). NB: default auto CAMBIA le app che hanno gia' un logo negativo (ora lo mostrano — comportamento corretto).

- ✅ **Colore icone personalizzabile (18/7)**: le icone lucide (~58 `color={primary}`) ora usano una **CSS var con fallback**: `` color={`var(--icon-color, ${primary})`} `` (fatto con script Node, replace globale). `--icon-color` impostata UNA VOLTA sul root di ogni PWA (g/r/a-shell) e sul wrapper `ref={animRef}` di LandingBlockRenderer, da `theme.iconColor` → via **CSS cascade** raggiunge tab/helper/blocchi senza propagare prop (niente threading). Vuoto = ricade su primary (nessun cambiamento). Editor: sezione "Colore icone" nelle 3 pagine Tema con **preset** (Principale/Secondario/Bianco/Scuro) + **color picker** + **campo hex**. Verificato live (app: var su shell + icone usano var; sito: var sul wrapper blocchi). **Pattern riutilizzabile** per futuri temi: CSS var + fallback = zero prop threading. Pagine dettaglio standalone (Offerta/Pacchetto) ricadono su primary (dentro le app ereditano comunque via cascade).

- ✅ **Colore icone PER-BLOCCO (18/7)**: oltre al colore icone globale del tema, ogni blocco del sito puo' scegliere il proprio (positivo/negativo o custom). `block.style.iconColor` (chiave preset primary/secondary/dark/light o hex) → in `lib/blockTypes.js applyBlockStyle` diventa `--icon-color` sul wrapper del blocco → le icone dentro lo ereditano (var CSS, override del globale). Editor: select "Colore icone" nel BlockStylePanel di PaginaEditorPage (+ picker se Personalizzato). Sfrutta lo stesso meccanismo var. Verificato live (blocco con --icon-color custom). NB: era la richiesta vera di Francesco ("icone positivo/negativo, scelta di blocco in blocco").

- ✅ **Home "Crea a mano" + verifica AI builder (18/7)**: (#1) l'AI Site Builder NON è super-only — admin_azienda lo vede nel menu entità (`AdminLayout` SitoAppLinks→renderSubs, iniettato dopo "Sito web", riga ~273) e la pagina `AiSiteBuilderPage` non ha gating di ruolo. Solo il link nel menu piatto super (riga ~439) è dentro `{isSuperAdmin}`. Nessun fix necessario. (#2) Aggiunto in SitoPage bottone **"Crea a mano"** accanto a "Crea con AI": `createBlankHome()` fa POST /api/pagine con `slug:'__home__'` (la route accetta slug, authz requireEntityAccess) → apre l'editor blocchi visuale. Prima la home si poteva creare solo via AI/documento.

**🔜 Refinement residui (bassa priorità, non richiesti):**
- Link interni bottoni header lang/dominio-aware (come siteHref nel renderer); ora usano safeUrl(url) grezzo.
- Campi header morti residui in DEFAULT_HEADER (show_cta/cta_text/cta_url) — inerti, cleanup minore.

**Tranello commit**: messaggi git con `"..."` (virgolette doppie) dentro `-m "..."` rompono in bash → usare `git commit -F -` con heredoc.
