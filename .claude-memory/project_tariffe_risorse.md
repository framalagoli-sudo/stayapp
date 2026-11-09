---
name: project_tariffe_risorse
description: "09/11 richiesta Automax: listino a stagioni, minimi per periodo/weekend, promozioni e pacchetti sulle risorse a giornate — analisi data, aspetta 4 risposte di Francesco prima di costruire"
metadata:
  node_type: memory
  type: project
  originSessionId: 27aa2cbe-ae25-41b1-bbe3-526896a77fd3
  modified: 2026-11-09T18:08:31.352Z
---

Richiesta di Francesco del **09/11/2026** per conto di Automax (noleggio): tariffe
giornaliere diverse per stagione (revenue), minimi di noleggio per periodo
(«sabato e domenica insieme», «minimo 3 giorni», «solo settimana»), pacchetti e
promozioni con sconti in certe circostanze.

**Fotografia misurata il 09/11** (sola lettura): in tutta la piattaforma c'è
**una sola** risorsa a giornate — il Furgone di Automax, 120 €/giorno,
`conta_giorno_uscita: true`, partenze lun–sab, nessun minimo, 10 prenotazioni —
e **una sola** offerta: «Ponte dell'8 dicembre» 5→9/12, forfait 850 €.

**Cosa c'è oggi** (`lib/booking-giornaliero.js`, `lib/offerte-risorsa.js`,
usati da 3 route: `booking/public/disponibilita`, `booking/public/prenota`,
`booking/prenotazioni` + widget + anteprima del pannello):
- prezzo = un numero × giorni; minimo/massimo e giorni di partenza **globali**
  della risorsa (in `disponibilita` JSONB, salvati in notti);
- `risorse_promozioni` sostituisce il prezzo (`prezzo_modo` giorno|periodo),
  una sola, la più conveniente; «giorno» vale solo se TUTTO il noleggio sta
  dentro le date → un noleggio a cavallo di due stagioni paga il listino base
  per tutti i giorni; il forfait vale solo a date esatte.

**Soluzione proposta (tre strati, in quest'ordine):**
1. **Stagioni** (tabella nuova `risorse_stagioni`): date, prezzo al giorno,
   prezzo per giorno della settimana facoltativo, regole di durata. Totale =
   **somma giorno per giorno**. Senza stagioni = identico a oggi.
2. **Regole di durata per stagione**: minimo/massimo, giorni di inizio e di
   fine ammessi, «weekend intero», solo settimane; rifiuto con proposta di date.
3. **Promozioni estese** (`risorse_promozioni`): sconto % o importo oltre al
   prezzo fisso, prenotazione anticipata / last minute, pacchetti ricorrenti
   (forfait per forma: «ven→lun 300 €» ogni settimana, `durata_esatta`).
Più: `prenotazioni.dettaglio_prezzo` (fotografia giorno per giorno).

**09/11, seconda proposta di Francesco (migliore, accolta): calendario dei
prezzi giorno per giorno come Octorate**, generico anche per le fasce orarie
(la parrucchiera). Nuovo disegno: tabella unica `risorse_tariffe` (risorsa,
data, fascia oraria facoltativa, prezzo, minimo dall'arrivo, chiuso
all'arrivo, chiuso alla partenza, non vendibile), **sparsa**: solo i giorni
diversi dal prezzo base, quindi senza righe = come oggi. Le «stagioni»
diventano un modo di **scrivere** (modifica in blocco dal–al + giorni della
settimana), non un dato. Minimi e weekend si esprimono con le restrizioni del
giorno (es. weekend intero = chiuso alla partenza il sabato + chiuso
all'arrivo la domenica). Promozioni e pacchetti restano lo strato sopra.
Prima versione del pannello solo per le risorse a giornate; gli slot quando un
cliente lo chiede (lo schema li regge già).

**09/11 — decisioni di Francesco**: promozioni NON cumulabili, vince la
migliore per chi prenota · pannello delle fasce orarie DOPO · il listino lo
compila Automax · il cliente decide come conta la risorsa (furgone: ritiro
sabato mattina, riconsegna domenica sera = 2 giorni = `conta_giorno_uscita`).

**09/11 — FASE 1 SCRITTA, NON COMMITTATA, NON DEPLOYATA:**
- migration `144_risorse_tariffe.sql` (tabella + `prenotazioni.dettaglio_prezzo`)
  → **Francesco deve eseguirla PRIMA del deploy**: provato in locale, senza la
  tabella le route di disponibilità/prenotazione del Furgone rispondono errore.
- `lib/booking-giornaliero.js`: `giorniPagati`, `contoGiornoPerGiorno`,
  `limitiDelPeriodo` (minimo del giorno d'inizio), `restrizioneCalendario`;
  `verificaPeriodo(..., tariffe)`.
- `lib/conto-giornaliero.js` → `contoGiornaliero()`: unico conto server, usato
  dalle 3 route (prima la sequenza era copiata in tre).
- `app/api/booking/risorse/[id]/tariffe` (GET; POST imposta/azzera/copia +364).
- `components/admin/booking/CalendarioPrezzi.jsx` + pulsante «Prezzi e regole»
  sulle risorse a giornate; «Prova un noleggio» chiede alla route pubblica.
- `BookingWidget`: prezzo nel giorno, ritiro/riconsegna vietati non cliccabili,
  parole «ritiro/riconsegna», dettaglio giorni quando i prezzi variano.
- backup (`lib/backup.js`, export azienda), sonde backup-copertura e rls.
- Sonda nuova `tests/probe-calendario-prezzi.mjs` (non ancora girata: serve la tabella).
- Verificato: regole pure (casi furgone/casa), compilazione sul dev server,
  401 senza login, `verifica-regole` pulito. NON provato nel browser.
- Prossimi passi: migration → sonda in locale → pannello aperto col browser →
  commit → deploy → sonde di sicurezza. Poi fase 2 (promozioni % / anticipo /
  last minute / pacchetti ricorrenti `durata_esatta`).

**Domande aperte a Francesco** (risolte il 09/11, sopra):
1. minimo per stagione di **inizio** (consigliato) o per ogni stagione **toccata**;
2. promozioni: una sola, la migliore (consigliato) o cumulabili;
3. stagioni che si ripetono ogni anno da sole, o «copia sul prossimo anno» (consigliato);
4. il listino vero di Automax per provarlo sul caso reale.

**Why:** il Furgone ha già mostrato due volte che sul prezzo i difetti sono
silenziosi (€850 invece di €240, €4.250 invece di €600 per un default di
migration) — vedi [[reference_offerte_risorse]], [[reference_booking_giornaliero]],
[[reference_intervalli_date_booking]].
**How to apply:** colonne nuove nullable, nessun default che cambi le righe
esistenti; una sola funzione pura del conto letta da browser e route; ricordare
chi altro legge il totale (acconto Stripe `quotaOnline`, link di pagamento entro
il totale, email di conferma, backup, cancellazione).
