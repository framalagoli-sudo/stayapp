---
name: todo-prossima-sessione
description: "Da dove riprendere — Garage 22 deve correggere il nome su Stripe, poi il primo incasso vero; e il nome pubblico OltreNova da sistemare sul dashboard"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-03T22:45:28.853Z
---

# Si riprende da qui

Sessione chiusa il **3 settembre 2026**, dopo una giornata sul campo: Francesco
è andato da Garage 22 a collegare Stripe.

## ⚠️ In sospeso, e dipende da Francesco

1. **Garage 22 riprova domani.** Il percorso è: **prima** corregge il nome dal
   pannello Stripe (Impostazioni → Dati dell'attività) con la ragione sociale
   **esatta della visura**, **poi** carica la visura. Rifare l'iscrizione dal
   nostro pannello senza correggere il nome riporta al punto di partenza — è
   successo due volte. Storia completa in [[reference_stripe_onboarding_campo]].

2. **Il nome pubblico su Stripe.** Chi si iscrive legge «FRANCESCO MALAGOLI»
   nel momento in cui sta per consegnare IBAN e documento. Due punti:
   - `Impostazioni → Dati dell'attività` → nome pubblico → *OltreNova*
   - `Impostazioni → Connect → Branding` → nome **e logo**: è quello che vede
     il cliente durante l'iscrizione.
   Non è codice nostro: nel nostro non passiamo nessun nome di piattaforma.

3. **Il primo incasso vero non è ancora avvenuto.** Quando Garage 22 sarà
   attivo: impostare la percentuale di acconto sull'evento (0 = si paga sul
   posto), poi **fare una prenotazione da due euro e pagarla davvero**. Tre
   verifiche: soldi sul suo cruscotto Stripe · email di conferma · prenotazione
   che risulta pagata nel pannello. Finché non succede, «i pagamenti funzionano»
   è una frase che nessuno ha verificato.

## Fatto il 03/09 (live e provato in produzione)

- **Eventi**: la prenotazione nasce confermata; la conferma parte quando
  «confermata» è vero (subito se non c'è da pagare, dopo il pagamento se c'è);
  il posto non pagato torna libero dopo 30 minuti, **chiedendo prima a Stripe**
  per non annullare chi ha pagato.
- **Pannello prenotazioni**: «Posti presi 15/60 · Prenotazioni 9 · Valore €375»
  al posto di «0 confermati · €0», e il modulo per **segnare chi telefona** —
  serve solo il nome.
- **Stripe**: ritorno che commenta, tre stati invece di due, requisiti in
  italiano con il motivo del rifiuto, e la risposta grezza visibile al
  super_admin.
- Migration eseguite: **106, 107, 108**.

## Poi

**L'onboarding** ([[project_onboarding_mappa]]) resta il capitolo che vale di
più, tenuto per ultimo da Francesco perché vuole ragionarci di marketing.

E il **voto Google** ([[reference_voto_google]]) aspetta solo
`GOOGLE_PLACES_API_KEY` su Vercel — è gratis fino a 1.000 letture al mese e la
cadenza si autoregola per non superarle.

## Fermo, e dipende da Francesco

- **Meta**: verifica business bloccata; restiamo Tech Provider, non BSP.
- **Termini e privacy** a un avvocato; le 10 aziende devono accettarli.
- **2FA** su Vercel, Supabase, Cloudflare, GitHub.
- **Ripristino del backup** mai provato.
- Sottodominio `futura-club-spiagge-bianche.oltrenova.com` da togliere a mano su
  Vercel. ⚠️ Sotto c'è un difetto: cancellare un'entità non rimuove il suo
  sottodominio (`removeProjectDomain` esiste, nessuno la chiama).

## In coda, nessuno urgente

Next 16, multilingua DE, import documento v2, QR con logo, PWA installabile,
notifiche realtime, PMS, TripAdvisor (in attesa di Terra).
