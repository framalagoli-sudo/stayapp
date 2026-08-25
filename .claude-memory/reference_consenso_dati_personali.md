---
name: reference_consenso_dati_personali
description: Ogni modulo che raccoglie dati personali chiede il consenso, e il controllo sta nella route — la spunta nel browser si toglie con due clic; si salva la prova (quando + quale testo), non un booleano
metadata:
  type: reference
---

**Il difetto** (25/08/2026): il modulo di prenotazione degli eventi raccoglieva **nome,
email e telefono senza chiedere nulla**, mentre tutti gli altri moduli del prodotto il
consenso lo chiedevano già. Non una svista di forma: un dato personale trattato senza base
dimostrabile. L'ha intuito Francesco chiedendo la funzione, non l'ha trovato un controllo.

**Come si fa, in ordine di importanza:**
1. **Il controllo sta nella route**, non nel form: `if (privacy_accettata !== true) → 400`.
   Una spunta nel browser si toglie con due clic dagli strumenti da sviluppatore. La spunta
   nel modulo è comodità, non è la difesa.
2. **Si salva la prova, non la dichiarazione**: `privacy_accettata`, `privacy_accettata_il`
   e soprattutto **`privacy_testo`** — la formula esatta che la persona ha letto. Se domani
   il testo cambia, le raccolte vecchie restano ricostruibili. Un booleano non basta.
3. **La formula la decide il server** (costante nella route), non il componente: se le due
   copie divergessero, resterebbe salvata una frase che nessuno ha mai letto.
4. Il link all'informativa si ricava dal sito di provenienza (`?back=`) ed è **vincolato allo
   stesso dominio**: un parametro manomesso non deve dirottare chi clicca «privacy».

Sonda: `tests/probe-consenso-eventi.mjs` — prenota **saltando il modulo**, come farebbe uno
script, e verifica che nessun dato personale entri nei tentativi respinti (`false`, `"true"`
come testo, `1` come numero, campo assente).

⚠️ **Da applicare a ogni modulo nuovo che chiede dati a una persona.** Vale anche per i
preventivi, le recensioni e qualunque form futuro.
Vedi [[feedback_sicurezza_priorita]].
