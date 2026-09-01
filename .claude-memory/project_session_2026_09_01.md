---
name: project-session-2026-09-01
description: "Sessione 01/09/2026 — promemoria email+WhatsApp, la pagina evento che pubblicizzava OltreNova in una campagna a pagamento, il fuso orario; quattro difetti trovati provando invece che leggendo"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-01T22:58:01.840Z
---

# Sessione 1 settembre 2026

Tre cose chieste, **quattro difetti veri** trovati per strada — tutti provando
in produzione, nessuno leggendo il codice.

## 1. I promemoria (chiesto: «procedi con l'email reminder»)

Il motore c'era da mesi e non l'aveva mai usato nessuno: la storia sta in
[[reference_motore_senza_porta]]. Aggiunti tre modelli che si accendono con un
clic e **nascono attivi**. Poi, su richiesta: anche **su WhatsApp** — dettaglio
in [[reference_promemoria_automatici]].

## 2. La campagna che pubblicizzava noi

Francesco: *«facendo una campagna traffico verso una pagina del sito su facebook
appare "oltrenova" e siamo dentro garage22»*. Non era «appare anche»:
**l'anteprima era interamente nostra** — titolo «OltreNova», la nostra
descrizione, il nostro logo. Stava pagando per pubblicizzare OltreNova.
→ [[reference_anteprima_social]]

## 3. Il fuso orario

«10:00» letto nel fuso del server invece che dell'attività: il promemoria
partiva 2 ore prima del dovuto. → [[reference_fuso_orario]]

## I quattro difetti trovati senza che nessuno li cercasse

1. **Il super_admin non poteva creare un'automazione**: i modelli consegnati la
   mattina rispondevano «Accesso negato» proprio a Francesco. Trovato solo
   perché ho **cliccato** invece di guardare. → [[reference_super_admin_senza_azienda]]
2. **Le email automatiche si firmavano «OltreNova»** invece che col nome del
   cliente: il branding leggeva le tabelle ferme dalla migration 079.
3. **Il promemoria entrava in coda «quando capita»**: 4 su 5 dopo tre secondi, il
   quinto dopo trenta. → [[reference_lavoro_dopo_la_risposta]]
4. **Tre aziende di prova rimaste in produzione** dalle mie sonde.
   → [[reference_sonde_dati_in_produzione]]

## Cosa mi porto dietro

- **Cliccare, non guardare.** Il 403 sui modelli è emerso premendo «Attiva»; il
  pannello WhatsApp solo espandendo la card. Aprire la pagina non basta: bisogna
  fare quello che farebbe lui.
- **Verde una volta e rosso la successiva, senza cambi al codice**, non vuol dire
  «rilanciamo»: vuol dire che si misura qualcosa di non deterministico.
- **Una sostituzione su tutto il testo di 12 file li ha riscritti dall'inizio.**
  Se n'è accorto il `next build` e nessun altro. Per modifiche ripetute su molti
  file: riga per riga, e contare quante vanno a segno.
- **Selezionare un'azienda naviga altrove**: per due giri ho misurato la pagina
  sbagliata — la stessa classe di [[reference_sonda_misura_sbagliata]].
- **Un file che esporta una funzione e insieme fa qualcosa al caricamento** è una
  trappola: importarlo spegneva la sonda prima che cominciasse.

## Deciso

- **WhatsApp: restiamo Tech Provider**, niente BSP. Verificato che nel modello
  Tech Provider il cliente possiede il WABA e **paga Meta direttamente**, mentre
  Solution Partner obbligherebbe a condividere la nostra linea di credito — cioè
  a rivendere messaggi, che Francesco non vuole. Il blocco non è tecnico: è la
  verifica business di Meta.
- **Il fuso sta sull'azienda**, non sull'entità.

Migration eseguite da Francesco: **103** (canale WhatsApp in coda), **104** (fuso
orario). Si riprende da [[todo_prossima_sessione]].
