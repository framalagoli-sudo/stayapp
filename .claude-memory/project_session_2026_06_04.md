---
name: project-session-2026-06-04
description: "Session 2026-06-04 — AI Site Builder fix icone flat, attività in EntitySelector, deploy"
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

## Completato in questa sessione

### AI Site Builder — fix icone flat
- Tutte le emoji (🎯💰✨📅🖼️🎪🏨🍽️💼💪🚀🛒🏥💆) sostituite con icone Lucide flat
- Obiettivi: Target, Tag, Star, Calendar, Briefcase, Users
- Preset settore: Home, Utensils, Briefcase, Activity, Globe, ShoppingCart, Heart, Sparkles
- EntitySelector: Home (struttura), Utensils (ristorante), Activity (attività)
- strokeWidth={1.5} su tutte le icone
- Feedback salvato in memoria: non usare mai emoji al posto di icone Lucide

### AI Site Builder — attività in EntitySelector
- Aggiunto fetch `/api/attivita` in parallelo con strutture e ristoranti
- Attività ora appaiono nella lista con icona Activity

### Commits deployati
- `eb23517` — strokeWidth 1.5 + attività EntitySelector
- `94383cc` — emoji → icone Lucide flat
- Entrambi live su oltrenova.com ✅

**Why:** Coerenza visiva con il resto dell'admin OltreNova (stile flat Lucide ovunque).
**How to apply:** Regola salvata in feedback_icone_flat.md — non usare mai emoji in componenti admin, sempre icone Lucide strokeWidth={1.5}.
