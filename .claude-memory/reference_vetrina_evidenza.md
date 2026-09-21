---
name: reference_vetrina_evidenza
description: "La variante «numeri in evidenza» delle schede vetrina — quali cifre risaltare lo dice il PRESET, non il codice; e il separatore a forma è il bordo della sezione sotto"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-21T12:39:34.227Z
---

**Riferimento di Francesco** (21/09/2026): `walliance.it/project/...` — barra
della raccolta in percentuale e in euro, durata, investimento minimo, ROI, tutto
in riquadri staccati. La sua richiesta: «delle cose evidenziate, e qui devi
intervenire a livello di blocco».

## Come è fatta

`d.variant = 'evidenza'` sul blocco `vetrina` (predefinita resta la scheda di
prima: le vetrine già online non cambiano). Mostra:
- una **barra di avanzamento** con la percentuale in grande e l'obiettivo in euro;
- **tessere** con due o tre cifre, etichetta piccola sopra il numero grande.

⚠️ **Quali numeri NON è scritto nel renderer**: lo dichiara il preset, in
`lib/vetrinePresets.js` → `evidenza: { avanzamento: {percentuale, totale}, metriche: [...] }`.
Per un progetto immobiliare sono quota minima / ROI / durata, per un'auto
prezzo / anno / km. Un preset che non li dichiara prende i primi tre campi
numerici pubblici (`evidenzaDi`), così un verticale nuovo non resta senza.
`breve` e `unita` sui campi servono solo al sito: «Quota minima d'ingresso (€)»
in una tessera va a capo tre volte, e l'unità NON si ricava dalla parentesi
(«Chilometri (usato)» avrebbe stampato «120.000 usato»).

Lo stesso cruscotto (`BarraAvanzamento` + `TessereMetriche`) serve **la scheda
nell'elenco e la pagina del dettaglio**: una definizione, due misure (`grande`).
Nel dettaglio i campi in evidenza **non si ripetono** nell'elenco sotto, e la
barra della raccolta non sta più in fondo alla pagina — dove chi decide non
arriva.

## Il separatore a forma è il bordo della sezione sotto

Il `divisore` con onda/diagonale aveva il grigio **`#f4f4f7` scritto a mano**:
su un sito scuro una **fascia bianca** in mezzo alla pagina (visto da Francesco
su metodotvb). Ora i colori vengono dalle variabili di superficie e c'è
l'opzione «come la sezione sotto», che è ciò che quella forma è davvero.
⚠️ In SVG `fill` **come attributo non risolve `var(--…)`**: va messo come
proprietà CSS (`style={{ fill }}`), altrimenti la forma diventa nera.

Vedi [[reference_registro_visivo_siti]], [[project_vetrine]],
[[reference_blocco_team_varianti]].
