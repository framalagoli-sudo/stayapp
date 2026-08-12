---
name: reference_slug_entita_modificabile
description: "CORREZIONE: lo slug ENTITÀ È modificabile (Info → card 'URL pubblica'), la doc diceva il falso"
metadata:
  node_type: memory
  type: reference
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

⚠️ **La nota in CLAUDE.md "Slug: generato alla creazione, non modificabile dopo" è FALSA/obsoleta.** Lo slug dell'entità (struttura/ristorante/attività) È **modificabile** dall'admin nella pagina **Info → card "URL pubblica"** (`AttivitaInfoPage`/`PropertyInfoPage`/`RistoranteInfoPage`: input slug + bottone "Salva URL" → `handleSlugSave` → `save({ slug })`). slugify applicato; se lo slug è già preso, errore a video.

**Il vero limite**: NON c'è redirect dal vecchio slug → i QR già stampati / link condivisi col vecchio slug si rompono dopo il cambio (la card avvisa "aggiorna il QR code"). Per il caso "typo appena creato, niente ancora distribuito" → cambio slug = zero problemi.

**Upgrade proposto a Francesco (18/7, non ancora fatto)**: "cronologia slug + redirect 301" — colonna old_slugs (o tabella) + resolver guest che redirecta vecchio→nuovo, così anche QR/link già distribuiti non si rompono mai. Da fare se Francesco conferma.

**Slug PAGINA**: la home ha slug fisso `__home__` (ora BLINDATO in PaginaEditorPage: titolo non lo tocca + campo disabilitato). Azione "🏠 Rendi home" in SitoPage promuove una pagina a __home__ (demota la vecchia). Vedi [[project_header_footer_design]].
