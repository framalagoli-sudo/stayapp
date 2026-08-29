---
name: reference_cosa_si_prenota
description: "Prenotabili sono SOLO Risorse (Booking) ed Eventi. Prodotti e Offerte no: si acquistano o si chiedono. Una risorsa non è un prodotto e non va mai spostata né confusa con il catalogo."
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-29T14:09:06.045Z
---

Stabilito da Francesco il **29/08/2026**, dopo che avevo sbagliato **tre volte
di fila** nella stessa conversazione. Sue parole, da non riscrivere:

> «RISORSE NON DEVE SPARIRE! è dove si fa il setup di COSA PRENOTARE.»
>
> «una risorsa non è un prodotto, una risorsa è una risorsa — entità separata e
> che deve sempre rimanere tale. le risorse sono delle configurazioni di cose
> prenotabili. i prodotti non sono prenotabili, posso chiedere informazioni a
> riguardo, posso acquistarli ma non posso prenotarli... **l'offerta non è
> prenotabile, è qui che ti sei confuso!**»

## La mappa

| | prenotabile | a cosa serve |
|---|---|---|
| **Risorse** (Booking) | **sì** | la configurazione di ciò che si può prenotare: furgone, casa, campo, tavolo. Orari, unità, capienza, chiusure |
| **Eventi** | **sì** | un fatto che accade, con inizio e fine. Strada propria (vedi [[project_prenotazioni_unificate]]) |
| **Prodotti** (catalogo) | no | collegati a **Shop** (acquisto) e a **Offerte** |
| **Offerte** | no | lo strato sopra il catalogo: si **chiede** (lead nel CRM) o si **acquista** |

## Cosa non fare mai più

- **Non spostare «Risorse»** dal menu, non migrarla dentro Offerte, non
  trasformarla in un attributo dei Prodotti. È un'entità separata **per
  decisione di prodotto**, non per come è finita nel database.
- **Non aggiungere `impegno: 'prenota'`** alle offerte. Gli impegni sono due:
  `chiedi` e `acquista`.
- Un'offerta può **pescare dal catalogo** (`offerte.prodotto_id`, migration
  `092`, tendina «Quale prodotto stai promuovendo») **oppure** essere ad hoc.
  Finita l'offerta il prodotto resta — `ON DELETE SET NULL`.

## Come si è rotto e come è rientrato

Il 28/08 avevo copiato le risorse dentro le offerte con `migra-risorse.mjs` e
fatto leggere al `BookingWidget` le offerte. Risultato: il «Furgone» compariva
**due volte** sul sito di Automax. Rientrato il 29/08 — 0 prenotazioni erano
passate da un'offerta, quindi pulito. Script cancellato.

Stesso giorno, secondo guasto: il blocco «Offerte» puntava a
`/{s|r|a}/[slug]/offerte/[id]`, una pagina **mai creata**. Tutte le offerte
pubblicate rispondevano **404** — pulsante scritto senza aprire la destinazione,
vedi [[feedback_verificare_il_contesto]]. Ora le tre pagine esistono, con il
modulo «Richiedi informazioni» che porta il lead nel CRM (`source: 'offerta'`,
tag `offerta`, nota con il titolo) e WhatsApp come scorciatoia dove il numero
c'è — **solo 2 entità su 15 lo hanno**, quindi il modulo resta il principale.

Il lead deve restare al cliente: WhatsApp è inoltro, non sostituzione. La
notifica su WhatsApp al titolare oggi **non può partire** — 0 account collegati,
canale Meta fermo, vedi [[project_whatsapp_fase0]].

Sonda: `tests/probe-pagina-offerta.mjs` — apre ogni offerta pubblicata con un
browser, clicca, invia e verifica che il contatto arrivi nell'azienda giusta.
Controlla anche che **non compaia mai la parola «Prenota»** su una pagina offerta.

Vedi anche [[project_catalogo_strati]], [[reference_booking_giornaliero]],
[[feedback_autorizzare_cambi_importanti]].
