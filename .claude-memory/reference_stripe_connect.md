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

## A carico di Francesco (aperto al 30/08)

1. Attivare Connect su `dashboard.stripe.com/connect/settings/profile`, dichiarando:
   software, **nessuna commissione trattenuta**, non gestisce i fondi
2. Scegliere **Standard** + **addebiti diretti** + **nessuna commissione**
3. Passare il **client ID** (`ca_...`) e autorizzare il ritorno
   `https://www.oltrenova.com/api/stripe/connect/callback`
   ⚠️ **su `www`, mai sull'apex** — l'apex dà 308, vedi [[reference_webhook_url_www]]

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
