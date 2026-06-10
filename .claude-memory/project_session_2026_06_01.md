---
name: session-2026-06-01-domini
description: "Session 2026-06-01 — chatbot in bottom nav, multi-menu ristorante, fix sistema domini custom completo"
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

## Completato in questa sessione

### Feature: Chatbot in bottom nav (GuestApp + RestaurantApp)
- Rimosso floating widget dall'header
- Aggiunto tab "Chat" nel menu in basso
- ChatbotWidget ora accetta prop `embedded=true` → pannello full-page bianco, no close button
- Pattern `display:none` per preservare stato messaggi quando si cambia tab

### Feature: Toggle tab "Richiesta" in GuestApp
- Aggiunto `module: 'reception'` al tab Richiesta in BASE_NAV
- Si nasconde se `modules.reception` è false (toggle in admin moduli)

### Feature: Multi-menu ristorante
- Admin `RistoranteMenuPage`: modalità multi-catalogo con CRUD cataloghi + conversione "Multi-menu →"
- Formato: `menu[0].type === 'catalogo'` → multi; altrimenti legacy
- PWA `RestaurantApp` MenuTab: home macro-bottoni per catalogo → drill-down con back
- Placeholder campo "Nome *" (non "Nome piatto *") per supportare drink/bevande

### Fix sistema domini — serie di bug risolti
1. **DominiPage UX redesign**: step indicator visivo, DNS instructions sempre visibili, banner obiettivo www→pagina
2. **Verify endpoint bug**: server usava GET invece di POST a Vercel `/verify` → dominio mai verificato
3. **VERCEL_TOKEN mancante in Railway**: senza token i domini non venivano registrati in Vercel → DEPLOYMENT_NOT_FOUND
4. **Re-registration**: se `vercel_domain_id` è null, il verify ora registra prima il dominio in Vercel
5. **resolve-domain www/non-www**: cerca entrambe le varianti (Vercel redirige apex→www)
6. **URL pulito su domini custom**: App.jsx ristrutturato con `CustomDomainRoutes` — entità renderizzata direttamente a `/` senza cambiare URL
7. **Wildcard `*.oltrenova.com`**: NON funziona con Cloudflare (richiede nameserver Vercel) → ogni sottodominio va registrato individualmente
8. **createDefaultSubdomain**: ora chiama API Vercel per ogni nuovo sottodominio
9. **Pulsante "Sincronizza sottodomini"** in Impostazioni (super_admin) per registrare entità esistenti

## Stato attuale domini

- `fondaconarni.com` → attivo ✅ (SQL UPDATE stato='attivo' eseguito manualmente)
- `fondaco-narni.oltrenova.com` → da sincronizzare con pulsante Impostazioni → Sincronizza sottodomini
- Wildcard `*.oltrenova.com` rimosso da Vercel (non compatibile con Cloudflare)
- Cloudflare: `*` CNAME → `cname.vercel-dns.com` (proxy ON) aggiunto
- SSL mode Cloudflare: da impostare su "Full"

## Architettura custom domain (finale)

- `DomainDetector` rimosso; logica ora in `useEffect` in `App`
- `_isCustomDomain` calcolato sincrono a module-level → no flash su www.oltrenova.com
- `CustomDomainRoutes` renderizza entità + sub-pagine (privacy/cookie/newsletter/pagine) con path esistenti
- `GuestApp`, `RestaurantApp`, `AttivitaApp` accettano prop `forceSlug` che sovrascrive `useParams()`

**Why:** evitare URL `/r/fondaco-narni` visibile su domini custom — cliente vede solo `www.fondaconarni.com`

## Pending

- Eseguire "Sincronizza sottodomini" in Impostazioni per registrare entità esistenti su Vercel
- Impostare SSL Cloudflare → "Full" se non già fatto
