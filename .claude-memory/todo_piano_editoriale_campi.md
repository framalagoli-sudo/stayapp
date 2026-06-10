---
name: todo-piano-editoriale-campi
description: Da fare — adattamento campi piano editoriale in base al tipo di contenuto
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

Adattamento campi piano editoriale in base al tipo di contenuto selezionato.

**Why:** I tipi di contenuto (Reel, Story, Blog Post, ecc.) richiedono descrizioni, label e placeholder diversi rispetto al generico "Post".

**How to apply:** Quando si riprende il lavoro sul piano editoriale, verificare cosa resta da fare su questo task.

## Stato attuale (2026-05-28)

### Già fatto
- `TIPO_COPY` in `PostEditorialePage.jsx`: titolo pagina, label campo testo, placeholder cambiano in base a `tipoContenuto`
- Bottone "Nuovo post" → "Nuovo contenuto" in `PianoEditorialePage.jsx`

### Completato ✅ (2026-05-28)
- Label immagine dinamica per tipo (Thumbnail, Cover / immagine in evidenza, Creative / visual, ecc.)
- Sezione Canali: badge distribuzione fisso (Blog / Email / Pagina evento) + social opzionali sotto
- Confirm elimina dinamico per tipo ("Eliminare questo reel?", "Eliminare questa newsletter?", ecc.)
- ~~Migration 049~~ ✅ eseguita

**Task completato al 100%.**
