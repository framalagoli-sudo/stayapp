---
name: reference-stato-sito
description: "Il pannello «Stato del sito» in cima a Sito web: pubblicato, indirizzo, contenuti, visibilità ai motori — e perché NON dice «indicizzato»"
metadata:
  type: reference
---

Idea di Francesco (18/09/2026, «tipo WordPress»): un cliente non sa dire se il suo sito è pubblicato, a quale indirizzo risponde, se si trova su Google. Le informazioni c'erano tutte, **sparse in cinque pagine** del pannello.

`components/admin/StatoSito.jsx` + `GET /api/entita/[id]/stato-sito?tipo=` (protetta da `requireEntityAccess`), in cima a **Sito web**. Righe: pubblicato · indirizzo ufficiale (e se è il dominio del cliente) · sezioni della home · titolo e descrizione per i risultati · immagine per le condivisioni · quante pagine/articoli/eventi finiscono nella mappa per i motori. Ogni riga mancante ha il pulsante che porta dove si risolve.

- ⚠️ **L'interruttore della visibilità è quello di sempre** (`VisibilitaMotori`), richiamato **dentro** il pannello: due posti per accendere la stessa cosa sarebbero due porte per la stessa stanza.
- ⚠️ **Non dice «indicizzato»**, perché non lo sappiamo: lo sa Google, e serve Search Console ([[project_search_console]]). Dice cosa dipende da noi e che i tempi li decide il motore.
- Il pannello si ricarica quando cambiano pubblicazione o visibilità: senza, resterebbe a dire la cosa di un minuto fa.

**Da fare quando nascerà l'onboarding**: questo pannello è il passo «il tuo sito è pronto» — e lì si decide la domanda ancora aperta, cioè se la visibilità ai motori debba **accendersi da sola** quando il cliente pubblica (oggi ogni sito nuovo nasce invisibile, `DEFAULT false`). → [[reference_seo_primo_giro]], [[project_onboarding_mappa]].

**In Dashboard** (18/09, stessa sessione): `StatoSitoBreve` mette una riga sulla scheda di ogni entità — «Sito online e visibile su Google» oppure **la prima cosa che manca** col numero delle altre («Sito: da pubblicare · +3»). Clic → pagina Sito web. Stessi dati, stessa route: un secondo conteggio direbbe un'altra cosa.

⚠️ **Le schede delle entità in Dashboard le vede solo `admin_azienda`**: provandolo da super_admin la riga non compare, e si direbbe «non funziona» (o peggio, «fatto») guardando la pagina sbagliata. Per provarlo servono un utente effimero `admin_azienda` **e** il 2FA obbligatorio tolto per il tempo del controllo sulla nostra azienda di prova — poi rimesso, verificando che sia tornato `true`.
