---
name: project-roadmap-sprint
description: Roadmap sprint 10-15 concordata — funzionalità da implementare in ordine di priorità
metadata: 
  node_type: memory
  type: project
  originSessionId: cec93190-01ca-4d21-8dee-f2fbb856e166
---

Analisi comparativa vs GoHighLevel, Klaviyo, Mailchimp, HubSpot, ActiveCampaign. Sprint pianificati in ordine.
Piano tecnico aggiornato 2026-06-10 con 6 fasi in FEATURES.md.

**Why:** Francesco vuole espandere StayApp con feature ad alto impatto, partendo dalla monetizzazione.
**How to apply:** Quando Francesco chiede cosa fare dopo, proporre il prossimo sprint in lista. Il piano tecnico (debug → migrazione → sicurezza → CI/CD → AI agent) è in FEATURES.md sezione "PIANO TECNICO".

---

## Sprint 10 — Stripe billing (URGENTE — monetizzazione)
Stripe già installato ma non integrato. Sistema trial/subscription_status già nel DB.
- Checkout piani mensili
- Webhook Stripe → aggiorna subscription_status
- Gate funzionalità per piano
- MRR dashboard super_admin

## Sprint 11 — WhatsApp Business API + Push notification PWA
- WhatsApp: Twilio API, canale dominante in Italia. Estende chatbot AI già fatto
- Push notification: PWA già installabile, aggiungere Web Push (service worker)

## Sprint 12 — Segmentazione avanzata CRM + A/B test newsletter
- Filtri comportamentali contatti: "non ha aperto ultima newsletter", "ha prenotato 2+ volte"
- Lead scoring automatico (aperture email, prenotazioni, recensioni)
- A/B test oggetto newsletter: invia a 20%+20%, vince chi ha più aperture, manda al resto

## Sprint 13 — Automazioni con branch logic (if/else)
- Upgrade automazioni attuali (ora lineari A→B→C)
- Aggiungere condizioni: se ha prenotato / se non ha aperto email / se ha lasciato recensione
- Editor visuale con rami

## Sprint 14 — Digital check-in + upsell engine
- Digital check-in: cliente compila dati pre-arrivo, firma GDPR, carica documento
- Upsell engine: durante booking suggerisce extra (colazione, upgrade, servizi)
- Waitlist: quando risorsa piena, iscrizione con notifica automatica

## Sprint 15 — Multi-lingua IT/EN/DE
- Già in roadmap originale
- Sblocca mercato internazionale

---

## Feature AI differenzianti (da inserire nei vari sprint)
- **Reporting narrativo AI** — lunedì mattina Claude scrive un riassunto testuale delle performance settimana. Nessun competitor lo fa.
- **Analisi sentimento recensioni** — classifica per tema (pulizia, personale, prezzo), mostra trend
- **AI price optimizer** — suggerisce prezzo ottimale risorse in base a stagione/occupazione storica
- **Generazione social con immagini** — piano editoriale + DALL-E per post completi

## Altre feature medie priorità
- Popup/form comportamentali (exit intent, scroll trigger)
- Storico interazioni contatto (timeline unica)
- QR code menu con ordinazione al tavolo (modulo ristoranti)
- Link prenotazione personale tipo Calendly (freelancer/professionisti)
- Social posting diretto da piano editoriale (Instagram/Facebook API)
