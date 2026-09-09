---
name: todo-prossima-sessione
description: "Da dove riprendere — l'offerta del Furgone da confermare col cliente, Garage 22 e il nome su Stripe, poi il primo incasso vero"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-09T07:14:00.647Z
---

# Si riprende da qui

Sessione chiusa il **9 settembre 2026** (mattina). Tutto live e provato in
produzione; migration eseguite l'8: **112**, **113** — il 9 nessuna. Dettaglio
in [[project_session_2026_09_08]].

## Fatto il 09/09

- **Il forfait vale solo per le sue date.** Il ponte 5→9 a €850 veniva applicato
  anche a chi ne prenotava due giorni: pagava €850 invece di €240. Ora solo le
  date esatte lo prendono, e chi ne sceglie una parte vede un riquadro con le
  date giuste e il prezzo, che tocca per impostarle. Vedi
  [[reference_offerte_risorse]].
- **Patch di sicurezza**: `next 15.5.24` + `sharp 0.35.4`. Un RCE non
  autenticato che **questa volta ci riguardava davvero** — `/_next/image` era
  vivo e processava AVIF anche se `next/image` non è importato da nessuna parte.
  Vedi [[reference_triage_next_vulns]] §09/09.

## ⚠️ Da chiedere a un cliente

1. **L'offerta «Ponte dell'8 dicembre» del Furgone (Automax).** È su «per tutto
   il periodo»: dal 5 al 9 dicembre costa **€850** invece di €600 di listino, e
   ora vale **solo** per quelle date esatte. **Confermare col cliente che
   intendesse €850 per tutto il ponte** e non €850 al giorno.

2. **Garage 22 e Stripe.** Prima corregge il nome dal pannello Stripe
   (Impostazioni → Dati dell'attività) con la ragione sociale **esatta della
   visura**, poi carica la visura. Rifare l'iscrizione dal nostro pannello senza
   correggere il nome riporta al punto di partenza — è già successo due volte.
   Vedi [[reference_stripe_onboarding_campo]].

3. **Il nome pubblico su Stripe** (`Impostazioni → Dati dell'attività` e
   `Impostazioni → Connect → Branding`, nome **e** logo): chi si iscrive legge
   «FRANCESCO MALAGOLI» mentre sta per consegnare IBAN e documento.

4. **Il primo incasso vero non è mai avvenuto.** Quando Garage 22 sarà attivo:
   una prenotazione da due euro, pagata davvero. Tre verifiche: soldi sul suo
   cruscotto Stripe · email di conferma · prenotazione che risulta pagata.

## Fatto l'08/09 (live e provato)

- **Lista d'attesa eventi** completa (iscrizione, promozione, conferma che parte).
- **La conferma di prenotazione non partiva per nessuno** — era spenta su tutti
  e quattro gli eventi veri. Migration **112**.
- **Booking a giornate**: il calendario nascondeva le prenotazioni e lo stesso
  furgone si vendeva due volte nello stesso giorno →
  [[reference_intervalli_date_booking]]. E «notti» ora segue la risorsa.
- **Offerte sulle risorse**: valevano solo per gli slot orari →
  [[reference_offerte_risorse]]. Migration **113**.
- **Eventi**: contatti nel CRM con tag, bottoni comprensibili, pannello degli
  invii con testo e spunte, descrizione formattabile.
- **15 contatti storici recuperati** nel CRM (`tests/recupera-contatti-eventi.mjs`).
  ⚠️ **Non iscritti alla newsletter**, deciso da Francesco: la formula che
  avevano accettato diceva «per gestire questa prenotazione», e 5 non hanno
  nemmeno quella. Se servirà: invito col double opt-in, che esiste già.

## Poi

**L'onboarding** ([[project_onboarding_mappa]]) resta il capitolo che vale di
più, tenuto per ultimo da Francesco perché vuole ragionarci di marketing.

Il **voto Google** ([[reference_voto_google]]) aspetta solo
`GOOGLE_PLACES_API_KEY` su Vercel.

## Fermo, e dipende da Francesco

- **Meta**: verifica business bloccata; restiamo Tech Provider, non BSP.
- **Termini e privacy** a un avvocato; le 10 aziende devono accettarli.
- **2FA** su Vercel, Supabase, Cloudflare, GitHub.
- **Ripristino del backup** mai provato.
- Sottodominio `futura-club-spiagge-bianche.oltrenova.com` da togliere a mano su
  Vercel. ⚠️ Sotto c'è un difetto: cancellare un'entità non rimuove il suo
  sottodominio (`removeProjectDomain` esiste, nessuno la chiama).
- Le **13 prenotazioni storiche** degli eventi restano «in attesa»: nessuno le
  ha mai confermate e non le tocchiamo.
- ⚠️ **`sharp` sta in `overrides`, non in `dependencies`**, pur essendo importato
  da `lib/upload-helper.js`. Funziona solo perché ce lo tira dentro Next: il
  giorno che smettesse di dipenderne, la compressione delle immagini si
  romperebbe senza che nessuno abbia toccato niente. È una riga da aggiungere.
- ⚠️ Confermato dal vivo il 09/09: `/s/futura-club-spiagge-bianche` risponde
  **404** — il sottodominio residuo su Vercel punta a un sito che non esiste.

## In coda, nessuno urgente

Next 16, multilingua DE, import documento v2, QR con logo, PWA installabile,
notifiche realtime, PMS, TripAdvisor (in attesa di Terra).
