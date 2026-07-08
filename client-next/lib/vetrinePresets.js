// Registry dei preset di Vetrina. Ogni preset definisce i campi di un elemento:
// pubblici (finiscono in `dati`) e privati/gated (finiscono in `dati_privati`,
// mai spediti al browser pubblico). Aggiungere un verticale (auto, immobili in
// vendita, portfolio…) = un nuovo oggetto qui, ZERO modifiche allo schema DB.
//
// `valorePrimario` e `statoPubblico` indicano quali campi alimentano le colonne
// calde omonime (usate per ordinamento/filtri veloci lato pubblico).
//
// Tipi campo supportati dall'editor: text | textarea | number | currency |
// percent | select | boolean | date.

export const VETRINA_PRESETS = {
  progetti_immobiliari: {
    label: 'Progetti immobiliari (flipping)',
    descrizione: 'Opportunità di investimento immobiliare: presenti il progetto, mostri i numeri-esca e raccogli soci interessati. I numeri sensibili restano riservati e arrivano solo dopo la richiesta.',
    elementoLabel: 'Progetto',
    valorePrimario: 'quota_minima',   // colonna valore_primario
    statoPubblico:  'stato',          // colonna stato_pubblico
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
      { key: 'mq',                label: 'Superficie (m²)', type: 'number' },
      { key: 'quota_minima',      label: "Quota minima d'ingresso (€)", type: 'currency' },
      { key: 'capitale_richiesto', label: 'Capitale richiesto (€)', type: 'currency' },
      { key: 'roi_atteso',        label: 'ROI atteso (%)', type: 'percent' },
      { key: 'durata_mesi',       label: 'Durata stimata (mesi)', type: 'number' },
      { key: 'raccolto_perc',     label: 'Raccolto finora (%)', type: 'percent' },
      { key: 'descrizione',       label: 'Descrizione pubblica', type: 'textarea' },
    ],
    campiPrivati: [
      { key: 'prezzo_acquisto', label: "Prezzo d'acquisto (€)", type: 'currency' },
      { key: 'budget_lavori',   label: 'Budget ristrutturazione (€)', type: 'currency' },
      { key: 'valore_finale',   label: 'Valore stimato a fine lavori (€)', type: 'currency' },
      { key: 'margine',         label: 'Margine atteso (€)', type: 'currency' },
      { key: 'business_plan',   label: 'Business plan completo', type: 'textarea' },
      { key: 'documenti',       label: 'Documenti (un URL per riga)', type: 'textarea' },
    ],
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
    stati: [
      { value: 'nuovo', label: 'Nuovo' },
      { value: 'usato', label: 'Usato' },
    ],
    campiPubblici: [
      { key: 'condizione',    label: 'Condizione', type: 'select', optionsFromStati: true },
      { key: 'marca',         label: 'Marca',      type: 'text' },
      { key: 'modello',       label: 'Modello',    type: 'text' },
      { key: 'allestimento',  label: 'Allestimento', type: 'text' },
      { key: 'anno',          label: 'Anno / immatricolazione (usato)', type: 'number' },
      { key: 'km',            label: 'Chilometri (usato)', type: 'number' },
      { key: 'alimentazione', label: 'Alimentazione', type: 'select', options: ['Benzina', 'Diesel', 'GPL', 'Metano', 'Ibrida', 'Elettrica'] },
      { key: 'cambio',        label: 'Cambio', type: 'select', options: ['Manuale', 'Automatico'] },
      { key: 'potenza_cv',    label: 'Potenza (CV)', type: 'number' },
      { key: 'prezzo',        label: 'Prezzo (€)', type: 'currency' },
      { key: 'garanzia_mesi', label: 'Garanzia (mesi)', type: 'number' },
      { key: 'consegna',      label: 'Disponibilità / consegna', type: 'text' },
      { key: 'descrizione',   label: 'Descrizione', type: 'textarea' },
    ],
    campiPrivati: [],
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
      { key: 'durata_giorni',  label: 'Durata (giorni)', type: 'number' },
      { key: 'date_partenza',  label: 'Date di partenza (una per riga)', type: 'textarea' },
      { key: 'prezzo_da',      label: 'Prezzo da (€ a persona)', type: 'currency' },
      { key: 'posti',          label: 'Posti disponibili', type: 'number' },
      { key: 'cosa_include',   label: 'La quota include (una voce per riga)', type: 'textarea' },
      { key: 'cosa_esclude',   label: 'La quota non include (una voce per riga)', type: 'textarea' },
      { key: 'itinerario',     label: 'Itinerario', type: 'textarea' },
      { key: 'descrizione',    label: 'Descrizione', type: 'textarea' },
    ],
    campiPrivati: [],
    cta: {
      text: 'Richiedi preventivo',
      desc: 'Lasciaci i tuoi dati: ti prepariamo un preventivo su misura per questo viaggio.',
      success: 'Richiesta inviata ✓ Ti ricontattiamo con il preventivo.',
    },
  },
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
