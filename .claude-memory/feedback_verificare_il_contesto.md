---
name: feedback_verificare_il_contesto
description: Gli errori recenti hanno una radice sola — consegno un pezzo senza verificare il contesto in cui si inserisce. Cosa controllare PRIMA di costruire.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-28T14:39:03.756Z
---

Il 28/08/2026 Francesco me l'ha detto chiaro: *«fai ragionamenti prima di
prendere decisioni che poi, ultimamente, toppi tutte»*. Ha ragione, e non è
sfortuna: quattro «fix» di fila su cose che avevo consegnato io pochi giorni
prima, tutte con **la stessa radice**.

**La radice: costruisco il pezzo senza verificare il contesto in cui va a
finire.** Non sbaglio il pezzo — sbaglio a non guardare cosa c'era già.

Gli esempi, tutti reali:
- **Un pulsante verso una funzione inesistente.** «Prenota per un cliente»
  puntava a una pagina che non sapeva creare prenotazioni, e la route API aveva
  solo la lettura. Non avevo aperto la destinazione.
- **Metà lavoro che crea confusione.** Ho fatto lo shop *leggere* dal catalogo
  e ho lasciato che *scrivesse* nella vecchia tabella. Poi, sistemando un 404,
  ho ricreato la porta di creazione separata — peggiorando ciò che avevo appena
  unificato.
- **Un ramo nuovo senza guardare gli altri.** La modalità «a giornate» mostrava
  «60min» perché non avevo controllato i punti che stampano la durata.
- **Una tabella nuova senza il percorso completo.** Le offerte si salvavano e
  non comparivano sul sito: avevo provato creazione e permessi, non il risultato.

**Why**: ogni volta il codice nuovo era corretto in sé. Il difetto stava nel
punto di **giunzione** con quello che c'era prima — ed è lì che non guardavo.
E li ha trovati Francesco usando il prodotto, non io verificando: questo è il
segnale che il mio controllo finiva troppo presto.

**How to apply — prima di scrivere, quattro domande:**
1. **Dove porta?** Se aggiungo un pulsante o un link, apro la destinazione e
   verifico che esista e faccia quello che prometto. Un pulsante che non porta
   da nessuna parte è peggio di un pulsante assente.
2. **Esiste già?** Prima di aggiungere un posto dove il cliente mette le sue
   cose (o un modo di crearle), cerco se ce n'è già uno. Due porte per la stessa
   stanza sono il difetto più costoso da smontare.
3. **Chi altro tocca questo dato?** `grep` sul campo o sulla tabella prima di
   aggiungere un ramo: gli altri rami vanno aggiornati insieme, non dopo.
4. **Il dato arriva fino in fondo?** Non basta che si salvi: va aperto il posto
   dove dovrebbe comparire. È la regola 7 del progetto, e l'ho violata io.

## L'ultimo miglio (aggiunto il 29/08, dopo che è successo di nuovo)

Le quattro domande qui sopra erano scritte per i **dati**, e non hanno fermato
l'errore successivo: un `case` in uno switch che non veniva mai raggiunto,
perché una scorciatoia sopra lo intercettava. Avevo provato il rendering
pubblico — codice mio, funzionava — e **non avevo mai aperto l'editor**, che è
dove Francesco ci sarebbe arrivato.

**Il pattern vero, più profondo delle quattro domande: verifico il pezzo che ho
scritto, non il percorso che fa lui.** Il pulsante «Prenota per un cliente»
l'avevo scritto e non l'avevo cliccato. Il blocco l'avevo reso e non l'avevo
configurato.

- Prima di dire «fatto» su qualcosa che tocca il pannello o il sito, **apro il
  punto esatto da cui ci arriverebbe lui**, con un browser, cliccando.
- Se non l'ho aperto è **«scritto, non provato»**, e lo dico con queste parole.
- Un ramo mai raggiunto **non dà errore: dà silenzio**. Aggiungendo un `case`,
  controllare che niente lo intercetti prima.

Sue parole il 29/08: *«ti ho detto di aggiornare i file md e continui a fare gli
stessi errori»*. Aveva ragione: la regola c'era ma copriva un caso diverso.

## Quando serve il suo aiuto, chiederlo

Chiesto esplicitamente da Francesco. Ci sono verifiche che da solo non posso
fare, e fingere di averle fatte è il modo più veloce per mandare in produzione
qualcosa di rotto.

- Se non ho potuto provare una cosa, lo **scrivo** e dico **come provarla**:
  quale pagina, cosa cliccare, cosa deve succedere.
- Serve lui per: pagamenti veri, email in arrivo, WhatsApp, un dispositivo, un
  fornitore esterno, un flusso legato al suo account. E per **ogni migration**,
  che esegue lui su Supabase — non dichiarare fatto prima del suo «fatta».
- Quando gli chiedo di provare, do **il percorso preciso**. Un «fai un giro» gli
  scarica addosso il lavoro di capire cosa guardare.

**E una cosa pratica che ho sbagliato tre volte in due giorni**: mai lanciare
`npm run build` mentre gira `npm run dev` — corrompe `.next`, il server
risponde «Cannot find module» o 500 su tutte le pagine, e **sembra un difetto
del codice**. Fermare il dev, poi buildare. Vedi
[[reference_booking_giornaliero]] per le altre trappole di misura.

Vale anche il contrario, ed è la parte buona: quando misuro invece di dedurre,
i difetti vengono fuori. Il calendario ha fatto emergere che un affitto dal 10
al 14 risultava occupato solo il 10 — un bug che avrebbe fatto riaffittare la
stessa casa. Non l'ho trovato ragionando: l'ho trovato guardando i colori delle
caselle.
