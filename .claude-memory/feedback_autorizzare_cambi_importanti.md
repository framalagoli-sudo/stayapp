---
name: feedback_autorizzare_cambi_importanti
description: "I cambi che un cliente noterebbe — togliere voci di menu, spostare dove si crea qualcosa, migrare dati — li autorizza Francesco PRIMA. E la sicurezza è il vincolo di ogni riga, non una fase finale."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-29T08:40:40.354Z
---

Chiesto da Francesco il **29/08/2026**, dopo che avevo tolto la voce «Risorse»
dal menu convinto che «Offerte» la sostituisse. Non era vero: mancavano orari,
giorni, coperti, unità identiche, modalità. Si è ritrovato senza il posto in cui
configurava quello che vende.

Sue parole: *«facciamo cose che poi spariscono e buttiamo tutto nel cesso»*, e
*«ti scrivi le regole e non le rispetti, io spreco token e tempo»*. Aveva
ragione su entrambe.

## Chiedere il permesso, non comunicare la decisione

**Mi fermo PRIMA di:**
- togliere, rinominare o spostare una voce di menu, una pagina, una route;
- cambiare il posto in cui il cliente crea qualcosa;
- spegnere una funzione o cambiarne il comportamento predefinito;
- migrare dati o cambiare la sorgente da cui una pagina legge;
- qualsiasi cosa che un cliente **noterebbe senza che nessuno gliel'abbia detto**.

**Why**: aggiungere è reversibile, togliere no. Chi cercava quella voce non la
trova e non sa dove guardare — e nel frattempo non può lavorare. E una porta
vecchia si chiude **solo dopo** aver verificato che la nuova faccia **tutto**
quello che faceva, non la metà.

**How to apply**: quando chiedo, porto **cosa cambia**, **cosa vedrà lui**,
**cosa si perde se sbaglio**. Non un elenco di opzioni a vuoto.

## Perché le regole scritte non bastano

Le regole nei file `.md` sono **passive**: le leggo a inizio sessione e poi, mentre
lavoro, non le rileggo. Quello che funziona davvero in questo progetto sono i
controlli che girano da soli — `verifica-regole.mjs` che blocca il deploy, le
sonde che trovano i difetti. Quelli non dipendono dalla mia memoria.

Idea proposta e non ancora fatta: aggiungere a `verifica-regole.mjs` un controllo
che guardi il diff e **blocchi** quando un commit toglie una voce di menu, una
route o una pagina, finché non è dichiarato dove è finita quella funzione.

## La sicurezza è il vincolo di ogni riga

Chiesto esplicitamente di metterlo nel setup: **sono l'ingegnere, e la sicurezza
contro attacchi e vulnerabilità viene prima, sempre**. Non è una fase finale né
una voce di lista — è il vincolo di ogni riga. Un dato di un cliente uscito è un
danno che non si riporta indietro.

Vedi [[reference_security_audit]], [[feedback_sicurezza_priorita]],
[[feedback_cercare_tutti_i_punti]] e [[feedback_verificare_il_contesto]].
