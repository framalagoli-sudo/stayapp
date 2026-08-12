---
name: reference-grid-liste-admin
description: "Liste in display:grid senza gridTemplateColumns si dimensionano sul contenuto: la riga sfora la scheda — usare minmax(0,1fr) + overflowWrap:anywhere; misurare con le sonde, la scansione statica sovrastima"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 7defb6ab-c608-4221-b1b5-1731818ba405
  modified: 2026-08-12T11:01:49.044Z
---

Negli editor admin (inline styles, niente CSS framework) le liste sono spesso
`<div style={{ display: 'grid', gap: 8 }}>`. **Senza `gridTemplateColumns`, la
colonna implicita si dimensiona sul contenuto (min-content), non sul
contenitore.** Se una riga contiene un nome lungo, quel testo impone la
larghezza minima e la riga si allarga oltre la scheda.

Due sintomi che sembrano bug diversi ma hanno questa unica causa:
1. **Gli elementi a destra della riga finiscono fuori dal riquadro** (campi,
   pulsanti icona) e sembrano "non modificabili" perché invisibili.
2. **Il testo non viene troncato con i puntini**: l'ellipsis scatta solo quando
   c'è compressione, e qui il contenitore si allarga invece di stringersi.

**Fix, due pezzi (servono entrambi):**
- `gridTemplateColumns: 'minmax(0, 1fr)'` sulla lista → la riga non deforma più
  il layout. `1fr` da solo NON basta: equivale a `minmax(auto, 1fr)`.
- `overflowWrap: 'anywhere'` sul testo che può essere una **parola sola
  lunghissima**. Senza, il testo tracima comunque dal suo div: il browser va a
  capo da solo su spazi e trattini, ma una parola unica non la può spezzare.
  (Verificato: `14:00-20:00 e su richiesta` andava già a capo sul trattino,
  `SempreApertoSuRichiesta` no.)

**La scansione statica sovrastima: misurare.** Lo scanner degli oggetti `style`
con `display:'grid'` privi di `gridTemplateColumns` dava 10 candidati; con i
dati reali **nessuno** sforava, e alla prova ostile (nome lunghissimo iniettato)
**3 cedevano davvero**. Gli altri reggono perché il loro contenuto va a capo.
Falsi positivi tipici da scartare: testi **statici** nel codice (label
"Etichetta" del form builder, tipi richiesta "Reception"/"Pulizie") e
troncamenti **voluti** (`maxWidth` + ellipsis dentro un wrapper `overflowX:auto`,
come l'audit log). Il difetto è vero solo se il testo che fa cedere è un **dato
inserito dal cliente**.

**Strumenti**: `tests/probe-grid-stress.mjs` (admin) e `probe-guest-stress.mjs`
(PWA ospite) fanno esattamente questa prova ostile; `probe-overflow.mjs` misura
l'overflow coi dati attuali. Vedi [[project_session_2026_08_12]].

**Trovato in**: `RistoranteMenuPage.jsx` (11/08, riga 764px in 622px);
`PropertiesPage` (+227px), `ristorante/RistoranteListPage` e
`attivita/AttivitaListPage` (+150px), e la card check-in di `GuestApp.jsx` —
quest'ultima lato **ospite**, dove il valore è il campo orario scritto dal
titolare e il font è 28px in una colonna da 147px.

Vedi [[feedback_diagnosi_prima_del_deploy]].
