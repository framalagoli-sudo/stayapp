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

✅ **Fatto il 29/08/2026**: `verifica-regole.mjs` ha ora un **cancello**. Guarda
il diff `origin/main...HEAD` e, se i commit non ancora pubblicati **tolgono** una
voce di menu, una funzione del catalogo, una pagina o una route, **blocca il
deploy** (exit 1) elencando cosa sparirebbe. Si sblocca solo dichiarando
`autorizzato: <motivo>` nel messaggio di commit — nel messaggio e non in un file,
così l'autorizzazione resta attaccata **a quel** cambiamento e si rilegge nella
storia fra sei mesi. Provato dal vivo su un commit finto che toglieva «Risorse»,
«Menù» e una route: scatta su tutti e tre.

⚠️ Vede solo ciò che è **committato e non ancora pushato**: se qualcosa sparisce
senza passare da un commit, o dopo il push, non lo intercetta.

## La sicurezza è il vincolo di ogni riga

Chiesto esplicitamente di metterlo nel setup: **sono l'ingegnere, e la sicurezza
contro attacchi e vulnerabilità viene prima, sempre**. Non è una fase finale né
una voce di lista — è il vincolo di ogni riga. Un dato di un cliente uscito è un
danno che non si riporta indietro.

Vedi [[reference_security_audit]], [[feedback_sicurezza_priorita]],
[[feedback_cercare_tutti_i_punti]] e [[feedback_verificare_il_contesto]].
