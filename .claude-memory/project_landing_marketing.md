---
name: project_landing_marketing
description: "La landing marketing OltreNova (/) è hardcoded in LandingPage.jsx, NON a blocchi — palette e contatti decisi con Francesco"
metadata: 
  node_type: memory
  type: project
  originSessionId: 844014e8-2f2a-4883-b100-4833c30dc32f
---

La landing marketing di OltreNova (route `/` → `app/page.js` → `components/public/LandingPage.jsx`) è **hardcoded** (JSX + inline styles, ~960 righe), NON block-based e NON nel DB. Francesco ha valutato e **scartato** la rigenerazione a blocchi ("non ha grafici come quella di ora") → tenerla hardcoded, non riproporre di convertirla.

**Palette (2026-07-02)**: base **nero / bianco / blu petrolio (#0E4F5C) / ocra (#CC8A2C)**, sezioni alternate; accento che spicca = **sfumato "instagram" arancio→rosa→fucsia** (`linear-gradient(135deg,#FA8E3C,#F4406D,#C837AB)`, costante `INSTA`) su CTA, titolo hero "Molto oltre.", card AI e sezione "Per qualsiasi attività con clienti" (#perchi, sfondo = gradiente, `SecHead light`). Costanti palette centralizzate in cima al file.

**Contatti** (costanti `WA_NUMBER`/`EMAIL` in cima): WhatsApp **+393939822698**, email **oltrenova@gmail.com** (mai fra.malagoli@gmail.com sulla landing), **P.IVA 01630670550** nel footer (obbligo di legge).

⚠️ Gli smoke test (`deploy.ps1`) NON coprono `/`: dopo modifiche alla landing verificare a mano `https://www.oltrenova.com/` (200 + contenuti nell'HTML). L'endpoint `/api/landing-seo` dà 500 in locale (manca DB) → badge "1 error" dev innocuo, la pagina lo cattura.
