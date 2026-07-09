---
name: reference_eventi_notifiche_email
description: Notifiche email prenotazioni evento — 2 toggle per-evento (titolare / conferma ospite white-label)
metadata: 
  node_type: memory
  type: reference
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Prenotazione evento → `POST /api/guest/eventi/[id]/book` → tabella **`event_bookings`** (status 'pending', posti riservati subito via `recomputeEventSeats`). NON è in `requests` (le prenotazioni attività invece sì). Il titolare le vede in **Admin → Eventi → apri evento → "Prenotazioni →"** (`/admin/eventi/[id]/prenotazioni`).

**Notifiche email (9/7, migration 067)** — due toggle indipendenti per-evento su `eventi`:
- `notify_owner_on_booking` (default **true**): mail al **titolare** ad ogni prenotazione. Destinatario = email dell'entità associata, o dell'**azienda** se l'evento è aziendale (entity null). Template `emailTemplate` (brand OltreNova, ok piattaforma→titolare).
- `send_guest_confirmation` (default **false**): mail di conferma all'**ospite**, **white-label** via `guestEmailTemplate` (nuovo in `lib/email-template.js`, ZERO branding OltreNova — regola business→cliente). La route ritorna `guest_confirmation_sent` → `EventoPage` mostra testo adattivo ("Ti abbiamo spedito una mail" vs neutro; prima prometteva SEMPRE email = falso).

Dettagli:
- UI toggle in `EventoEditPage` sezione "Notifiche email"; campi in ALLOWED di `/api/eventi` (POST) e `/api/eventi/[id]` (PATCH).
- **Rate limit** aggiunto sull'endpoint booking (`evento-book`, 10/h per IP) — prima ASSENTE; necessario avendo introdotto invio email su endpoint pubblico. Vedi [[feedback_sicurezza_priorita]].
- Pattern migration-safe: la route booking usa `select('*')` → se le colonne non esistono ancora, undefined → nessuna mail, niente 500 (deploy indipendente dall'ordine della migration).
- Roadmap: "Email reminder booking" resta TODO separato (questo è la notifica immediata, non il reminder).
