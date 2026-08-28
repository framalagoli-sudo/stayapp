---
name: project_session_2026_08_28b
description: "Sessione 28/08 pomeriggio — blocco Offerte, i blocchi che sparivano in silenzio, promozioni migrate, consenso mancante nel booking"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-28T15:26:45.930Z
---

Sessione nata da una segnalazione di Francesco mentre provava: *«il widget
prenotazione non mi chiede cosa voglio inserire, non ha collegamenti con nulla.
Verifica se anche altri blocchi sono orfani»*. Il censimento ha trovato di più.

## Il censimento dei blocchi

| blocco | leggeva da | esito |
|---|---|---|
| Widget prenotazione | `risorse` | ⚠️ nessuna configurazione, spariva in silenzio |
| Attività / Escursioni | le offerte | ✓ già collegato |
| Vetrina | i Prodotti | ✓ già collegato |
| **Promozioni / Pacchetti** | `minisito.promozioni` (JSONB) | ⚠️ **quarta porta** |

## Cosa è stato fatto

- **Blocco «Offerte»**: prima un'offerta compariva solo travestita da attività o
  escursione — ecco perché la sezione dell'app si chiama ancora «Escursioni».
  Ora ha il suo blocco, con filtro per categoria.
- **I due blocchi guadagnano la configurazione** e **dicono cosa comparirà**, o
  avvisano che resteranno invisibili. Prima sparivano dal sito senza un avviso.
- **Promozioni e pacchetti migrati** (migration `096` + `migra-promozioni.mjs`):
  4 copiati, **non pubblicati**, originali intatti. Prima di copiare ho
  verificato cosa contenevano: cinque cose non avevano dove andare (galleria,
  prezzo barrato, etichetta prezzo, cosa include, cta_url) — migrare senza
  avrebbe buttato via dati di un cliente.
- **`azienda_id` nell'HTML**: Francesco ha chiesto di decidere «per la massima
  sicurezza». Non l'ho tolto — **serve** al blocco blog — ma ho **misurato cosa
  apre**: blog e catalogo shop (pubblici per costruzione), le altre 10 route
  rispondono 401. `probe-azienda-id-esposto.mjs` tiene viva la misura.

## I due errori miei, corretti nella stessa sessione

⚠️ **L'editor del widget non veniva mai raggiunto**: sopra lo switch c'era una
scorciatoia («questo blocco non ha configurazione») che intercettava `booking`.
Avevo provato il rendering pubblico e **mai aperto l'editor**. Da qui la regola
dell'**ultimo miglio** in `CLAUDE.md`.

⚠️ **Il consenso privacy mancava nel widget prenotazione** — il terzo posto.
Vedi [[feedback_cercare_tutti_i_punti]].

## Sonde nuove

`probe-blocco-offerte.mjs` (12 controlli, guarda l'HTML grezzo per ciò che non
deve uscire), `probe-editor-blocchi.mjs` (apre l'editor col browser),
`probe-azienda-id-esposto.mjs`, `probe-widget-giornate.mjs` esteso al consenso.

⚠️ Trappole di misura annotate: «Offerte» è anche una voce di menu (cliccandola
si finisce altrove); i blocchi dell'editor si aprono **uno alla volta**; nella
spunta del consenso c'è un link, e cliccare il testo apre il link invece di dare
il consenso.
