---
name: feedback-icone-flat
description: "Tutte le icone lucide-react devono avere strokeWidth={1.5} — stile flat dell'applicazione"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

Tutte le icone `lucide-react` devono usare `strokeWidth={1.5}` senza eccezioni.

**Why:** È la convenzione di stile flat dell'intera applicazione OltreNova. L'utente non vuole doverlo specificare ogni volta.

**How to apply:** Ogni volta che scrivo un'icona lucide-react — in qualsiasi componente, pagina o file — uso sempre e solo `strokeWidth={1.5}`. Non usare mai strokeWidth={2}, strokeWidth={2.5}, strokeWidth={3} o altri valori.
