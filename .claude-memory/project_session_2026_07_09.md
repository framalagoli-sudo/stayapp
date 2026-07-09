---
name: project_session_2026_07_09
description: "Session 9/7 — AI Builder pesca i dati reali dell'entità + riorganizzazione UX sidebar admin (2 livelli)"
metadata: 
  node_type: memory
  type: project
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Sessione 2026-07-09. Due cose (oltre alle rifiniture Vetrine dell'8/7), tutte live + smoke 46/46.

**1. AI Site Builder ora pesca i DATI REALI dell'entità.**
Prima leggeva solo `name`+`description` e ri-chiedeva tutto nel wizard. Ora:
- Nuovo `lib/ai-entity-context.js` → `entityDataSummary(entity, tipo)`: riassunto compatto (bounded, WHITELIST) di servizi, menu, attività, escursioni, dotazioni, orari, indirizzo, punti forza/numeri/FAQ del minisito, n° foto. **Sicurezza**: mai `wifi_password`/regole interne (verificato live: wifi_password presente nell'entità ma NON nel riassunto).
- Iniettato nei prompt di `ai-fill` (flusso LIVE) e `generate-site` (fallback); `select('*')` per avere tutti i campi. L'AI scrive testi fedeli a ciò che l'attività offre davvero.
- Minor da migliorare: per il menu ristorante estrae le categorie ma non sempre i nomi piatti (chiave items non 'name'/'nome').

**2. Riorganizzazione UX della sidebar admin (persona SMB = admin_azienda).** Vedi analisi: la barra era gergale (Operativo/Marketing/Account) e sovraccarica; il sito (la forza) era mid-list; l'AI Builder MANCAVA nel menu admin_azienda (solo super).
- **Livello 1 (barra principale)**: `Operativo`+`Marketing` → **"Clienti & richieste"** (Richieste/Prenotazioni/Booking/Contatti/Preventivi/Recensioni/Survey/Chat/Form) + **"Contenuti & promo"** (Blog/Eventi/Newsletter/Automazioni/Piano ed./Content Studio/Loyalty/Shop). Sito&App e Account invariati.
- **Livello 2 (menu entità struttura/ristorante/attività)**: sub raggruppati con header **Contenuti → Sito & presenza → Impostazioni** (campo `group` nei `*_SUBS` + helper `renderSubs`). **AI Site Builder** iniettato dopo "Sito web", **QR Code** dopo "Domini". Rimosso l'header esterno "Sito & App" (evita header doppi). Legacy (NAV_PROPERTY) invariato; super_admin invariato (power user).
- ⚠️ Verificato struttura+smoke, NON il visivo renderizzato → Francesco deve dare un occhio (hard-refresh).

**Inventario completo fatto** (Francesco ha chiesto rigore): coperte TUTTE le voci dei 2 livelli, niente lasciato fuori (Survey/Collaboratori/Booking/sub-entità/AI Builder).

**Backlog UX rimasto**: checklist "Inizia qui"/onboarding in dashboard (il pezzo che rende davvero "semplice" per il dummy) — proposto, non ancora fatto. Vedi [[feedback_sicurezza_priorita]] (sanitizzazione URL applicata anche qui: entità via select('*') ma summary whitelistato).

**3. Drag-to-nest sottopagine (SitoPage → tab Menu & Layout).** Prima le sottopagine si creavano solo col pulsante `↳ Rendi sottopagina` (limitato: solo se la voce sopra non aveva già figli). Ora: trascinando una voce **leggermente a destra** (soglia `INDENT_ZONE=44px` misurata su `e.clientX - rect.left` in `onDragOver`) sopra un'altra, diventa sottopagina → stato `dropNest`, feedback verde tratteggiato + badge «sottopagina di …», al drop `PATCH parent_id+ordine`. Dritto = riordino (comportamento esistente). Guardrail **1 solo livello**: nidifica solo sotto voci `!parent_id` e solo se la trascinata ha `menuSubs.length===0`. Pulsanti `↳`/`↱` restano come fallback. Endpoint esistenti già scopati per azienda. ⚠️ Smoke NON copre il gesto drag reale → Francesco verifica a mano il gesto.
