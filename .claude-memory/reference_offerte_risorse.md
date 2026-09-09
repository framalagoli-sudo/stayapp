---
name: reference_offerte_risorse
description: Le offerte sulle risorse (risorse_promozioni) valevano solo per gli slot orari; prezzo_modo dice se il prezzo è al giorno o del periodo
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-09T07:13:36.556Z
---

⚠️ **«Offerta» significa due cose diverse** e non vanno confuse (la domanda di
Francesco nasceva proprio da qui):

- **`offerte`** — contenuti da mostrare sul sito, a campo libero, impegno
  *chiedi / prenota / acquista*. **Non si prenotano**: vedi
  [[reference_cosa_si_prenota]].
- **`risorse_promozioni`** — il prezzo speciale di una risorsa prenotabile in un
  periodo. Il pannello si chiama già «Offerte — <risorsa>».

## Il difetto (08/09/2026)

`findPromo` veniva chiamata **solo** dentro `calcolaSlotOrari`. Per la modalità
*slot* funzionava (badge, prezzo, nome nel riepilogo); per **giornaliero** e
**coperti** le offerte venivano lette dal database e mai usate. Il cliente di
Automax aveva creato «Ponte dell'8 dicembre» (€850) e dal 5 al 9 il sito
chiedeva €600, come una settimana qualunque. Un altro caso di
[[reference_motore_senza_porta]].

## Come funziona ora (`lib/offerte-risorsa.js`, migration 113)

- **Due assi**: *quando* (`data_inizio`/`data_fine`) e *quanto dura*
  (`minimo_notti`). Ogni condizione vuota è «sempre» — tranne dove detto sotto.

- ⛔ **Le date valgono in modo diverso secondo il modo del prezzo** (corretto il
  09/09, era il difetto peggiore della funzione):
  - **`periodo`** → vale **SOLO se le date coincidono esattamente**. Un forfait
    è il prezzo di *quel* soggiorno: mezzo ponte non è il ponte, e nemmeno un
    giorno in più lo è. Senza date non vale affatto (costerebbe uguale un giorno
    e tre settimane).
  - **`giorno`** → è il listino di quel periodo, quindi vale per qualsiasi
    tratto ci stia dentro.

  Prima bastava essere *contenuti* nell'offerta: sul Furgone, chi prenotava due
  giorni dentro il ponte pagava **€850 invece di €240** — tre volte e mezzo.

- ⛔ **`offertaQuasi`**: senza, la correzione sarebbe stata peggio del difetto.
  Il calendario colora i giorni del ponte, uno ne sceglie due, paga il listino e
  **non sa perché** — un prezzo che cambia senza spiegazione sembra un errore
  del sito. Il widget mostra un riquadro con le date che servono e il prezzo, e
  toccandolo le imposta.
- **`prezzo_modo`** (`giorno` | `periodo`): su 5 giorni le due letture
  differiscono di **cinque volte**, e prima la sceglieva il codice. Il pannello
  mostra un'anteprima del totale **prima** di salvare, e avvisa se l'offerta
  costa più del listino.
- Fra più offerte valide **vince la più conveniente per chi prenota**, ed è
  scritto: dipendere dall'ordine delle righe farebbe pagare a caso.
- **Il calendario le segnala** (punto colorato + legenda col nome — il tooltip su
  telefono non si apre mai) e il widget mostra nome e prezzo pieno barrato, ma
  solo quando l'offerta conviene davvero.
- **A giornate l'offerta la sceglie il SERVER**, non il client: prima bastava
  nominare l'id di un'offerta qualunque, anche di un'altra risorsa, per averne il
  prezzo. Anche la prenotazione presa al telefono passa dallo stesso conto.

⚠️ Tolti i campi «Ore dalle/alle» dalle risorse a giornate: non vogliono dire
niente lì, e il titolare del Furgone li aveva compilati (09:00–11:00 su un
noleggio). **Un campo fuori posto non viene ignorato: viene riempito.**

⚠️ **Il default di una migration decide anche per le righe esistenti**: avevo
scelto `prezzo_modo = 'giorno'` per uniformità con gli slot, e per un'ora il
sito di Automax ha esposto €4.250 invece di €600. Vedi
[[project_session_2026_09_08]].

Sonde: `probe-offerte-risorse.mjs`, `probe-pannello-offerte.mjs`.
