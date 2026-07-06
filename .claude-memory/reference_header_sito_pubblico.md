---
name: reference_header_sito_pubblico
description: "L'header pubblico dei minisiti è duplicato in 4 componenti guest (LandingStruttura/Ristorante/Attivita + GuestSubPage)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 844014e8-2f2a-4883-b100-4833c30dc32f
---

L'header/nav dei **siti pubblici a blocchi** è **duplicato** in 4 componenti `components/guest/`: `LandingStruttura.jsx`, `LandingRistorante.jsx`, `LandingAttivita.jsx` (le home) e `GuestSubPage.jsx` (le sotto-pagine `/p/[slug]`). Ogni modifica al nav va replicata nei 4 (candidato a estrazione di un `SiteNav` condiviso, non ancora fatto per prudenza sul rendering pubblico).

- Nav: `position: fixed`, `navVisible`/`navHidden` con `transform: translateY`. Classe `.land-nav` (o `.sub-nav`). Config da `mini.header_cfg`: `style` (light/dark), `always_visible`, `scroll_behavior` ('smart').
- **Fix 6/7 (bug logo con slider)**: il comportamento "default" nascondeva il nav in cima (appariva dopo 80px di scroll) → logo invisibile sulle pagine con hero/slider. Ora `navVisible` iniziale `true` + default sempre visibile.
- **Fix 6/7 (menu mobile)**: aggiunto **hamburger** (`.land-burger`/`.sub-burger`, ☰/✕) sotto i 768px; i link desktop hanno classe `.land-nav-desktop`/`.sub-nav-desktop` (nascosti su mobile) + menu a tendina `.land-mobile-menu`. Il burger appare solo se il menu ha contenuti (pagine o CTA).
- **Toggle lingua nell'header** (aggiornato): `components/guest/LangToggle.jsx` (🇬🇧 EN / 🇮🇹 IT) è messo INLINE nel nav dei 4 header (dopo i pulsanti, prima del burger), visibile desktop+mobile. `LanguageSwitcher.jsx` NON è più un pill flottante: ora rende `null` e fa solo l'autodetect browser + `<html lang>` (resta montato dai page.js). [Prima era `position: fixed top/right z2000` e dava fastidio → integrato nell'header su richiesta di Francesco.]
- Verificato live su prod (Bug#1 su /r/fondaco-narni desktop; Bug#2 su /s/prova mobile con pagina di test poi rimossa; toggle lingua inline su /r/fondaco-narni desktop+mobile).
