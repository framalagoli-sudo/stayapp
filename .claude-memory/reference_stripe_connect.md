---
name: reference_stripe_connect
description: "Stripe Connect per OltreNova: account Standard + addebiti diretti SENZA application fee. Francesco non trattiene nulla e resta fuori dal flusso di denaro; rischio e chargeback restano fra cliente e Stripe."
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-30T21:38:22.139Z
---

Ricerca fatta il **30/08/2026** sulla documentazione ufficiale (interrogando anche
gli endpoint dei requisiti per l'Italia). Vincolo di Francesco, sue parole:
*«voglio che ogni bega, rischio ecc. sia tra il ns cliente e stripe»* e **«io non
voglio trattenere nulla»**.

## La configurazione decisa

**Account Standard + addebiti diretti (`direct charges`), senza `application_fee_amount`.**

È l'unica che tiene OltreNova fuori dal flusso:

| | Standard + direct | Express | Custom |
|---|---|---|---|
| Frodi e contestazioni | **account connesso** | piattaforma | piattaforma |
| KYC / verifica | Stripe | Stripe | piattaforma |
| Cruscotto del venditore | completo | ridotto | nessuno |

Con **Express o Custom la responsabilità passa alla piattaforma**: sarebbe
esattamente ciò che si vuole evitare. Shopify usa Standard.

## Come funziona tecnicamente

- Header **`Stripe-Account: <acct_...>`** sulla Checkout Session = addebito diretto
- **Nessun `application_fee_amount`** = non passa un centesimo dalla piattaforma
- Il pagamento nasce sull'account del cliente: `PaymentIntent` e `Charge` vivono
  **lì**, non da noi — per leggerli serve l'header dell'account connesso
- Checkout usa il **branding del cliente**: chi compra non sa che esistiamo
- Webhook da ascoltare: `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `..._failed`

## Costi (Italia, verificati)

Carte SEE standard **1,5% + 0,25 €** · premium 2,8% + 0,25 € · extra-UE 3,15% +
0,25 € (+2% conversione). **Connect non ha costo per account connesso.** Lo 0,25%
in più si paga **solo** se la piattaforma trattiene una propria commissione —
che qui non succede. Le fee le paga il cliente, direttamente.

## Cosa serve a un cliente italiano (SRL) — dai requisiti veri

**Azienda**: ragione sociale · sede · partita IVA · telefono · dichiarazione dei
titolari effettivi
**Attività**: MCC · sito · descrizione prodotto · telefono assistenza ·
accettazione termini · **IBAN**
**Rappresentante**: nome · indirizzo · data di nascita · telefono · email ·
qualifica · **nazionalità**
**Titolari (>25%) e amministratori**: nome · indirizzo · email · data di nascita

Ditta individuale: molto meno, solo i dati della persona.

⚠️ **Li raccoglie Stripe, non noi**: il cliente fa il percorso ospitato da loro.
Non passiamo mai da documenti d'identità — un bene anche per il GDPR.

## ✅ Stato al 31/08/2026 — LIVE in produzione

Fatto e verificato dal vivo:

- **Collegamento**: `Account → Pagamenti` nel pannello. `lib/stripe-connect.js`
  crea l'account v2 con `dashboard: 'full'` e le tre responsabilità su Stripe.
  L'id sta in `aziende.stripe_account_id` (migration `099`) — **solo l'id**: lo
  stato si chiede sempre all'API, perché i requisiti cambiano da soli.
- **Checkout**: `lib/checkout.js`, **un posto solo per tutta la piattaforma**.
  `stripeAccount` = conto del cliente, **nessuna `application_fee`**.
  Lo shop lo usa; prenotazioni ed eventi hanno le colonne pronte (`095`, `100`).
- **Due webhook**: `/api/stripe/webhook` (pagamenti, riconosce ordine,
  prenotazione o evento) e `/api/stripe/webhook-account` (requisiti, **thin
  events**). Registrati su Stripe con **«eventi da account connessi»** — con gli
  addebiti diretti l'evento nasce sul conto del cliente, e un endpoint
  registrato per il solo account della piattaforma non riceve **niente**.
- **Pagine di ritorno**: `/checkout/successo` e `/checkout/annullato`.
- SDK aggiornato **14 → 22** (`v2.core.accounts` non esiste nella 14).

**Prova completa riuscita in sandbox**, con un pagamento vero di Francesco:
Stripe consegna `checkout.session.completed` → il codice risponde 200 →
l'ordine passa a `pagato · da evadere` → la pagina mostra il numero d'ordine.

⚠️ **Due difetti trovati provando, non leggendo il codice:**
1. `CLIENT_URL` esiste su Vercel ma non in `.env.local`: senza, `success_url`
   restava relativo e Stripe rifiutava con «Not a valid URL». Ora c'è il ripiego
   sull'origine della richiesta.
2. **Dopo aver pagato si finiva su un 404**: `/checkout/successo` non era mai
   stata creata. Stesso difetto della pagina offerte — un indirizzo scritto
   senza mai aprirlo — nel punto peggiore possibile. Trovato da Francesco
   pagando, non da me verificando.

## ⏭️ Cosa manca

- **Nessun cliente vero ha ancora collegato il conto.** Il primo incasso vero
  non è mai avvenuto.
- **Prenotazioni ed eventi non incassano ancora**: motore e colonne ci sono,
  manca l'interruttore «chiedi il pagamento» e il flusso.
- **I Termini di servizio** vanno aggiornati: i pagamenti sono un rapporto
  diretto fra cliente e Stripe, noi diamo il software. La configurazione tecnica
  da sola non sposta la responsabilità.
- Domanda per il commercialista, **non verificata**: se «fornire lo strumento
  con cui altri incassano» abbia implicazioni fiscali in Italia.

## Due cose da non dimenticare

- **Nei Termini di OltreNova** va scritto che i pagamenti sono un rapporto
  diretto fra cliente e Stripe, e che noi diamo solo il software. La
  configurazione tecnica da sola non sposta la responsabilità.
- **«Nessun rischio» non è vero e non va detto**: esce tutto il rischio
  *finanziario* (incassi, insolvenze, contestazioni, antiriciclaggio). Resta
  quello del **software**: se sbagliamo un importo è colpa nostra, e nessuna
  configurazione Stripe lo sposta.
- ⚠️ Domanda **non verificata**, da girare al commercialista: se «fornire lo
  strumento con cui altri incassano» abbia implicazioni fiscali in Italia.

## Nota tecnica

Stripe considera Standard/Express/Custom ormai **legacy**: per le piattaforme
nuove consiglia l'**API Accounts v2** con le *controller properties*, che
descrivono le stesse responsabilità esplicitamente invece che con un'etichetta.
Il modello non cambia — chi porta il rischio resta la scelta vera. Implementando,
partire da lì.

Vedi [[project_roadmap_sprint]], [[reference_webhook_url_www]].
