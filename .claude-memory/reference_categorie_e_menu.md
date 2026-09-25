---
name: reference-categorie-e-menu
description: "Menu del pannello (costruisciMenu, sito in cima) e categorie per entità decise da noi (applicaProfilo come copia, niente con contenuti/usato viene nascosto): regole, file, trappole"
metadata:
  node_type: memory
  type: reference
  originSessionId: 814befb6-1136-4fe1-9412-3d749d356419
  modified: 2026-09-25T18:29:50.779Z
---

**Decisioni di Francesco (24/09/2026)**: le funzioni le accendiamo NOI per categoria («gli smanettoni mettono cose che non hanno senso»); la categoria sta sull'ENTITÀ (Borgo del Lago = struttura + 2 ristoranti). Assegnate a tutti i clienti il 25/09 → [[project-strategia-cardine]].

**Menu** — `components/admin/menu-pannello.js` → `costruisciMenu({ruolo, permessi, funzioniAzienda, entita, conEntita})` è l'UNICA regola (barra vera + anteprima profili). Gruppi: Il tuo sito · Contenuti · Clienti · Promozione · Impostazioni (· Piattaforma). Il menu non si disegna finché azienda+entità non sono caricate né senza ruolo noto. Un'entità che ESISTE si vede sempre (Giachini aveva `aziende.moduli.attivita=false` e il titolare non vedeva il sito).

**Categorie** — `profili_mestiere` (migration 128) + `entita.profilo/profilo_versione` e `aziende.funzioni` (129). `lib/applica-profilo.js`: copia nei `moduli` (in cima, annidati in `modules`, alias storici; le altre chiavi wifi/reception/allergens NON si toccano). `aziende.funzioni` = unione dei profili solo se TUTTE le entità hanno categoria, + le funzioni USATE (`lib/uso-funzioni.js`, misura condivisa con la pagina Uso). Funzione di entità con contenuti non si spegne. Alla nascita: `profilo` accettato solo dal super_admin nelle 3 route POST; `SceltaCategoria` obbligatoria nei moduli.

**Il pubblico** legge gli interruttori solo per 4 sezioni dell'app del QR (`ORDINE_OSPITE`: menu, servizi, offerte, galleria): vetrine non c'è.

**Trappole**:
- Verificare il menu di un cliente vero → `tests/probe-menu-clienti.mjs`, con il 2FA FATTO (TOTP). MAI spegnere il 2FA dei clienti. Senza 2FA il server nega l'azienda e il menu sembra sbagliato per tutti.
- Il cancello del deploy: cambi di nome del menu approvati → `autorizzato: <parole di Francesco>` nel commit.

Collegati: [[reference-sonda-misura-sbagliata]], [[feedback_autorizzare_cambi_importanti]].
