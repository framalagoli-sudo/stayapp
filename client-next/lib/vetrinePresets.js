// Registry dei preset di Vetrina. Ogni preset definisce i campi di un elemento:
// pubblici (finiscono in `dati`) e privati/gated (finiscono in `dati_privati`,
// mai spediti al browser pubblico). Aggiungere un verticale (auto, immobili in
// vendita, portfolio…) = un nuovo oggetto qui, ZERO modifiche allo schema DB.
//
// `valorePrimario` e `statoPubblico` indicano quali campi alimentano le colonne
// calde omonime (usate per ordinamento/filtri veloci lato pubblico).
//
// Tipi campo supportati dall'editor: text | textarea | number | currency |
// percent | select | boolean | date | list | geo (mappa) | file | video
// (link YouTube/Vimeo). Le chiavi `breve`, `unita` e `icona` servono solo al
// sito: nell'editor resta il nome lungo, che è quello che toglie i dubbi.

export const VETRINA_PRESETS = {
  progetti_immobiliari: {
    label: 'Progetti immobiliari (flipping)',
    descrizione: 'Opportunità di investimento immobiliare: presenti il progetto con i numeri che contano — quota, rendimento, durata, stato della raccolta — e raccogli i contatti di chi vuole partecipare.',
    elementoLabel: 'Progetto',
    valorePrimario: 'quota_minima',   // colonna valore_primario
    statoPubblico:  'stato',          // colonna stato_pubblico
    numColumns:     ['mq'],           // 2° numerico filtrabile a fascia → colonna num1
    stati: [
      { value: 'in_raccolta',        label: 'In raccolta' },
      { value: 'in_ristrutturazione', label: 'In ristrutturazione' },
      { value: 'in_vendita',         label: 'In vendita' },
      { value: 'concluso',           label: 'Concluso' },
    ],
    campiPubblici: [
      { key: 'stato',              label: 'Stato progetto', type: 'select', optionsFromStati: true },
      { key: 'zona',              label: 'Zona / Città',   type: 'text' },
      { key: 'tipo',              label: 'Tipo immobile',  type: 'select', options: ['Appartamento', 'Villa', 'Palazzo', 'Locale commerciale', 'Terreno'] },
      { key: 'mq',                label: 'Superficie (m²)', type: 'number', breve: 'Superficie', unita: 'm²', icona: 'ruler' },
      { key: 'quota_minima',      label: "Quota minima d'ingresso (€)", type: 'currency', breve: 'Quota minima', icona: 'euro' },
      { key: 'capitale_richiesto', label: 'Investimento totale (€)', type: 'currency', breve: 'Investimento totale', icona: 'target' },
      { key: 'roi_atteso',        label: 'ROI atteso (%)', type: 'percent', breve: 'ROI atteso', icona: 'trending-up' },
      { key: 'durata_mesi',       label: 'Durata stimata (mesi)', type: 'number', breve: 'Durata', unita: 'mesi', icona: 'clock' },
      { key: 'raccolto_perc',     label: 'Raccolto finora (%)', type: 'percent' },
      { key: 'descrizione',       label: 'Descrizione pubblica', type: 'textarea' },
      { key: 'video',             label: 'Video (link YouTube o Vimeo)', type: 'video' },
      { key: 'luogo',             label: 'Mappa — indirizzo o zona', type: 'geo' },
    ],
    // ⛔ I campi riservati non ci sono più (21/09/2026, deciso da Francesco):
    // il business plan e i numeri dell'operazione si mandano a voce o via mail
    // a chi si fa avanti, non si scrivono nel pannello. La CTA resta: serve a
    // raccogliere il contatto, che è l'unica cosa che ci interessa qui.
    campiPrivati: [],
    // Quali numeri stanno in risalto nella scheda (variante «evidenza»): la
    // raccolta come barra, e le tre cifre su cui si decide se approfondire.
    evidenza: {
      avanzamento: { percentuale: 'raccolto_perc', totale: 'capitale_richiesto', etichetta: 'Raccolto' },
      metriche: ['quota_minima', 'roi_atteso', 'durata_mesi'],
    },
    cta: {
      text: 'Voglio partecipare',
      desc: 'Lascia i tuoi dati: ti ricontattiamo con il business plan completo e i numeri riservati.',
      success: 'Richiesta inviata ✓ Ti ricontattiamo a breve con i dettagli riservati.',
    },
  },

  auto: {
    label: 'Auto (nuovo + usato)',
    descrizione: 'Vetrina di veicoli nuovi e usati: presenti le auto con foto e schede, e raccogli richieste di informazioni o prenotazioni prova. Un unico elenco, con filtro nuovo/usato.',
    elementoLabel: 'Auto',
    valorePrimario: 'prezzo',
    statoPubblico:  'condizione',
    numColumns:     ['km'],
    stati: [
      { value: 'nuovo', label: 'Nuovo' },
      { value: 'usato', label: 'Usato' },
    ],
    campiPubblici: [
      { key: 'condizione',    label: 'Condizione', type: 'select', optionsFromStati: true },
      { key: 'marca',         label: 'Marca',      type: 'text' },
      { key: 'modello',       label: 'Modello',    type: 'text' },
      { key: 'allestimento',  label: 'Allestimento', type: 'text' },
      { key: 'anno',          label: 'Anno / immatricolazione (usato)', type: 'number', breve: 'Anno', icona: 'calendar' },
      { key: 'km',            label: 'Chilometri (usato)', type: 'number', breve: 'Chilometri', unita: 'km', icona: 'gauge' },
      { key: 'alimentazione', label: 'Alimentazione', type: 'select', options: ['Benzina', 'Diesel', 'GPL', 'Metano', 'Ibrida', 'Elettrica'] },
      { key: 'cambio',        label: 'Cambio', type: 'select', options: ['Manuale', 'Automatico'] },
      { key: 'potenza_cv',    label: 'Potenza (CV)', type: 'number', unita: 'CV' },
      { key: 'prezzo',        label: 'Prezzo (€)', type: 'currency', icona: 'euro' },
      { key: 'garanzia_mesi', label: 'Garanzia (mesi)', type: 'number', unita: 'mesi' },
      { key: 'consegna',      label: 'Disponibilità / consegna', type: 'text' },
      { key: 'descrizione',   label: 'Descrizione', type: 'textarea' },
    ],
    campiPrivati: [],
    evidenza: { metriche: ['prezzo', 'anno', 'km'] },
    cta: {
      text: 'Richiedi informazioni',
      desc: 'Lasciaci i tuoi dati: ti ricontattiamo per questa auto.',
      success: 'Richiesta inviata ✓ Ti ricontattiamo a breve.',
    },
  },

  viaggi: {
    label: 'Pacchetti viaggio (agenzia)',
    descrizione: 'Catalogo di viaggi e tour: presenti le proposte con foto, itinerario e prezzi, e raccogli richieste di preventivo. Adatto ad agenzie e tour operator.',
    elementoLabel: 'Viaggio',
    valorePrimario: 'prezzo_da',
    statoPubblico:  'tipologia',
    numColumns:     ['durata_giorni'],
    stati: [
      { value: 'mare',      label: 'Mare' },
      { value: 'montagna',  label: 'Montagna' },
      { value: 'citta',     label: 'Città' },
      { value: 'tour',      label: 'Tour' },
      { value: 'crociera',  label: 'Crociera' },
      { value: 'avventura', label: 'Avventura' },
    ],
    campiPubblici: [
      { key: 'tipologia',      label: 'Tipologia', type: 'select', optionsFromStati: true },
      { key: 'destinazione',   label: 'Destinazione', type: 'text' },
      { key: 'luogo',          label: 'Luogo / meta (per la mappa)', type: 'geo' },
      { key: 'durata_giorni',  label: 'Durata (giorni)', type: 'number', breve: 'Durata', unita: 'giorni', icona: 'clock' },
      { key: 'date_partenza',  label: 'Date di partenza', type: 'list' },
      { key: 'prezzo_da',      label: 'Prezzo da (€ a persona)', type: 'currency', breve: 'Prezzo da', icona: 'euro' },
      { key: 'posti',          label: 'Posti disponibili', type: 'number', breve: 'Posti', icona: 'users' },
      { key: 'cosa_include',   label: 'La quota include', type: 'list' },
      { key: 'cosa_esclude',   label: 'La quota non include', type: 'list' },
      { key: 'itinerario',     label: 'Itinerario', type: 'list' },
      { key: 'brochure',       label: 'Brochure / programma (PDF)', type: 'file' },
      { key: 'descrizione',    label: 'Descrizione', type: 'textarea' },
    ],
    campiPrivati: [],
    evidenza: { metriche: ['prezzo_da', 'durata_giorni', 'posti'] },
    cta: {
      text: 'Richiedi preventivo',
      desc: 'Lasciaci i tuoi dati: ti prepariamo un preventivo su misura per questo viaggio.',
      success: 'Richiesta inviata ✓ Ti ricontattiamo con il preventivo.',
    },
  },
}

// Le «aree in evidenza» di una scheda. Un preset che non le dichiara non resta
// senza: si prendono i primi tre campi numerici pubblici, che è quello che un
// mestiere nuovo vorrebbe comunque vedere in grande.
export function evidenzaDi(preset) {
  if (preset?.evidenza?.metriche?.length) return preset.evidenza
  const numerici = (preset?.campiPubblici || [])
    .filter(f => ['currency', 'percent', 'number'].includes(f.type) && f.key !== preset?.statoPubblico)
  return { metriche: numerici.slice(0, 3).map(f => f.key) }
}

// «Durata stimata (mesi)» → etichetta «Durata stimata», unità «mesi».
// L'unità fra parentesi è scritta per l'editor, non per il sito: in una tessera
// larga 90px ruberebbe tutto lo spazio, mentre accanto al numero serve davvero.
// `breve` vince quando c'è: in una tessera «Quota minima d'ingresso» va a capo
// tre volte, nell'editor invece quel nome lungo è quello che toglie i dubbi.
// ⚠️ L'unità la dichiara il preset (`unita`): NON si ricava dalla parentesi,
// perché lì dentro spesso c'è un chiarimento — «Chilometri (usato)» avrebbe
// stampato «120.000 usato». € e % li mette già la formattazione del numero.
export function etichettaEUnita(field) {
  const label = String(field?.label || '')
  return {
    etichetta: field?.breve || label.replace(/\s*\([^)]*\)\s*$/, ''),
    unita: field?.unita || '',
  }
}

export function getPreset(key) {
  return VETRINA_PRESETS[key] || VETRINA_PRESETS.progetti_immobiliari
}

export const PRESET_OPTIONS = Object.entries(VETRINA_PRESETS).map(([key, p]) => ({ key, label: p.label }))

// Risolve le option di un campo select (statiche o derivate dagli stati del preset).
export function fieldOptions(preset, field) {
  if (field.optionsFromStati) return (preset.stati || []).map(s => ({ value: s.value, label: s.label }))
  return (field.options || []).map(o => (typeof o === 'string' ? { value: o, label: o } : o))
}
