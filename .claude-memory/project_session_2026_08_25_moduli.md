---
name: project_session_2026_08_25_moduli
description: L'all-in-one è vero anche nel pannello — il tipo non limita più nessuna funzione; chiusi due difetti di privacy trovati nel percorso (password WiFi pubblica, codice server nel bundle browser)
metadata:
  type: project
---

Sessione del 25/08/2026, seguito diretto di [[project_session_2026_08_17_domini]] e
dell'unificazione entità (nota 31 in CLAUDE.md). Richiesta di Francesco: «Andiamo con
i moduli».

**Il recinto non era nei dati, era in tre posti oltre ai dati.** Dopo aver unificato le
tre tabelle in `entita`, il tipo continuava a limitare tutto perché:
1. le **whitelist PATCH** erano una per verticale (una struttura non poteva scrivere
   `menu`) → una sola, `CAMPI_MODIFICABILI` in `lib/entita.js`;
2. il **menu laterale** erano tre liste → `SEZIONI_ENTITA` in `AdminLayout.jsx`;
3. le **select delle pagine pubbliche** erano tre → `CAMPI_ENTITA` in `lib/guest-data.js`.
   Senza questa terza, l'interruttore c'era ma il dato non arrivava comunque al sito.

**Fatto**: pagina Funzioni (`/admin/<tipo>/[id]/funzioni`) con catalogo unico
(`lib/funzioni.js`), chiave assente = preset del tipo (chi c'era prima non vede
cambiare niente), chiave presente = scelta del cliente.

**Due difetti trovati nel percorso, non cercati:**
- la **password WiFi** di un cliente vero (`borgo-del-lago`) viaggiava nel payload di
  ogni pagina pubblica di quella struttura — sito, privacy, cookie, manifest — e nessuna
  aveva `noindex`. La difesa esisteva ma era **a valle** (si toglieva nel ramo minisito),
  quindi ogni ramo aggiunto dopo la scavalcava. Ora si legge a monte solo dove serve.
- il catalogo funzioni stava in `lib/entita.js`, che apre la connessione con la chiave di
  servizio: il pannello lo importava e trascinava codice server nel bundle del browser.
  Nessun segreto esposto (verificato confrontando la **coda** della chiave, non l'inizio),
  ma separato comunque.

**Verificato dal vivo, non dedotto**: 13 siti identici carattere per carattere fra
produzione e build nuova; ogni tipo apre ogni sezione e ne salva i contenuti; le chiavi
di sistema restano non scrivibili; 75/76 smoke verdi (il 76 salta perché l'utente CI non
ha entità — è proprio il test che coprirebbe questo lavoro, lo fanno le sonde).

**Cantiere dichiarato aperto**: le tre PWA ospite (`GuestApp`, `RestaurantApp`,
`AttivitaPWA`) restano separate, con vocabolari annidati diversi
(`modules.home_sections` vs `pwa.modules.home_sections`). Un hotel che accende il menù
lo vede **sul sito**, non ancora nell'app del QR. È il prossimo pezzo dell'all-in-one.

Vedi anche [[reference_dato_riservato_a_monte]] e [[feedback_sicurezza_priorita]].
