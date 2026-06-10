---
name: project-session-2026-05-26
description: "Feature completate il 2026-05-26 — Collaboratori/2FA, Canali distribuzione, Piano editoriale Idee"
metadata: 
  node_type: memory
  type: project
  originSessionId: cec93190-01ca-4d21-8dee-f2fbb856e166
---

## Feature completate (sessione 2026-05-26)

### 1. Collaboratori — permessi granulari + 2FA obbligatorio

**Migration 044** (`supabase/migrations/044_require_2fa.sql`):
```sql
ALTER TABLE aziende ADD COLUMN IF NOT EXISTS require_2fa boolean DEFAULT false;
```
**Già eseguita su Supabase** ✅

**`server/src/routes/aziende.js`**: aggiunto `require_2fa` nel PATCH whitelist

**`client/src/context/AuthContext.jsx`**: dopo fetchProfile carica `require_2fa` da aziende, espone in context

**`client/src/components/admin/ProtectedRoute.jsx`**: se `require2fa && !enrolled` → redirect `/admin/security`

**`client/src/pages/admin/SecurityPage.jsx`**: banner warning giallo se 2FA obbligatorio ma non attivo

**`client/src/pages/admin/StaffPage.jsx`** — refactor completo:
- Toggle `require_2fa` per azienda (PATCH `/api/aziende/:id`)
- Permessi in 3 gruppi: OPERATIVO (richieste, prenotazioni, booking, eventi, recensioni, survey), MARKETING (contatti, newsletter, blog, automazioni, piano_editoriale, content_studio, preventivi, form_builder, shop, loyalty), ACCOUNT (analytics)
- `useAzienda()` hook per leggere/salvare require_2fa

**`client/src/components/admin/AdminLayout.jsx`**: sidebar rispetta tutti i nuovi permessi (survey, loyalty, ecc.)

---

### 2. Canali di distribuzione — toggle PWA + Sito Web per entità

Nessuna migration necessaria (usa JSONB esistenti: `modules.pwa_active`, `minisito.active`, `pwa.active`).

**`client/src/pages/guest/GuestApp.jsx`** (struttura):
- `pwaOn = modules?.pwa_active !== false` (default true)
- `miniOn = !!minisito?.active`
- Se `miniOn && (!isQR || !pwaOn)` → LandingStruttura; se `!pwaOn` → placeholder "offline"

**`client/src/pages/guest/RestaurantApp.jsx`** (ristorante): stessa logica

**`client/src/pages/guest/AttivitaApp.jsx`** (attività): pwa.active + minisito.active → placeholder se entrambi off

**`client/src/pages/admin/property/PropertyInfoPage.jsx`**: aggiunta `CanaliSection` con toggle PWA + Sito Web

**`client/src/pages/admin/ristorante/RistoranteInfoPage.jsx`**: aggiunta `CanaliSection`

**`client/src/pages/admin/attivita/AttivitaInfoPage.jsx`**: sezione "Canali di distribuzione" con toggle minisito + PWA

---

### 3. Piano editoriale — tab "Idee" (backlog)

**Migration 045** (`supabase/migrations/045_idee_editoriali.sql`):
```sql
CREATE TABLE IF NOT EXISTS idee_editoriali (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id uuid NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
  titolo text NOT NULL DEFAULT '',
  note text DEFAULT '',
  pillar text DEFAULT '',
  canali text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
**DA ESEGUIRE su Supabase Dashboard → SQL Editor** ⚠️

**`server/src/routes/piano_editoriale.js`**: aggiunte 5 route PRIMA di `/:id`:
- `GET /idee` — lista idee azienda
- `POST /idee` — crea idea
- `PATCH /idee/:id` — modifica idea
- `DELETE /idee/:id` — elimina idea
- `POST /idee/:id/pianifica` — converte idea in post sul calendario (data opzionale), poi elimina idea

**`client/src/pages/admin/PianoEditorialePage.jsx`** — aggiunta tab "Idee":
- Switcher a 3 tab: Calendario / Lista / Idee (con badge contatore)
- Pillar: Educativo, Promozionale, Dietro le quinte, Testimonianza, Ispirazione, Annuncio
- Filtro rapido per pillar (toggle button)
- Form "Nuova idea" inline: titolo + note + pillar select + canali checkbox-pill
- Card grid (auto-fill 280px) con "Pianifica →" che apre date input + "Crea post" inline sulla card
- Stato vuoto con Lightbulb icon

**Why:** L'ispirazione e gli spunti nascevano scollegati dal calendario. Ora c'è un backlog strutturato con pillar e canali, direttamente convertibile in post pianificato.
**How to apply:** Quando si lavora sul piano editoriale, ricordare che le idee vivono nel backlog e si pianificano da lì.

---

## Stato deployment

- Git push ✅ — branch main aggiornato (ultimo push 2026-05-28)
- Railway backend ✅
- Vercel frontend ✅ — live su oltrenova.com
- Migration 044 ✅ — eseguita
- Migration 045 ⚠️ — DA ESEGUIRE su Supabase (idee_editoriali)
- Migration 046 ⚠️ — DA ESEGUIRE (piano_editoriale_v2)
- Migration 047 ⚠️ — DA ESEGUIRE (piano_editoriale_autore)
