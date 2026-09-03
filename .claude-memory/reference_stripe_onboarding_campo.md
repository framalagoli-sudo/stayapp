---
name: reference-stripe-onboarding-campo
description: "L'onboarding Stripe visto dal vivo con un cliente — il ritorno muto, il giro senza uscita, e il nome che pre-compilavamo noi e bloccava la verifica"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-03T22:45:04.939Z
---

**Il 03/09/2026 Francesco è andato da Garage 22 a collegare Stripe. Non è
riuscito, e i tre motivi erano tutti nostri.**

## 1. Il ritorno atterrava su una pagina muta

`return_url` puntava a `/admin/shop`, che di Stripe non sa niente. Chi finiva di
consegnare i dati della propria azienda e un documento d'identità tornava, e non
gli diceva nessuno com'era andata. Il parametro nell'indirizzo c'era già — non lo
leggeva nessuno.

Ora si torna su `/admin/pagamenti`, e la pagina commenta in tutti i casi.
⚠️ L'avviso sta **nell'involucro** della pagina, non nel ramo finale: messo lì
non compariva a chi torna mentre il conto non risulta ancora collegato, che è il
caso peggiore.

## 2. Il giro senza uscita

Il pannello trattava **«non incassa ancora»** come **«mancano dati»**. Ma sono due
cose diverse: Stripe ha un ritardo prima di attivare le carte, e in quel tempo
non manca niente. Lo si rimandava su Stripe, Stripe rispondeva «hai già finito,
conferma», e si tornava al punto di partenza.

La risposta sta in **`awaiting_action_from`**: dice chi deve agire, l'utente o
Stripe. Ora gli stati sono tre — **Attivo · Da completare · In verifica** — e nel
terzo non c'è nessun pulsante che rimanda da nessuna parte.

## 3. ⛔ Il nome lo mettevamo noi, e non era il suo

`verification_failed_name_match` — «Name on the account doesn't match government
records». Passavamo `display_name: az.ragione_sociale`, cioè il nome come sta nel
**nostro** database: «Garage22 srls». Nei registri camerali è scritto altrimenti,
e Stripe confronta le due cose.

Risultato: verifica fallita, incasso bloccato (`past_due`), e un onboarding che
non chiedeva più niente perché per lui i dati erano già stati dati. **La cliente
ha rifatto l'iscrizione due volte.**

Il nome ora non si passa: lo chiede Stripe a chi ce l'ha sulla visura. È il danno
tipico dell'aiuto non richiesto — un dato che il cliente non ha scelto e che noi
non possiamo verificare.

**Si corregge dal pannello Stripe** (Impostazioni → Dati dell'attività), **non
rifacendo l'iscrizione**: quel campo l'onboarding non lo ripropone. La pagina ora
lo dice, col link.

## ⚠️ Il metodo che ha sbloccato tutto

Per un'ora ho indovinato. La soluzione è arrivata **mostrando la risposta grezza
di Stripe in pagina** e facendomela incollare. Da lì, in due minuti: il nome del
requisito stava in `description` (cercavo in `id`, `type`, `field`), e il codice
di errore diceva esattamente cosa non andava.

Quel blocco è rimasto, **visibile solo al super_admin**: i requisiti di Stripe
cambiano, e ricapiterà. Un cliente che apre un blocco di JSON pensa che sia rotto.

⛔ **«Dato richiesto» era la mia scritta di ripiego** per «non so leggere questa
risposta». In pagina sembrava un'informazione: è la ragione per cui la cliente ha
rifatto tutto due volte. Una scritta di ripiego non deve mai sembrare un dato —
meglio una sigla brutta e vera.

Vedi [[reference_stripe_connect]], [[feedback_verificare_il_contesto]].
