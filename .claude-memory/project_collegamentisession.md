---
name: project-collegamenti-session
description: "Fix e feature completati nella sessione 2026-05-25/26 — CollegamentiSection, wizard azienda, PropertyInfoPage refactor"
metadata: 
  node_type: memory
  type: project
  originSessionId: cec93190-01ca-4d21-8dee-f2fbb856e166
---

## Fix e feature completati

**CollegamentiSection — attività (server)**
- `enrichLinks` in `server/src/routes/collegamenti.js` ora gestisce `attivita` (oltre struttura/ristorante)
- `collegamento_id` separato da `entity.id` per evitare override dallo spread
- Client `CollegamentiSection.jsx` usa `collegamento_id` per unlink e gestisce duplicate-key con fallback a `load()`

**Super_admin — profilo contaminato**
- `profile.role` era NULL e `azienda_id` era settato all'azienda TVB per fra.malagoli@gmail.com
- Fix SQL: `UPDATE profiles SET role = 'super_admin', azienda_id = NULL WHERE id = (SELECT id FROM auth.users WHERE email = 'fra.malagoli@gmail.com')`
- `AziendaContext` ora ha early return per super_admin — non carica mai entità di clienti
- **Why:** onboarding wizard aveva sovrascritto profile.azienda_id del super_admin

**Wizard nuova azienda (2 step)**
- `AziendePage.jsx` — dopo creazione azienda va a step 2 con card colorate per ogni modulo attivo
- `MODULO_CONFIG` array estensibile in cima al file per aggiungere futuri tipi (libero professionista, studio, ecc.)
- Ogni card porta a creazione entità + redirect diretto alla gestione

**Moduli aziende — attività mancante**
- SQL per aggiungere chiave mancante: `UPDATE aziende SET moduli = moduli || '{"attivita": false}'::jsonb WHERE NOT (moduli ? 'attivita')`

**PropertyInfoPage — refactor completo**
- Aggiunto logo/cover upload inline (come RistoranteInfoPage)
- Aggiunto toggle "struttura attiva"
- `CollegamentiSection` usa fallback `property.azienda_id || profile?.azienda_id`
- Dropdown assegna azienda visibile solo a super_admin quando `azienda_id` è NULL (banner giallo)
- **Why:** strutture create prima del sistema aziende hanno `azienda_id = NULL`

**PropertiesPage — bottone Gestisci**
- Aggiunto bottone "Gestisci" → `/admin/struttura/:id/info` (pagina completa)
- Rimosso "Modifica" inline che era incompleto
- **Why:** gli utenti non sapevano della pagina info completa, usavano solo il form inline

## Architettura collegamento entità
- `collegamenti` table: UNIQUE(from_tipo, from_id, to_tipo, to_id) — simmetrica in lettura
- Strutture vecchie (pre-azienda) hanno `azienda_id = NULL` — fix via dropdown super_admin o SQL
- Nuove strutture create dal wizard hanno sempre `azienda_id` corretto

## Railway non deployava
- Commits erano su GitHub ma Railway non triggerava auto-deploy
- Aggiunto `v: 'fix-enrichlinks-attivita'` a `/api/health` per diagnostica futura
- **How to apply:** se Railway non risponde con il marker, triggerare redeploy manuale dal dashboard
