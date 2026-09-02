---
name: todo-prossima-sessione
description: "Da dove riprendere — manca solo la chiave Google per accendere il voto reale; poi gli eventi (12 prenotazioni vere, mai percorsi) o l'onboarding"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-02T17:02:41.802Z
---

# Si riprende da qui

Sessione chiusa il **2 settembre 2026**.

## ⚠️ Una cosa sola, e sblocca una funzione già scritta

**La chiave Google.** Console Google Cloud → abilita **Places API (New)** → crea
una credenziale → mettila su Vercel come `GOOGLE_PLACES_API_KEY` → **serve un
redeploy** (le env var sono legate al deployment).

Consigliato: limitare la chiave alle sole Places API e mettere un tetto di spesa
sul progetto Google Cloud.

Appena c'è: collegare una scheda vera da **Recensioni** e verificare che il voto
compaia. È l'unica cosa che non ho potuto provare. Dettaglio e conti in
[[reference_voto_google]] — **oggi è gratis e resta gratis**, la cadenza si
autoregola per non superare le 1.000 letture al mese.

## Poi: la scelta è fra due

1. **Percorrere gli eventi.** Hanno **12 prenotazioni reali** e non li ha mai
   percorsi nessuno end-to-end. Ogni funzione percorsa in questi giorni ha
   restituito 4-5 difetti veri; qui il danno non sarebbe potenziale, perché ci
   sono già clienti che hanno pagato — e ci girano **campagne a pagamento**.
2. **L'onboarding** ([[project_onboarding_mappa]]): il capitolo che vale di più,
   tenuto per ultimo da Francesco perché vuole ragionarci di marketing. È una sua
   decisione di prodotto.

Proposto il primo, non ancora deciso.

## Fatto il 02/09 (live e verificato)

- **Recensioni**: il giro c'era e non l'aveva percorso nessuno — 0 richieste
  inviate in tutta la storia. Cinque difetti chiusi → [[reference_recensioni]].
- **Voto Google reale** sui siti, con la data di lettura → [[reference_voto_google]].
- **Guardia**: il deploy si ferma se una sonda tocca un cliente vero →
  [[feedback_sonde_non_scrivono_a_persone]].

## Fermo, e dipende da Francesco

- **Nessun cliente ha collegato il conto Stripe**: il primo incasso vero non è
  mai avvenuto ([[reference_stripe_connect]]).
- **Meta**: fermi sulla verifica business; restiamo Tech Provider, non BSP.
- **Termini e privacy** a un avvocato ([[reference_documenti_legali]]).
- **2FA** su Vercel, Supabase, Cloudflare, GitHub.
- Le 10 aziende devono accettare i Termini.
- Ripristino del backup mai provato ([[reference_backup_e_ripristino]]).
- **Sottodominio da rimuovere a mano** su Vercel:
  `futura-club-spiagge-bianche.oltrenova.com` — l'entità è stata cancellata ma
  il sottodominio resta e mostra la landing di OltreNova. ⚠️ Difetto sotto:
  **cancellare un'entità non rimuove il suo sottodominio** (`removeProjectDomain`
  esiste, nessuno la chiama). Proposto di collegarli, non ancora deciso.

## In coda, nessuno urgente

Next 16, multilingua DE, import documento v2, QR con logo, PWA installabile,
notifiche realtime, integrazione PMS, TripAdvisor (in attesa di Terra).

⚠️ **Deploy**: `npx vercel` dà spesso «Not authorized» alla prima esecuzione
dopo un aggiornamento della CLI. È transitorio: si rilancia `deploy.ps1`.
