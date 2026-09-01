---
name: reference-motore-senza-porta
description: Una funzione che esiste, funziona e non l'ha mai usata nessuno non è "fatta" — manca la porta d'ingresso; il rimedio sono modelli già scritti che nascono attivi
metadata:
  type: reference
---

**Il promemoria delle prenotazioni esisteva da mesi e funzionava. In tutta la
storia del progetto: ZERO automazioni configurate, ZERO messaggi programmati.**

Non era rotto. Il trigger `pre_visita` calcola davvero *data della visita meno X
ore* e il cron gira ogni minuto — provato con `probe-promemoria.mjs`. Il motivo
per cui non l'ha usato nessuno è che per **averne una** bisognava comporre a
mano: evento scatenante, ritardo in ore, oggetto, intestazione, testo, pulsante.
È lavoro da chi conosce lo strumento, e chi compra OltreNova ha un'attività da
mandare avanti.

**Un codice mai eseguito non è codice che funziona: è codice che non ha ancora
fallito.**

## Come si riconosce la stessa classe

La domanda non è «funziona?» ma **«quante volte è stato usato davvero?»**. Si
misura sul database, non sul codice:

```sql
select count(*) from automazioni;        -- 0
select count(*) from automazioni_log;    -- 0
```

`project_onboarding_mappa` aveva già misurato **15 funzioni a ZERO uso**. Quelle
non sono funzioni da rifare: sono funzioni **senza porta d'ingresso**. Prima di
costruire l'ennesima, guardare se quella che c'è ha un modo per essere accesa.

## Il rimedio: modelli, non un campo vuoto

`lib/automazioni-modelli.js` — tre messaggi già scritti (promemoria 24h prima,
ringraziamento con link recensione, risposta a chi scrive). Dove c'era «Nessuna
automazione» ora ci sono tre schede con «Attiva».

- **Nascono ATTIVI.** Un modello che si accende e resta spento è una porta che
  si apre su un'altra porta.
- **Partire da un testo da correggere è molto più facile che partire dal
  vuoto**: il cliente cambia le parole, non inventa la struttura.
- ⚠️ **I nomi dei campi sono quelli veri dello step** (`subject`, `heading`,
  `text`, `cta_text`, `cta_url`). Un modello con nomi inventati crea automazioni
  **mute**: partono, non scrivono niente, e nessuno capisce perché. La prima
  versione della sonda usava `oggetto`/`testo` e faceva sembrare rotto il motore.
- ⚠️ `entity_tipo` è obbligatorio: un'automazione appartiene a un'attività, non
  solo a un'azienda.
- ⚠️ `{{link_recensione}}` esiste **solo** dopo la visita: in un modello «prima»
  darebbe un pulsante che porta nel vuoto.

Vedi [[project_onboarding_mappa]], [[feedback_verificare_il_contesto]].
