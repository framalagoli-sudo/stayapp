---
name: project_session_2026_07_20
description: "Sessione 20/7 — IconPicker visuale (griglia icone cercabile nei blocchi) + Punto focale foto hero/slider/sfondo sezione (responsive, object-position/background-position)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 165ce5f9-511b-40fa-b628-fa6fa4ab6a6d
---

Due feature UX sui blocchi del sito. Tutto LIVE + smoke 66/66 + build verde. Segue [[project_session_2026_07_19]].

**1. IconPicker visuale** (i campi icona mostravano solo testo — "l'utente non ci capisce nulla"):
- `lib/blockIcons.jsx`: `BLOCK_ICONS` = ~44 icone lucide con label italiane; le CHIAVI coincidono con `HIGHLIGHT_LUCIDE` del renderer (così il valore salvato si vede). `blockIconEntry(key)`.
- `components/admin/IconPicker.jsx`: bottone con icona corrente + X per pulire + popover con ricerca e griglia cliccabile (`repeat(auto-fill, minmax(48px,1fr))`), chiude su click fuori.
- In `PaginaEditorPage` ItemListEditor: tipo campo `icon` → `<IconPicker>`; convertiti 3 campi (erano text con placeholder 'star'/'check-circle').
- I servizi PWA (`ServicesSection.jsx`) avevano GIÀ una griglia visuale (SERVICE_ICONS emoji) — non toccati.

**2. Punto focale foto** (richiesta: hero/sezioni belle su desktop E mobile — scelto "punto focale" tra le 3 opzioni proposte, non doppio upload):
- Problema: `object-fit/background: cover` ritagliava sempre dal centro → su mobile il soggetto veniva tagliato.
- `components/admin/FocalPointPicker.jsx` (NEW): anteprima cliccabile, salva `"x% y%"`; default `50% 50%`.
- Applicato: **hero** `d.focal` → `objectPosition`; **hero_slider** per-slide `s.focal` → `objectPosition`; **sfondo sezione** `st.bg_focal` → `background-position` in `resolveBlockBg` (`lib/blockTypes.js`, sostituito `center` con `${pos}`).
- Default assente = `center` → nessun sito esistente cambia (smoke conferma). Hint "Consigliato: orizzontale, almeno 2000×1200 px" accanto all'upload hero.
- Verifica visiva = anteprima live in-editor (Desktop/Mobile), non curl (render client-side).

**Nota tecnica**: `objectPosition`/`background-position` è l'approccio giusto per crop responsive con una sola immagine (vs doppio upload desktop/mobile) — filtro target SMB [[project_positioning_target]]: una foto + un clic.
