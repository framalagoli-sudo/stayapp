---
name: project_session_2026_06_18
description: "Session 2026-06-18: ristrutturazione CLAUDE.md (client-next + globale) + rollout brand completo (favicon, icone PWA, OG, logo in admin/login/landing/auth/email). Principio white-label email."
metadata:
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## CLAUDE.md ristrutturati
- **`client-next/CLAUDE.md`** creato (frontend LIVE Next): App Router, SSR via guest-data, guestFetch vs apiFetch, lezioni cache (no-store/force-dynamic), JSONB minisito/theme, GDPR, anti-spam form. Root CLAUDE.md ora punta a client-next; `client/CLAUDE.md` marcato DISMESSO (vecchio Vite).
- **`~/.claude/CLAUDE.md` globale** "Come lavoro con Francesco" creato (vale per tutti i progetti): lingua IT, no piaggeria, no inventare dettagli, root cause prima del deploy, modifiche minime, git add -A solo dopo status, test = quelli del progetto (no TDD assunto). **Backup in repo** `.claude-memory/CLAUDE.global.md` + step di recovery in CLAUDE.md root. Nato analizzando il CLAUDE.md di un collega (Riccardo) e scartando ciò che cozzava (TDD obbligatorio, branch WIP, Rule#1 massimalista). Vedi [[feedback_diagnosi_prima_del_deploy]].

## Brand OltreNova — rollout completo
- **Favicon**: era il default di create-next-app (`app/favicon.ico`, logo Next/Vercel) servito ovunque → rimosso, brand reale dichiarato in `app/layout.js` (`metadata.icons` + `metadataBase` + `openGraph`).
- **Asset brand** in `client-next/public/brand-src/` (forniti da Francesco via Claude Design: monogram, favicon 192/512, logo horizontal/stacked, social 1200x630, varianti light/dark). Copiati ai posti giusti: `favicon.png`, `icons/{icon-192,icon-512,apple-touch-icon}.png`, `og-image.png`.
- **Logo**: `public/logo-ondark.png` (BIANCO, per sfondi scuri) e `public/logo-onlight.png` (NERO, per sfondi chiari). Versioni **trasparenti definitive** fornite da Francesco (`brand-src/logo-horizontal-{white,black}-transp.png`, 1920x600). Inseriti in: sidebar+barra mobile admin, navbar landing (ondark), login + pagine auth forgot/reset/accept-invite/signup (onlight). Dimensione +20% rispetto al primo inserimento.
- **Email di piattaforma** (→ titolare, logo hosted `https://www.oltrenova.com/logo-onlight.png`): reset password, invito, re-invito, footer notifica (`lib/email-template.js`).

## ⚠️ PRINCIPIO WHITE-LABEL (importante, riusabile)
Le email/touchpoint **business→cliente finale** (newsletter, conferma iscrizione, autoresponder form, ecc.) portano il brand del **CLIENTE**, MAI quello di OltreNova. Mettere il nostro logo lì = far vedere "OltreNova" ai clienti dei nostri clienti → sbagliato per un SaaS white-label. Il logo OltreNova va SOLO nei touchpoint piattaforma→titolare (reset, invito, notifiche admin) o sulla piattaforma stessa (admin/login/landing). Un eventuale "Powered by OltreNova" discreto nelle email cliente è una scelta di prodotto da fare apposta.

## 🔴 Fix service worker stale → pagine bianche (fine sessione, campagna live)
Collega vedeva **pagina bianca su Chrome, ok su Edge** (stesso motore → non è il codice). Causa: `next-pwa` registrava un SW (`PWARegister` → `/sw.js`) che **precacheava lo shell** con hash di chunk specifici; dopo i tanti deploy gli hash cambiano e su browser con visite precedenti il SW serviva una versione rotta → bianco. **Problema RICORRENTE** (già emerso, vedi [[project_session_2026_06_08b]] "SW stale").
**Fix**: (1) `next-pwa` **disabilitato** (`disable: true` in next.config), (2) `public/sw.js` ora è un **kill-switch** committato (si auto-distrugge: svuota cache, `unregister`, ricarica le tab) — i browser ricontrollano `/sw.js` a ogni navigazione quindi anche quelli incastrati si ripuliscono, (3) `PWARegister` ora **disiscrive** invece di registrare. `/public/sw.js` tolto da .gitignore. Verificato live: /sw.js = kill-switch 1KB, pagina 200.
⚠️ **Trade-off**: la PWA installabile/offline è DISABILITATA. Ri-abilitarla in futuro SOLO con strategia **NetworkFirst** per la navigazione (mai precache dello shell servito stale). È in [[todo_prossima_sessione]].
**Lezione**: un SW che precachea lo shell di un'app che deploya spesso = pagine bianche garantite. Per un sito che cambia spesso, SW solo NetworkFirst o niente SW.

## Note tecniche
- Loghi forniti da design spesso hanno **sfondo opaco** (pecetta su superfici colorate): servono transparent-background o SVG. Se monocromatici si possono rendere trasparenti via luminanza→alpha (fatto al volo con jimp `--no-save`, poi ripristinato package.json). Ma meglio chiedere a Francesco l'export trasparente.
- Favicon/logo: i browser le cachano aggressivamente → serve hard refresh per vederle aggiornate.
- Convenzione naming: `logo-ondark` = logo da mettere SU sfondo scuro (quindi bianco); `logo-onlight` = su sfondo chiaro (nero).
