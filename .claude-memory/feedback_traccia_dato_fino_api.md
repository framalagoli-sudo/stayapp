---
name: feedback-traccia-dato-fino-api
description: "Verificare sempre che un valore calcolato raggiunga effettivamente le chiamate API, non solo che venga computato"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 86a4ddb3-2e45-4424-877e-cc408b497381
---

Prima di dichiarare un fix fatto, tracciare il dato dal calcolo fino all'uso finale nelle chiamate API.

**Why:** In questa sessione `aziendaId` era calcolato correttamente in ogni pagina ma MAI passato come query param ai fetch. Il bug era invisibile guardando solo il codice di setup. L'errore ha causato frustrazione nel cliente per troppi tentativi a vuoto.

**How to apply:** Quando si aggiunge un parametro di filtro (es. `aziendaId`, `activeAziendaId`):
1. Verificare dove viene calcolato ✓
2. Verificare dove viene USATO nelle chiamate API (`apiFetch`, `fetch`) ✓
3. Verificare che le dipendenze degli `useEffect` includano il parametro ✓

Non dichiarare il fix fatto finché non si è letto il codice di esecuzione (i fetch), non solo quello di setup.
