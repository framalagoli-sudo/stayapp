---
name: project_tariffe_risorse
description: "Calendario dei prezzi (risorse_tariffe) + offerte con sconto/anticipo/last minute/pacchetti sulle risorse a giornate — fasi 1 e 2 LIVE il 10/11 (Automax); restano spiegarlo ad Automax e 2 sonde da sistemare"
metadata:
  node_type: memory
  type: project
  originSessionId: 27aa2cbe-ae25-41b1-bbe3-526896a77fd3
  modified: 2026-11-10T07:09:37.619Z
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

**10/11 sera — noleggio di UN giorno** (commit 4876b8bd, LIVE): 13→13 rifiutato perché il minimo predefinito era 1 notte = 2 giorni; ora `minimoPredefinito` 0 per chi conta i giorni, 1 giorno = 0 notti, secondo tocco sullo stesso giorno nel widget. Provato sul sito vero da telefono (1 giorno · €120). Pannello (campo «Giorni minimi» che ora parte da 1) scritto, non aperto. Automax aveva già compilato il calendario: weekend 14–15, 21–22, 28–29/11 a 150 € con minimo 2 giorni, dicembre 12–24 a 110 € con minimo 7 giorni.

**10/11 — FASE 2 LIVE E VERIFICATA** (commit ed0553f3, migration 145
eseguita al 1° colpo, CLAUDE.md nota 92). Sconto %/importo, in anticipo, last
minute (fuso azienda), pacchetto che si ripete (`durata_esatta`), non
cumulabili. `datiOffertaPuliti` unica pulizia. Sonde verdi in produzione:
probe-offerte-sconti (26), probe-calendario-prezzi, probe-calendario-prezzi-browser
(anche il pacchetto creato dal pannello e visto nel widget). Furgone invariato
(360 € / ponte 850 €). Il deploy è stato fermato dal sistema per memoria
DOPO Vercel+push+smoke 74/74: le sonde mancanti lanciate a mano, tutte verdi;
resto ZZ-SSRF pulito con cancellaAziendaDiProva.
🔒 Stesso giorno: buco offerte su risorsa altrui (deploy a sé, SECURITY-CHECK
10/11) e offerta slot non ricontrollata (dentro la fase 2).
Da fare: dire ad Automax dove si trovano «Prezzi e regole» e i tipi di offerta;
sistemare probe-widget-giornate e probe-registrazione (riconoscere il 429).

**10/11 — FASE 1 LIVE E VERIFICATA** (commit a716ea52 → f72e8243, CLAUDE.md
nota 92). Migration 144 eseguita al 2° tentativo (il 1° non era arrivato:
mancava anche la colonna — verificare sempre una colonna). Sonde verdi in
produzione: probe-calendario-prezzi (36) e probe-calendario-prezzi-browser
(pannello da titolare computer+telefono, widget). Deploy: smoke 74/74,
enumerazione verde dopo la correzione (GET senza date = da ieri a +1 anno).
Furgone vero invariato (23→25 = 360 €, nessun prezzo speciale finché Automax
non compila). Rossi del deploy NON nostri: robots Cloudflare (5 sottodomini) e
probe-registrazione (limite 5/ora del rinvio con due deploy in un'ora).
Da fare: dire a Automax dove compilare (Calendario e risorse → Risorse →
«Prezzi e regole»); FASE 2 promozioni; sistemare probe-widget-giornate
(cerca il nome della risorsa, ma con una risorsa sola il widget salta l'elenco).
Dopo il deploy si può togliere il browser di prova vecchio (chromium-1234, ~0,7 GB).

**09/11 — FASE 1 (stato di allora):**
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
