---
name: reference_link_interni_renderer
description: Come i link interni dei blocchi diventano lingua/dominio-aware nel renderer pubblico (base + siteHref)
metadata: 
  node_type: memory
  type: reference
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

I campi URL dei blocchi (editor: `PaginaEditorPage` + `SitoPage`, selettore `components/admin/LinkPicker.jsx`) salvano **path assoluti piani** `/{s|r|a}/{slug}/p/{pageSlug}` (+ `/privacy`, `/cookie`, home = base).

`LandingBlockRenderer` li rende lingua/dominio-aware così:
- riceve la prop **`base`** (calcolata dai call-site con `entityBasePath(prefix, slug, domain, lang)` — vuota su dominio custom, `/en/...` in EN, `/{prefix}/{slug}` su vercel IT). Passata da `LandingStruttura/Ristorante/Attivita` e `GuestSubPage`; `TemplatePreviewClient` NON la passa → fallback all'URL canonico.
- `linkBase = base ?? fallback`; `homeUrl = linkBase || '/'`.
- helper `siteHref(u)`: rimappa SOLO i path interni all'entità con regex `/^(?:\/en)?\/(?:s|r|a)\/[^/?#]+(.*)$/` → `linkBase + resto`. Esterni (http, tel:, mailto:, #, `/blog`, ecc.) passano invariati. È idempotente e normalizza anche i vecchi valori con `/en`.

Ogni `href={...}` di URL salvato nei blocchi passa da `siteHref(...)`. Verificato live 2026-07-07: `/en/a/metodotvb` → bottone `/en/a/metodotvb/p/contatti` (IT resta `/a/...`).

⚠️ NON toccato: `offerteBase`/`pacchettiBase` (route dettaglio offerte/pacchetti) restano `/{prefix}/{slug}/...` hardcoded — le route `/en` di quei dettagli non sono verificate, quindi non prefissarle a cuor leggero. Vedi [[reference_header_sito_pubblico]] e [[project_multilingua_roadmap]].
