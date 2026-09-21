---
name: project_sezioni_universali
description: "DA ANALIZZARE — sezioni riusabili da mettere su più pagine e governate da un punto solo (idea di Francesco, 21/09/2026)"
metadata: 
  node_type: memory
  type: project
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-21T16:30:16.256Z
---

**Da dove nasce** (21/09/2026): Francesco ha voluto la stessa CTA — pulsante
«Scopri i progetti in corso» + banner «Pronto a Diversificare il Tuo Capitale?»
— su quattro pagine di metodotvb. Oggi l'unico modo è **copiare i blocchi**: sono
quattro copie indipendenti, e cambiare il testo vuol dire cambiarlo quattro
volte. Parole sue: *«potremmo creare delle sezioni "universali" da mettere su
pagine a scelta - non male - segna come cosa da analizzare»*.

**Cosa sarebbe**: una sezione (uno o più blocchi) definita **una volta** e
richiamata su più pagine; la si modifica in un posto e cambia ovunque.

**Nodi da sciogliere prima di scrivere codice** — nessuno è deciso:
- **Dove vivono**: tabella nuova, o pagine con un flag «sezione», o dentro
  `minisito`? Ricordare che il blocco deve arrivare fino al renderer SSR.
- **Come si inseriscono in pagina**: un tipo di blocco `sezione` che punta a un
  id — e allora il renderer deve risolverlo *prima* di rendere (SSR, senza un
  secondo giro di rete).
- **Cosa si può cambiare per pagina**: niente (identica ovunque) o qualche
  sovrascrittura (es. il testo del pulsante)? La seconda è la strada che negli
  altri prodotti diventa ingestibile.
- **Cosa succede quando si cancella** una sezione usata in cinque pagine.
- **L'anteprima e l'editor**: chi modifica la copia in pagina deve capire che
  sta toccando **tutte** le pagine. Se non si vede, è una trappola.
- ⚠️ Esiste già un caso vicino: header e footer sono configurati una volta e
  valgono ovunque (`header_cfg` / `footer_cfg`, anche per-pagina). Guardare
  come sono fatti prima di inventare un secondo meccanismo.

**Priorità**: bassa finché resta un caso solo (metodotvb, 4 pagine). Diventa
seria quando un cliente le cambia spesso, o quando le pagine di un sito sono
tante. Vedi [[project_block_system_roadmap]].
