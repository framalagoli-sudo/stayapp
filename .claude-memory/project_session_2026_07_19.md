---
name: project_session_2026_07_19
description: "Sessione 19-20/7 — blocchi sito: ancore, video testo, recensioni(logo+carosello), gallery(formato+carosello), promozioni carosello frecce, home slug blindato + 'Rendi home', menu ristorante filtrato, hero sotto-pagina, slug entità"
metadata:
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Lunga sessione di micro-feature/fix sui blocchi del sito. Tutto LIVE + smoke 66/66. Dettaglio in [[project_header_footer_design]] e [[reference_slug_entita_modificabile]].

**Fatti (in ordine):**
- **Blocco menù ristorante**: c'è nel sito (non solo app), pesca entity.menu; filtrato nel BlockPicker per SOLI ristoranti.
- **Àncore per-blocco**: campo "Àncora" nel pannello Stile → id sul blocco (applyBlockStyle) + scrollMarginTop 80px; le àncore della pagina entrano in internalLinks → LinkPicker le offre come #ancora. safeUrl (renderer/SiteNav/footer) ora ammette '#'.
- **Blocco video**: aggiunti titolo + testo opzionali (sopra il video).
- **Recensioni (testimonianze)**: campo Fonte (Google/TripAdvisor) → logo (lib/reviewLogos.jsx); variante Carosello; fix stelle (leggeva t.stars, ora t.rating). Aggiunto tipo 'select' a ItemListEditor.
- **Gallery**: formato foto (classic 16:9 / square 1:1 / card 9:16) + disposizione griglia/carosello.
- **Promozioni**: "quante per riga" (2/3/4) + ArrowCarousel (frecce ‹›, mobile slider); 1 sola promo → centrata.
- **CAROSELLO unificato** (ArrowCarousel in components/LandingBlockRenderer.jsx): usato da gallery/recensioni/promozioni; frecce che si disabilitano ai bordi, overflow rilevato con ResizeObserver+rAF+scroll; **scrollbar nativa NASCOSTA** (classe .lbr-carousel) — prima sembrava un iframe scrollabile.
- **Home slug BLINDATO**: __home__ non modificabile (titolo non lo tocca + campo disabilitato) → non si rompe più. Azione **"🏠 Rendi home"** in SitoPage (promuove una pagina a __home__, demota la vecchia). RECUPERATA la home di deborahresinart (slug era stato cambiato → 6 blocchi orfani rimessi a __home__).
- **SEO home**: fonte unica = tab "SEO & Impostazioni"; nell'editor pagina __home__ campo SEO nascosto con nota (Opzione A).
- **Hero primo blocco**: sotto-pagina ora full-bleed sotto l'header come la home (niente padding-top se primo blocco è hero/hero_slider).
- **Slug ENTITÀ**: SCOPERTO che È modificabile (Info → "URL pubblica") — la doc CLAUDE.md diceva il falso, corretto in [[reference_slug_entita_modificabile]]. Manca solo redirect vecchio→nuovo (QR stampati si rompono) — upgrade proposto, non fatto.
- **Footer logo O nome** (non entrambi, come header). **Home fuori dal menu** header (API guest/pagine esclude __home__).

**▶️ RIPRESA (dalla mia ultima domanda a Francesco)**: i caroselli. Ho nascosto la scrollbar nativa (sembrava un iframe). Francesco deve **ricaricare (Ctrl+F5) e dirmi se ora l'aspetto va bene**, e SE NO: quale blocco (gallery/recensioni/promozioni), desktop o mobile, e cosa vede di sbagliato. Offerto di preparare una pagina di prova con quei blocchi.
