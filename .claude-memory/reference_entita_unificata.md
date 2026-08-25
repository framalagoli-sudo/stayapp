---
name: reference_entita_unificata
description: "Una sola tabella `entita`: il tipo decide solo indirizzo e preset, NON quali funzioni un cliente può usare. lib/entita.js è l'unico accesso; gli alias storici sono un debito con scadenza"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-25T07:33:21.589Z
---

Fatto il 25/08/2026 (migration `079`–`081`). Le tabelle `properties`, `ristoranti`, `attivita` non esistono più per il codice: tutto passa da **`entita`**.

## La regola

**Il tipo non limita nessuna funzione.** Decide l'indirizzo pubblico (`/s/`, `/r/`, `/a/`) e il preset iniziale; cosa un cliente può fare lo dicono i **`moduli`**. Un hotel può avere il menù, un ristorante i servizi, una palestra le prenotazioni. È il modello GoHighLevel, dove il tipo di business non è un recinto.

- `tipo` → tecnico e chiuso: `struttura | ristorante | attivita`
- `settore` → libero ("Officina meccanica"), per AI e SEO, **nessun effetto tecnico**

⚠️ Confonderli fa sparire i siti dal routing: in `attivita.tipo` c'erano già descrizioni libere, e tre entità avevano `attività` **con l'accento** mentre il codice cerca `attivita`. Scoperto dalla verifica del passo 1, prima che facesse danni.

## Come si tocca

`lib/entita.js` è l'unico punto di accesso. `allaFormaStorica` / `dallaFormaStorica` traducono verso i nomi che il pannello usa da sempre: `modules`, `pwa`, e per le attività `tipo` = settore. **Sono un debito dichiarato con scadenza**: quando l'interfaccia userà i nomi nuovi si tolgono in un colpo.

Lo **slug è unico fra tutte le entità**, non più dentro il tipo.

## La lezione che è costata di più

**`next build` non segnala una funzione non importata dentro un handler.** È passato due volte con import mancanti dopo modifiche fatte via script, e la seconda volta ha mandato in **500 le tre route `/api/guest/*` in produzione** — la PWA del QR e le pagine privacy. I siti no: quelli passano da `guest-data.js`, che l'import ce l'aveva, ed è per questo che il confronto dei 13 siti e lo smoke erano verdi.

→ Avevo verifiche solide su ciò che avevo *pensato* di verificare, e un buco su ciò che non avevo pensato. Dopo una modifica per script: controllare a mano che ogni file che usa una funzione la importi.

## Metodo che ha funzionato

Passi separati e verificabili, ognuno a rischio noto: tabella + copia (nessuno la usa) → separazione tipo/settore → sincronizzazione con trigger → migrazione del codice in un colpo → passaggio. Le vecchie tabelle restano come rete finché non si dismettono.

**Un passaggio infrastrutturale dev'essere invisibile**: avevo aggiunto qualche campo in più "già che c'ero" e l'email è comparsa sul sito di un cliente che non la mostrava. Mostrare un campo nuovo è una decisione di prodotto, si prende a parte.

## 📌 Quello che manca

Il pannello **non espone ancora le funzioni fuori dal verticale**: un hotel *può* avere il menù nei dati, ma non vede la voce nel menu laterale. Finché non si fa, l'all-in-one è vero nel database e non nell'esperienza del cliente.

Vedi [[todo_prossima_sessione]], [[project_check_sicurezza_punto_A]].
