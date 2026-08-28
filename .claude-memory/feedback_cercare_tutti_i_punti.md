---
name: feedback_cercare_tutti_i_punti
description: "Il consenso privacy è mancato in TRE posti diversi perché ogni volta l'ho corretto solo dove Francesco me lo segnalava — quando trovo un difetto di classe, vanno cercati tutti i punti"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-28T15:26:24.863Z
---

Il consenso al trattamento dei dati è mancato in **tre punti diversi**, e ogni
volta l'ho scoperto perché Francesco ci è passato sopra:

- **26/08** — escursioni: il modulo non chiedeva nemmeno il nome. Corretto lì.
- **28/08** — attività: stesso identico difetto. Corretto lì.
- **28/08 sera** — widget prenotazione: raccoglieva nome, email e telefono
  **senza chiedere niente**. In archivio c'erano 3 prenotazioni con
  `privacy_accettata: false`, fatte da lui provando. Sue parole: *«non c'è il
  flag con i dati personali, non penso sia a norma»*. Aveva ragione.

**Why**: ogni volta ho corretto **il punto segnalato**, non la **classe** di
difetto. Avevo perfino scritto la regola giusta — «chi altro tocca questo
dato?» — e l'ho applicata al campo che stavo modificando invece che alla
domanda vera: *dove altro raccogliamo dati personali?*

**How to apply**: quando emerge un difetto che riguarda una **categoria** di
cose (dati personali, permessi, prezzi, posti, colonne pubbliche), la
correzione non è finita finché non ho cercato **tutti i punti che fanno la
stessa cosa**. Un `grep` sulla categoria, non sul file.

Per i dati personali, i punti sono quelli che scrivono nome/email/telefono di
un visitatore: moduli guest, widget pubblici, form builder, prenotazioni,
richieste, newsletter, lead delle vetrine. Il controllo sta **sempre nella
route** — la spunta nel browser si toglie con due clic — e si salva la
**prova**: quando è stato dato e quale formula è stata letta, non un booleano.

Vedi anche [[feedback_verificare_il_contesto]] (l'ultimo miglio) e
[[reference_consenso_dati_personali]].
