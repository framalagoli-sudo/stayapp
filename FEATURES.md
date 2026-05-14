# FEATURES — Roadmap prodotto StayApp

Documento vivo. Aggiornato sessione per sessione.
Ultima revisione: 2026-05-14 (backup notturno testato e funzionante su Cloudflare R2)

---

## Come leggere questo file

- `[ ]` — da fare
- `[~]` — parzialmente implementato / fondamenta presenti
- `[x]` — completato
- Priorità: 🔴 Alta · 🟡 Media · 🟢 Bassa

---

## Verticals supportati (attuali e futuri)

Il sistema è già multi-modulo. L'obiettivo è espanderlo oltre l'hospitality:

| Vertical | Modulo attuale | Note |
|---|---|---|
| Hotel / B&B / Agriturismo | `struttura` | ✅ core |
| Ristorante / Bar / Pizzeria | `ristorante` | ✅ core |
| Attività / Esperienza | `attivita` | ✅ core |
| Centro sportivo / Padel / Tennis | `attivita` | estendibile |
| Palestra / Fitness | nuovo modulo | booking classi + abbonamenti |
| Studio medico / Dentista | nuovo modulo | booking slot + paziente |
| Professionista (avvocato, commercialista, etc.) | nuovo modulo | booking appuntamenti |
| Spa / Centro benessere | interno a struttura | booking trattamenti |
| Coworking / Uffici | nuovo modulo | booking postazioni/sale |
| Scuola / Formazione | nuovo modulo | iscrizioni corsi + lezioni |

---

## 1. SISTEMA BOOKING RISORSE (pivot strategico) 🔴

Il cuore della piattaforma generalista. Sostituisce il concetto "prenotazione escursione"
con un sistema universale applicabile a qualsiasi entità.

### Concetto: Risorsa prenotabile

Ogni entità può avere **N risorse**, ognuna con le sue regole:

```
Risorsa
├── nome: "Campo Padel 1", "Sala Massaggi A", "Studio Dr. Rossi"
├── tipo: slot_orario | campo | sala | postazione | classe
├── durata_default: 60min
├── capacita: 1 (singolo) | N (gruppo/classe)
├── prezzo: 0 (gratuito) | fisso | variabile per slot
├── disponibilita: regole settimanali (lun-ven 09:00-20:00)
├── blocchi: eccezioni (festivi, manutenzione)
├── anticipo_min: 2h (minimo anticipo prenotazione)
├── cancellazione: 24h (policy cancellazione)
└── conferma: automatica | manuale
```

### Casi d'uso per vertical

| Vertical | Risorsa | Slot | Capacità |
|---|---|---|---|
| Hotel | Spa, Sala riunioni, Campo tennis | 60min | 1-2 |
| Ristorante | Tavolo, Chef's table | 90min | 2-8 |
| Centro sportivo | Campo padel, Campo calcetto | 60-90min | 2-10 |
| Studio medico | Ambulatorio Dr. X | 20-30min | 1 |
| Palestra | Sala spinning, Personal trainer | 45-60min | 1-20 |
| Coworking | Postazione fissa, Sala riunioni | 1h-giornata | 1-10 |
| Professionista | Agenda Dr./Avv./Commercialista | 30-60min | 1 |

### Features booking system

- [x] 🔴 **CRUD risorse** — admin crea/modifica risorse per la propria entità
- [x] 🔴 **Calendario disponibilità** — grid settimanale con slot liberi/occupati (admin)
- [x] 🔴 **Booking pubblico** — cliente sceglie risorsa → slot → conferma (PWA/minisito)
- [x] 🔴 **Gestione prenotazioni** — lista admin con filtri, stato, azioni
- [x] 🔴 **Email conferma** automatica al cliente (via Resend)
- [ ] 🔴 **Email reminder** N ore prima (configurabile per risorsa)
- [x] 🟡 **Cancellazione self-service** — link nell'email conferma, policy configurabile per risorsa
- [ ] 🟡 **Lista d'attesa** — se slot pieno, cliente entra in lista
- [ ] 🟡 **Pagamento al booking** — Stripe checkout integrato (deposito o totale)
- [ ] 🟡 **Ricorrenza** — prenotazione settimanale fissa (abbonati palestra, slot fisso medico)
- [ ] 🟢 **Sync calendario** — export iCal / Google Calendar per il professionista
- [ ] 🟢 **Buffer tra slot** — pulizia/preparazione (es. 15min tra massaggi)
- [ ] 🟢 **Override manuale** — admin blocca slot / sposta prenotazione

### DB (nuove tabelle da aggiungere)

```sql
-- Risorse prenotabili
risorse (
  id, entity_tipo, entity_id, nome, tipo,
  descrizione, durata_min int, capacita int,
  prezzo numeric, valuta text DEFAULT 'EUR',
  colore text,           -- per il calendario
  attiva boolean,
  disponibilita jsonb,   -- { lun: [{start:'09:00',end:'20:00'}], ... }
  blocchi jsonb,         -- [{ data:'2026-06-15', motivo:'festivo' }]
  anticipo_min int,      -- minuti minimi di anticipo
  cancellazione_h int,   -- ore entro cui si può cancellare
  conferma_auto boolean DEFAULT true,
  created_at, updated_at
)

-- Prenotazioni risorse
prenotazioni_risorse (
  id, risorsa_id FK risorse,
  entity_tipo, entity_id,
  cliente_nome, cliente_email, cliente_telefono,
  data date, ora_inizio time, ora_fine time,
  posti int DEFAULT 1,
  importo_totale numeric,
  stato text DEFAULT 'confermata', -- confermata|in_attesa|cancellata|completata
  note text,
  pagamento_id text,     -- Stripe payment intent
  reminder_inviato boolean DEFAULT false,
  created_at, updated_at
)
```

---

## 2. CHATBOT CONFIGURABILE (decision tree) 🟡

Widget chat con risposte preimpostate per struttura, ristorante e attività. Admin configura albero di conversazione (nodi + opzioni con azioni).

- [x] 🟡 **Decision tree admin** — editor nodi: messaggio bot + pulsanti tipizzati
- [x] 🟡 **Tipi opzione** — `go_to` (vai a nodo), `restart` (torna a start), `call` (tel:), `whatsapp` (wa.me), `link` (URL esterno)
- [x] 🟡 **Widget PWA** — posizionato sopra la nav bar (position:absolute, non fuoriesce dal mockup phone)
- [x] 🟡 **Widget landing** — floating fixed bottom-right (360×520px) per minisiti
- [x] 🟡 **Entità supportate** — struttura, ristorante, attività (colonna `chatbot jsonb` su tutte e tre le tabelle)
- [x] 🟡 **Anteprima live** — nell'editor admin si vede la conversazione in tempo reale
- [ ] 🟢 **Chatbot AI** — integrazione LLM per risposte libere (campo "altro" + GPT/Claude)
- [ ] 🟢 **Trasferimento a operatore** — escalation a chat umana (WhatsApp / email notifica)
- [ ] 🟢 **Analytics chatbot** — quali percorsi vengono scelti più spesso

### DB
```sql
-- Migration 025_chatbot.sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS chatbot jsonb DEFAULT NULL;
ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS chatbot jsonb DEFAULT NULL;
ALTER TABLE attivita   ADD COLUMN IF NOT EXISTS chatbot jsonb DEFAULT NULL;
```

---

## 3. ORDINAZIONE F&B (ristoranti / hotel room service) 🔴

Ospite scansiona QR al tavolo → ordina → la cucina riceve in tempo reale.

- [ ] 🔴 **Menu ordinabile** — toggle "ordinabile" per piatto/categoria
- [ ] 🔴 **Carrello ospite** — aggiunge piatti, note per piatto, invia ordine
- [ ] 🔴 **Kitchen display** — schermata cucina con ordini in arrivo (real-time)
- [ ] 🔴 **Stato ordine** — ospite vede: ricevuto → in preparazione → pronto
- [ ] 🟡 **Numero tavolo / camera** — identificazione ospite al momento dell'ordine
- [ ] 🟡 **Pagamento integrato** — Stripe al momento dell'ordine o a fine pasto
- [ ] 🟡 **Orari servizio** — ordini accettati solo negli orari definiti
- [ ] 🟢 **Allergeni nel carrello** — warning se item contiene allergene dichiarato dall'ospite
- [ ] 🟢 **Upselling automatico** — "Con questo abbinare vino X?"

---

## 4. CHECK-IN / CHECK-OUT DIGITALE (hotel) 🔴

- [ ] 🔴 **Pre check-in** — email automatica N giorni prima con link form
- [ ] 🔴 **Form pre-arrivo** — nome, documento (foto), ora arrivo stimata, preferenze
- [ ] 🔴 **Notifica reception** — alert quando ospite completa il pre check-in
- [ ] 🟡 **Check-out digitale** — ospite chiude il soggiorno dalla PWA
- [ ] 🟡 **Addebiti extra** — reception aggiunge extra (minibar, ecc.) visibili all'ospite
- [ ] 🟢 **Firma digitale** — firma regolamento struttura inline
- [ ] 🟢 **Upload documento** — foto fronte/retro ID (storage Supabase)

---

## 5. EMAIL AUTOMATION (trigger automatici) 🔴

Oggi abbiamo solo newsletter manuale. Manca l'automation basata su eventi.

- [ ] 🔴 **Pre-arrivo** — email automatica X giorni prima del check-in (hotel)
- [ ] 🔴 **Conferma prenotazione** — email immediata con dettagli risorsa/evento
- [ ] 🔴 **Reminder appuntamento** — 24h e 1h prima (booking risorse)
- [ ] 🔴 **Post-soggiorno / post-visita** — email automatica dopo check-out o appuntamento
- [ ] 🟡 **Sequenza benvenuto** — serie email per nuovi iscritti newsletter
- [ ] 🟡 **Re-engagement** — email a contatti inattivi da X giorni
- [ ] 🟡 **Compleanno** — email automatica se data di nascita salvata nel CRM
- [ ] 🟢 **Flow builder visuale** — editor drag & drop per costruire sequenze

### DB

```sql
automazioni (
  id, azienda_id, entity_tipo, entity_id,
  nome, trigger text,       -- 'pre_arrivo'|'post_visita'|'conferma_booking'|...
  trigger_config jsonb,     -- { giorni_prima: 3 }
  template_id, subject, content jsonb,
  attiva boolean,
  created_at
)
```

---

## 6. UPSELLING IN-STAY 🟡

Messaggi/offerte automatiche durante il soggiorno o prima dell'arrivo.

- [ ] 🟡 **Upgrade camera** — offerta upgrade con prezzo delta (hotel)
- [ ] 🟡 **Early check-in / late check-out** — disponibilità + prezzo
- [ ] 🟡 **Add-on** — colazione, parcheggio, transfer (comprabili dalla PWA)
- [ ] 🟡 **Offerta F&B** — "Prenota il tavolo per stasera" con link booking
- [ ] 🟡 **Bundle** — pacchetti combinati (camera + cena + spa)
- [ ] 🟢 **Trigger temporale** — upselling mostrato X ore dopo il check-in

---

## 7. FEEDBACK / NPS 🟡

- [ ] 🟡 **Survey in-stay** — form breve a metà soggiorno (1-5 stelle + commento)
- [ ] 🟡 **Post-stay automatico** — email survey 1 giorno dopo check-out
- [ ] 🟡 **Dashboard feedback** — admin vede punteggi, trend, commenti
- [ ] 🟡 **Redirect recensioni** — se NPS ≥ 4 → link Google/TripAdvisor automatico
- [ ] 🟢 **Risposta pubblica** — admin risponde alle recensioni dalla piattaforma
- [ ] 🟢 **Widget recensioni** — mostra recensioni verificate nel minisito

---

## 8. GESTIONE STAFF 🟡

- [ ] 🟡 **Invito collaboratori** — admin invia email invito con ruolo preassegnato
- [ ] 🟡 **Turni staff** — calendario settimanale assegnazione turni
- [ ] 🟡 **Task assignment** — richiesta ospite assegnata a staff specifico
- [ ] 🟡 **Housekeeping board** — stato camere: pulita/da pulire/in pulizia (hotel)
- [ ] 🟡 **Manutenzione workflow** — segnalazione → assegna tecnico → chiusura con foto
- [ ] 🟢 **Performance** — tempo medio risoluzione richieste per membro staff
- [ ] 🟢 **Chat interna** — messaggi staff↔staff separati da ospite↔staff

---

## 9. MODULI PROFESSIONISTI (nuovo vertical) 🟡

Espansione fuori dall'hospitality puro.

### Studio medico / Dentista
- [ ] 🟡 **Scheda paziente** — anagrafica, storico visite, note medico
- [ ] 🟡 **Agenda medico** — vista settimanale con slot booking
- [ ] 🟡 **Consenso informato** — documento con firma digitale
- [ ] 🟢 **Ricette / referti** — upload PDF, download paziente dalla PWA
- [ ] 🟢 **Promemoria terapia** — push notification o email a orari fissi

### Avvocato / Commercialista
- [ ] 🟡 **Gestione clienti** — CRM con fascicoli/pratiche
- [ ] 🟡 **Agenda consulenze** — booking appuntamento con area di specializzazione
- [ ] 🟢 **Condivisione documenti** — upload sicuro, link temporaneo per cliente
- [ ] 🟢 **Fatturazione base** — preventivo → approvazione → fattura PDF

### Palestra / Fitness
- [ ] 🟡 **Classi e orari** — calendario corsi con iscrizione
- [ ] 🟡 **Abbonamenti** — piani mensili/trimestrali con Stripe (recurring)
- [ ] 🟡 **Check-in palestra** — QR code presenza, contatore ingressi
- [ ] 🟢 **Personal trainer** — booking sessione 1:1, piano allenamento
- [ ] 🟢 **Progressi** — tracciamento peso/misure nel tempo

---

## 10. CRM AVANZATO 🟡

- [ ] 🟡 **Storico ospite/cliente** — visite, spesa totale, servizi usati
- [ ] 🟡 **Segmentazione** — tag automatici (VIP, frequente, stagionale)
- [ ] 🟡 **Preferenze salvate** — camera, dieta, allergeni, note speciali
- [ ] 🟡 **Lifetime value** — quanto ha speso ogni cliente nel tempo
- [ ] 🟢 **Importa contatti** — CSV upload
- [ ] 🟢 **Loyalty program** — punti per soggiorno/acquisto, rewards

---

## 11. ANALYTICS AVANZATE 🟡

- [ ] 🟡 **Revenue analytics** — ricavi per entità, per periodo, per canale
- [ ] 🟡 **Tasso di conversione** — visite minisito → prenotazione
- [ ] 🟡 **Occupancy** — tasso occupazione risorse nel tempo
- [ ] 🟡 **Source tracking** — da dove arrivano i clienti (QR, link diretto, Google)
- [ ] 🟢 **Heatmap comportamento** — sezioni PWA più usate
- [ ] 🟢 **Confronto periodi** — questo mese vs stesso mese anno scorso
- [ ] 🟢 **Export dati** — CSV/Excel per tutte le liste

---

## 12. PAGAMENTI STRIPE (completamento) 🔴

Stripe è installato ma non integrato.

- [ ] 🔴 **Checkout eventi** — pagamento al momento della prenotazione evento
- [ ] 🔴 **Checkout risorse** — pagamento al momento del booking (deposito o totale)
- [ ] 🔴 **Webhook Stripe** — conferma automatica prenotazione dopo pagamento
- [ ] 🟡 **Rimborsi** — admin emette rimborso parziale/totale dalla dashboard
- [ ] 🟡 **Abbonamenti ricorrenti** — Stripe Billing per palestre, coworking
- [ ] 🟡 **Stripe Connect** — ogni azienda ha il suo account Stripe (commissione piattaforma)
- [ ] 🟢 **Fattura automatica** — PDF fattura inviato via email dopo pagamento

---

## 13. NOTIFICHE E COMUNICAZIONI 🟡

- [ ] 🟡 **Push notifications PWA** — notifiche browser per nuove richieste/messaggi
- [ ] 🟡 **WhatsApp Business API** — invio automatico conferme/reminder via WhatsApp
- [ ] 🟡 **SMS** — fallback SMS per reminder critici (via Twilio)
- [ ] 🟢 **Telegram bot** — notifiche staff su canale Telegram (veloce da implementare)
- [ ] 🟢 **In-app notifications** — badge + feed notifiche nell'admin

---

## 14. MULTI-LINGUA 🟢

- [ ] 🟢 **IT/EN/DE PWA ospite** — le schermate guest tradotte
- [ ] 🟢 **Rilevamento automatico** — lingua dal browser dell'ospite
- [ ] 🟢 **Contenuti multilingua** — admin inserisce nome/descrizione in più lingue
- [ ] 🟢 **Email multilingua** — template email nella lingua dell'ospite

---

## 15. INTEGRAZIONI ESTERNE 🟢

- [ ] 🟢 **Google Calendar sync** — prenotazioni risorse appaiono in Google Calendar
- [ ] 🟢 **PMS** (Opera, Mews, Cloudbeds) — sync disponibilità e prenotazioni hotel
- [ ] 🟢 **Channel manager** — SiteMinder, Booking.com, Airbnb
- [ ] 🟢 **Google My Business** — aggiorna orari e info automaticamente
- [ ] 🟢 **Zapier / Make** — webhook in uscita per integrazioni custom

---

## 16. SICUREZZA — Piano completo 🔴

Priorità assoluta prima di acquisire clienti paganti. Diviso in fasi.

### Fase 1 — ✅ COMPLETATA (2026-05-13)

- [x] 🔴 **helmet.js** — security headers HTTP (`X-Frame-Options`, `HSTS`, `CSP`, `nosniff`, ecc.)
- [x] 🔴 **Rate limiting** — `express-rate-limit`: 60 req/min guest, 10 req/15min auth, 120 req/min admin
- [x] 🔴 **CORS lockdown** — whitelist esplicita domini
- [x] 🔴 **Validazione input con zod** — tutti gli endpoint pubblici (contatti, prenotazioni, newsletter, demo)
- [x] 🔴 **Backup automatico notturno** — cron job Railway 03:00 UTC: Supabase client → JSON gzip → Cloudflare R2 EU, retention 30gg ✅ testato 2026-05-14
- [ ] 🔴 **2FA login admin** — TOTP via Supabase Auth (Google Authenticator)

### Fase 2 — Prima di aggiungere altri clienti

- [x] 🔴 **Audit log** — tabella `audit_log` + middleware automatico PATCH/DELETE + pagina admin con filtri e payload espandibile ✅ 2026-05-14
- [ ] 🟡 **Upgrade Supabase → Pro** — $25/mese, include backup giornalieri con 7gg retention (azione manuale)
- [ ] 🟡 **Upgrade Vercel → Pro** — $20/mese, richiesto per uso commerciale (azione manuale)
- [ ] 🟡 **Monitoraggio dipendenze** — `npm audit` in CI/CD (GitHub Actions) ad ogni push
- [ ] 🟡 **Rotazione service role key** — policy trimestrale; aggiornare Railway env vars

### Fase 3 — Prima di scalare (>10 clienti)

- [ ] 🟡 **WAF Cloudflare** — Free blocca bot aggressivi; Pro ($20/mese) aggiunge regole OWASP complete
- [ ] 🟡 **GDPR compliance** — DPA (Data Processing Agreement) da far firmare ai clienti prima dell'onboarding
- [ ] 🟡 **Monitoring + alerting** — Sentry (errori), BetterUptime (uptime), alert su spike traffico anomali
- [ ] 🟡 **Session management avanzato** — revoca sessioni attive, log accessi per utente admin
- [ ] 🟢 **Penetration test** — test manuale base annuale (anche con strumenti free: OWASP ZAP)
- [ ] 🟢 **Multi-tenant isolation** — garanzie RLS più robuste per dati sensibili (futuro vertical medico)
- [ ] 🟢 **GDPR export** — "scarica tutti i miei dati" per utente finale

### Stack alternativo valutato (in ordine di consiglio)

| Opzione | Descrizione | Costo/mese | Quando valutarla |
|---|---|---|---|
| **A — Hardened attuale** | Aggiunge Cloudflare WAF + Supabase Pro al setup corrente | $30-85 | Subito |
| **B — Mid-range** | Neon DB + Clerk Auth + Cloudflare R2 al posto di Supabase | ~$105 | >20 clienti |
| **C — Self-hosted** | Hetzner VPS + Docker (PostgreSQL + Node + MinIO + Keycloak) | €10 | Solo con competenze devops |

---

## 17. INFRASTRUTTURA / TECNICO 🟡

- [ ] 🟡 **GitHub → Vercel auto-deploy** — collegare repo per CI/CD automatico
- [ ] 🟡 **Notifiche real-time admin** — Supabase Realtime su richieste (badge sidebar)
- [ ] 🟢 **GDPR export** — "scarica tutti i miei dati" per utente finale

---

## Ordine di sviluppo suggerito

### Sprint 0 — Sicurezza base ✅ QUASI COMPLETO
1. ✅ helmet.js + rate limiting + CORS lockdown + validazione zod
2. ✅ Backup automatico notturno su Cloudflare R2
3. [ ] 2FA login admin
4. [ ] Audit log

### Sprint 1 — Stripe + pagamenti (2 sessioni)
5. Checkout Stripe per prenotazioni risorse ed eventi
6. Webhook conferma automatica

### Sprint 2 — Email automation (2 sessioni)
7. Reminder automatici pre-appuntamento
8. Post-visita / post-soggiorno

### Sprint 3 — F&B ordering (2-3 sessioni)
9. Menu ordinabile + carrello
10. Kitchen display real-time

### Sprint 4 — Vertical professionisti (3+ sessioni)
11. Scheda cliente/paziente
12. Moduli specifici per vertical

---

*Aggiornare questo file a inizio sessione se nuove feature vengono completate o la priorità cambia.*
