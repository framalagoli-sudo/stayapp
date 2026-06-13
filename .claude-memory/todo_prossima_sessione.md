---
name: todo_prossima_sessione
description: Lista to-do per la prossima sessione — priorità ordinate
metadata: 
  node_type: memory
  type: project
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

## Prossima sessione — To-Do in ordine di priorità

### 1. Spegnere Railway ⚠️ (risparmio $5/mese)
- Verificare che NESSUNA route del client Next.js punti ancora a Railway
- Andare su Railway dashboard → progetto stayapp → Delete/Pause
- Rimuovere CNAME `api.oltrenova.com` da Cloudflare (era il dominio Railway)
- Eliminare `client-next/lib/newsletter-scheduler.js` (dead code Railway, non importato da nessuno)

### 2. Attivare Resend bounce webhook (zero costo, alta priorità)
- resend.com → Webhooks → Add endpoint
- URL: `https://oltrenova.com/api/resend-webhook`
- Events: `email.bounced` + `email.complained`
- `RESEND_WEBHOOK_SECRET` è già configurata su Vercel ✅
- Questo protegge reputazione email: bounce → `email_non_valida=true` → skip newsletter + autoresponder

### 3. Test manuale Form Builder end-to-end
- Creare un form di test con: campo testo, email, consenso GDPR
- Compilare il form dal minisito pubblico
- Verificare: email admin ricevuta, contatto CRM creato, submission salvata
- Abilitare autoresponder e verificare email conferma all'utente

### 4. Attivare Cloudflare Bot Fight Mode (1 click, gratis)
- Dashboard CF → oltrenova.com → Security → Bots → Bot Fight Mode → ON

### 5. Debug sezione per sezione del pannello admin
- Percorrere ogni sezione dell'admin e verificare che funzioni tutto
- Struttura: Info, Camere/Servizi, Galleria, Tema, Sito web, Chatbot, Domini
- Ristorante: Info, Menu, Galleria, Sito web, Chatbot, Domini
- Attività: Info, Galleria, Sito web, Chatbot, Domini
- Sezioni globali: Analytics, Newsletter, Booking, Contatti, Form Builder, Blog, Piano Editoriale, Staff

### 6. Abstract API email validation (opzionale, free 100/mese)
- Registrare su abstractapi.com/email-validation
- `vercel env add ABSTRACT_API_KEY production`
- Rideploy

### 7. Google Calendar (quando pronto)
- Configurare `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` su Vercel
- Il codice backend è già scritto lato Railway — va portato su Next.js

### 8. Stripe Sprint 10 (billing SaaS)
- Piano tecnico: piani Free/Starter/Pro, checkout, webhook stripe, upgrade/downgrade

**Why:** Migrazione Railway→Vercel completa. Railway costa $5/mese e non serve più.
**How to apply:** Iniziare la sessione da punto 1 (Railway shutdown) poi seguire in ordine.
