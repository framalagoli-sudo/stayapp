---
name: reference_vetrina_evidenza
description: "La variante «numeri in evidenza» delle schede vetrina — quali cifre risaltare lo dice il PRESET, non il codice; e il separatore a forma è il bordo della sezione sotto"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-21T16:14:22.482Z
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

## Secondo giro, stesso giorno (21/09)

- **Icone sulle tessere** (`icona` nel preset, catalogo di `highlightIcon`) e
  stacco dal fondo con **bordo nel colore del tema**. ⚠️ NON uno sfondo
  semitrasparente: la sonda del contrasto salta il testo il cui sfondo ha
  alpha < 0.5, quindi un fondo con trasparenza lo renderebbe **non
  controllato, in silenzio**.
- **Video** (tipo campo nuovo) e **mappa** (`geo`) dopo la descrizione del
  progetto. Nell'`src` dell'iframe non finisce mai la stringa del cliente:
  `getEmbedUrl` riconosce YouTube/Vimeo e ricostruisce l'indirizzo
  dall'identificativo; l'editor avvisa subito se il link non è riconosciuto.
- **Niente più campi riservati** sul preset immobiliare: quei numeri si mandano
  a chi si fa avanti. (`dati_privati` non usciva comunque mai dal pannello.)
- Per provare video e mappa senza toccare i dati veri — Francesco stava
  editando in quel momento — ho creato un elemento **in bozza** e l'ho aperto
  con un **token d'anteprima** firmato a mano (`lib/preview-token.js`,
  segreto `CRON_SECRET`), poi cancellato. Vedi [[reference_anteprima_bozze_token]].

Vedi [[reference_registro_visivo_siti]], [[project_vetrine]],
[[reference_blocco_team_varianti]].
