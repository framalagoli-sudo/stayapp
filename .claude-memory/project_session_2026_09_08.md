---
name: project_session_2026_09_08
description: "Sessione 08/09/2026 — lista d'attesa live, conferma eventi spenta per tutti, calendario booking che nascondeva le prenotazioni, offerte sulle risorse, CRM eventi"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-08T21:06:59.525Z
---

Sei interventi, tutti nati da qualcosa che **non era rotto nel codice ma non
arrivava al cliente**. Migration eseguite: **112** (conferma ospite accesa),
**113** (offerte risorse: `prezzo_modo` + `minimo_notti`).

## 1 · La conferma di prenotazione non partiva per nessuno

`send_guest_confirmation` era `false` su **tutti e quattro** gli eventi
pubblicati, campagna di Garage22 compresa. Chi prenotava leggeva «prenotazione
registrata» e restava senza data, luogo, posti. Chi veniva promosso dalla lista
d'attesa non lo sapeva.

Il default `false` (migration 067) era giusto **allora**: la prenotazione
nasceva «in attesa». La 106 ha cambiato il default a confermata e il flag è
rimasto indietro — non era la scelta di nessuno, era un residuo.

⚠️ **Il default della colonna non basta**: l'editor manda sempre il valore
esplicito, quindi un evento creato dal pannello sarebbe nato spento anche dopo
la migration. `112` + `EventoEditPage.jsx` si muovono insieme.

## 2 · Il calendario booking nascondeva le prenotazioni

Vedi [[reference_intervalli_date_booking]] — è la lezione riutilizzabile.
Tre difetti con una radice sola, misurati sul Furgone di Automax: prenotazioni
corte invisibili, giorni di consegna/riconsegna venduti due volte, chiusure
del cliente che non comparivano.

## 3 · Le offerte sulle risorse esistevano solo per gli slot orari

Vedi [[reference_offerte_risorse]].

## 4 · Eventi: quattro cose chieste da Francesco

- **CRM**: 14 persone avevano prenotato, 1 sola era nei contatti →
  `lib/crm.js`, tag `evento` + titolo. Vedi
  [[reference_accendere_non_e_finire]] per il seguito (lo storico restava
  fuori: Francesco *«in contatti non vedo nulla!»*).
- **I bottoni che il cliente non capiva**: tre pulsanti «→ Stato» uguali sotto
  ogni riga. Chiedevano di scegliere uno **stato del database** mentre chi
  gestisce una serata pensa «questo ha disdetto», «questo lo faccio entrare».
  Ora una sola azione evidente per riga + la spiegazione delle etichette, che
  non c'era mai stata.
- **Pannello invii**: testo modificabile + spunte + «seleziona tutti». Serviva
  perché «ci vediamo domani» e «la cena è spostata alle 21» sono lo stesso
  gesto con due testi diversi.
- **Descrizione formattabile**: `pre-wrap` + `ricco()`. La formattazione
  **esisteva già** (`testo-ricco`, usata per le condizioni del pulsante) e
  nessuno l'aveva mai messa nella descrizione perché nessuno l'aveva scritto
  nell'editor.

## Errori miei, da non ripetere

- **Il default di una migration decide anche per le righe che ci sono già.**
  Ho scelto `prezzo_modo = 'giorno'` per uniformità con gli slot, senza
  chiedermi cosa succedeva all'offerta esistente: per un'ora il sito di
  Automax ha esposto **€4.250** invece di €600. Quando una migration accende
  qualcosa che era spento, la domanda è cosa succede a quello che c'è già.
- **Commento JSX dentro `&& ( … )`**: la parentesi contiene un solo elemento.
  Il build l'ha preso e `main` è rimasto pulito — da lì in poi ho compilato in
  locale invece di usare Vercel come compilatore.
- **Sonde che misurano la cosa sbagliata, due volte**: insert non controllato
  (misurava un database vuoto e dava 6 difetti inesistenti) e `.first()` su un
  pulsante presente in ogni riga (apriva il Furgone credendo di aprire il campo
  da padel). Vedi [[reference_sonde_dati_in_produzione]].

## Aperto

- L'offerta del Furgone è su «per tutto il periodo» (€850): **da confermare col
  cliente** che intendesse quello.
- Le 15 persone importate nel CRM **non** sono iscritte alla newsletter: la
  formula che avevano accettato diceva «per gestire questa prenotazione», e 5
  non hanno nemmeno quella. Se servirà, la strada è l'invito col double opt-in.
