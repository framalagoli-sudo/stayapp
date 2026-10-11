// Le regole dell'editor visuale che servono a tutte e due le metà: il pannello
// e la pagina dentro il riquadro. Senza dipendenze, perché le importa anche il
// disegnatore dei siti pubblici.

// ── Con cosa nasce un blocco trascinato nella pagina ─────────────────────────
// Un blocco appena aggiunto non ha contenuti, e quasi tutti i blocchi senza
// contenuti non disegnano niente: si trascinava una sezione e sulla pagina
// compariva una fascia vuota, da riempire «alla cieca» dalla colonna. Qui il
// blocco nasce già scritto, così si vede subito com'è fatto e si corregge.
//
// ⚠️ Sono dati veri: se si salva senza cambiarli, vanno sul sito così. Per
// questo sono frasi che dicono cosa scriverci, mai un finto contenuto
// credibile, e non c'è nessuna immagine né indirizzo di esempio: una foto non
// sua o un link verso il nulla il cliente non li riconoscerebbe come da cambiare.
// Chi manca qui (immagini, video, dati dell'attività) nasce com'era prima.
const ESEMPI = {
  hero:        { title: 'Il titolo della tua pagina', tagline: 'Una frase che dice cosa fai e per chi.' },
  hero_slider: { slides: [{ image_url: '', title: 'Il titolo della prima immagine', subtitle: 'Una frase che la accompagna.', cta1_text: '', cta1_url: '', cta2_text: '', cta2_url: '' }] },
  about:       { title: 'Un titolo per questa sezione', text: 'Scrivi qui il tuo testo: chi sei, cosa offri, cosa ti rende diverso. Bastano poche righe.' },
  foto_testo:  { title: 'Un titolo accanto alla foto', text: 'Scrivi qui il testo che accompagna la foto. La foto si carica dalla scheda a sinistra.' },
  cta_banner:  { title: 'Un invito a fare qualcosa', subtitle: 'Una frase che spiega perché farlo adesso.' },
  annuncio:    { text: 'Scrivi qui il tuo annuncio' },
  newsletter:  { title: 'Resta aggiornato', subtitle: 'Lascia la tua email per ricevere le novità.' },
  colonne:     { titolo: 'Un titolo per le colonne', items: [
    { title: 'Prima colonna', text: 'Scrivi qui il testo della prima colonna.' },
    { title: 'Seconda colonna', text: 'Scrivi qui il testo della seconda colonna.' },
  ] },
  paragrafi:   { titolo: 'Un titolo per le schede', items: [
    { icon: 'star',  title: 'Prima scheda',   text: 'Descrivi qui il primo punto.',   image_url: '', image_focal: '' },
    { icon: 'heart', title: 'Seconda scheda', text: 'Descrivi qui il secondo punto.', image_url: '', image_focal: '' },
    { icon: 'award', title: 'Terza scheda',   text: 'Descrivi qui il terzo punto.',   image_url: '', image_focal: '' },
  ] },
  highlights:  { titolo: 'I punti in evidenza', items: [
    { icon: 'star',  text: 'Primo punto in evidenza' },
    { icon: 'heart', text: 'Secondo punto in evidenza' },
    { icon: 'award', text: 'Terzo punto in evidenza' },
  ] },
  steps:       { titolo: 'Come funziona', items: [
    { icon: 'check-circle', title: 'Primo passo',   text: 'Descrivi qui cosa succede per primo.' },
    { icon: 'check-circle', title: 'Secondo passo', text: 'Descrivi qui cosa succede dopo.' },
    { icon: 'check-circle', title: 'Terzo passo',   text: 'Descrivi qui come si conclude.' },
  ] },
  stats:       { items: [
    { value: '10+',  label: 'Scrivi cosa conta questo numero' },
    { value: '250',  label: 'Scrivi cosa conta questo numero' },
    { value: '100%', label: 'Scrivi cosa conta questo numero' },
  ] },
  accordion:   { titolo: 'Un titolo per le sezioni', items: [
    { title: 'Prima sezione',   text: 'Scrivi qui il contenuto della prima sezione.' },
    { title: 'Seconda sezione', text: 'Scrivi qui il contenuto della seconda sezione.' },
  ] },
  faq:         { titolo: 'Domande frequenti', items: [
    { question: 'Scrivi qui la prima domanda', answer: 'Scrivi qui la risposta.' },
    { question: 'Scrivi qui la seconda domanda', answer: 'Scrivi qui la risposta.' },
  ] },
  team:        { titolo: 'Le persone', items: [
    { photo_url: '', photo_focal: '', nome: 'Nome e cognome', ruolo: 'Ruolo', bio: 'Due righe su questa persona.' },
    { photo_url: '', photo_focal: '', nome: 'Nome e cognome', ruolo: 'Ruolo', bio: 'Due righe su questa persona.' },
  ] },
  carosello:   { titolo: 'Un titolo per il carosello', items: [
    { image_url: '', image_focal: '', title: 'Prima scheda',   text: 'Scrivi qui il testo della prima scheda.',   button_label: '', button_url: '' },
    { image_url: '', image_focal: '', title: 'Seconda scheda', text: 'Scrivi qui il testo della seconda scheda.', button_label: '', button_url: '' },
    { image_url: '', image_focal: '', title: 'Terza scheda',   text: 'Scrivi qui il testo della terza scheda.',   button_label: '', button_url: '' },
  ] },
  promozioni:  { titolo: 'Le promozioni', items: [
    { badge: '', title: 'Il nome della promozione', text: 'Scrivi qui cosa comprende e per chi è.', cta_label: '', cta_url: '', expires_at: '' },
  ] },
  pacchetti:   { titolo: 'Le proposte', items: [
    { badge: '', name: 'Il nome della proposta', tagline: 'Una riga che la descrive.', price: '', price_label: '', cta_label: '', cta_url: '' },
    { badge: '', name: 'Il nome della proposta', tagline: 'Una riga che la descrive.', price: '', price_label: '', cta_label: '', cta_url: '' },
  ] },
}

// I dati con cui nasce un blocco nell'editor visuale: quelli di sempre, più
// l'esempio se il tipo ne ha uno. `nuovoId` dà un id a ogni elemento di lista.
export function datiDiNascita(type, predefiniti, nuovoId) {
  const dati = JSON.parse(JSON.stringify({ ...(predefiniti || {}), ...(ESEMPI[type] || {}) }))
  for (const lista of ['items', 'slides']) {
    if (Array.isArray(dati[lista])) dati[lista] = dati[lista].map(x => ({ id: nuovoId(), ...x }))
  }
  return dati
}
export function haEsempio(type) { return !!ESEMPI[type] }

// ── Perché una sezione non mostra niente ─────────────────────────────────────
// Nell'editor una sezione che sul sito non comparirebbe resta visibile, e dice
// cosa le manca: «è vuota» non aiuta nessuno a riempirla.
const COSA_MANCA = {
  pulsante:          'compare quando ha un testo e una destinazione: scegli dove porta dalla scheda a sinistra.',
  immagine:          'compare quando carichi l\'immagine dalla scheda a sinistra.',
  galleria_immagini: 'compare quando carichi almeno un\'immagine dalla scheda a sinistra.',
  before_after:      'compare quando carichi tutte e due le immagini dalla scheda a sinistra.',
  clienti:           'compare quando carichi almeno un logo dalla scheda a sinistra.',
  video:             'compare quando incolli l\'indirizzo di un video di YouTube o Vimeo nella scheda a sinistra.',
  embed:             'compare quando incolli il codice nella scheda a sinistra.',
  countdown:         'compare quando scegli la data nella scheda a sinistra.',
  social:            'compare quando aggiungi almeno un social col suo indirizzo dalla scheda a sinistra.',
  testimonianze:     'compare quando aggiungi una recensione con testo e autore dalla scheda a sinistra.',
  form_builder:      'compare quando scegli quale modulo mostrare dalla scheda a sinistra.',
  vetrina:           'compare quando scegli quale vetrina mostrare dalla scheda a sinistra.',
  punteggio:         'mostra il voto preso da Google: compare quando il collegamento con Google è attivo.',
  show_map:          'mostra la mappa: compare quando nelle Informazioni c\'è l\'indirizzo.',
  gallery:           'mostra le foto della Galleria: oggi non ce ne sono.',
  menu:              'mostra il menù del ristorante: oggi non ha piatti.',
  services:          'mostra i servizi: oggi non ce ne sono.',
  activities:        'mostra le attività: oggi non ce ne sono.',
  excursions:        'mostra le escursioni: oggi non ce ne sono.',
  offerte:           'mostra le offerte pubblicate: oggi non ce ne sono.',
  shop:              'mostra i prodotti in vendita: oggi non ce ne sono.',
  eventi:            'mostra gli eventi: oggi non ce ne sono in programma.',
  eventi_slider:     'mostra gli eventi in programma: oggi non ce ne sono.',
  news:              'mostra gli articoli del blog: oggi non ce ne sono di pubblicati.',
  newsletter:        'è spenta nelle impostazioni del sito.',
}
export function cosaManca(type) {
  return COSA_MANCA[type] || 'non mostra ancora niente: riempila dalla scheda a sinistra.'
}

// ── Quali testi si scrivono direttamente sulla pagina ────────────────────────
// Un testo della pagina è scrivibile sul posto se corrisponde a un campo di
// testo del blocco. I campi che non sono parole da leggere — indirizzi, codice,
// scelte da un elenco — restano fuori: lo decide il nome del campo, e la
// stessa regola la applicano la pagina (per offrirli) e il pannello (per
// accettarli), così un messaggio non può scrivere dove la pagina non scrive.
const NON_PAROLE = /(^|_)(id|url|href|src|link|html|token|icon|image|photo|logo|video|focal|formato|variant|variante|style|size|align|bg|network|source|target|height|columns|colonne|filtro|categoria|scheda|expires|at)($|_)/i
const LUNGHEZZA_MASSIMA = 4000

const SONO_PAROLE = /(^|_)(text|testo|label|title|titolo)$/i
export function chiaveScrivibile(k) { return typeof k === 'string' && k.length > 0 && k.length < 40 && (SONO_PAROLE.test(k) || !NON_PAROLE.test(k)) }

// Tutti i campi di testo di un blocco, col percorso per arrivarci:
// ['title'] · ['items', 2, 'text'] · ['items', 0, 'includes', 1].
// Un testo formattato è un documento: lì dentro si scrive nei singoli pezzi di
// testo (['text', 'content', 0, 'content', 0, 'text']), senza toccare né i
// paragrafi né la formattazione.
const PROFONDITA_DOCUMENTO = 14
export function campiDiTesto(dati) {
  const trovati = []
  const eDocumento = v => v && typeof v === 'object' && v.type === 'doc'
  const nelDocumento = (nodo, percorso) => {
    if (!nodo || typeof nodo !== 'object' || percorso.length >= PROFONDITA_DOCUMENTO) return
    if (nodo.type === 'text') { if (typeof nodo.text === 'string' && nodo.text.trim()) trovati.push({ percorso: [...percorso, 'text'], valore: nodo.text }); return }
    if (Array.isArray(nodo.content)) nodo.content.forEach((figlio, i) => nelDocumento(figlio, [...percorso, 'content', i]))
  }
  const guarda = (v, percorso) => {
    if (typeof v === 'string') { if (v.trim() && !/^(https?:|\/|#|mailto:|tel:)/i.test(v.trim())) trovati.push({ percorso, valore: v }); return }
    if (eDocumento(v)) { nelDocumento(v, percorso); return }
    if (!v || typeof v !== 'object' || percorso.length >= 4) return
    if (Array.isArray(v)) { v.forEach((x, i) => guarda(x, [...percorso, i])); return }
    for (const k of Object.keys(v)) if (chiaveScrivibile(k)) guarda(v[k], [...percorso, k])
  }
  if (dati && typeof dati === 'object' && !Array.isArray(dati)) {
    for (const k of Object.keys(dati)) if (chiaveScrivibile(k)) guarda(dati[k], [k])
  }
  return trovati
}

// Il pannello riceve «in questo blocco, a questo percorso, ora c'è scritto
// questo»: restituisce i dati nuovi, oppure null se la richiesta non è una
// di quelle che la pagina può fare. Si scrive solo dove c'è GIÀ un testo, e
// solo in un campo fatto di parole: la forma dei dati non può cambiare.
// Dentro un documento le sole strade sono `content` → posizione → … → `text`
// di un pezzo di testo, che non può restare vuoto (un documento non lo ammette).
export function scriviCampo(dati, percorso, valore) {
  if (typeof valore !== 'string' || valore.length > LUNGHEZZA_MASSIMA) return null
  if (!Array.isArray(percorso) || percorso.length < 1 || percorso.length > PROFONDITA_DOCUMENTO) return null
  const copia = JSON.parse(JSON.stringify(dati || {}))
  let qui = copia, documento = false
  for (let i = 0; i < percorso.length; i++) {
    const k = percorso[i], ultimo = i === percorso.length - 1
    if (!documento && i >= 4) return null
    if (Array.isArray(qui)) { if (!(Number.isInteger(k) && k >= 0 && k < qui.length)) return null }
    else if (documento) { if (k !== (ultimo ? 'text' : 'content') || !Object.prototype.hasOwnProperty.call(qui, k)) return null }
    else if (!(chiaveScrivibile(k) && Object.prototype.hasOwnProperty.call(qui, k))) return null
    if (ultimo) {
      if (typeof qui[k] !== 'string') return null
      if (documento && (qui.type !== 'text' || !valore)) return null
      qui[k] = valore
      return copia
    }
    qui = qui[k]
    if (!qui || typeof qui !== 'object') return null
    if (qui.type === 'doc') documento = true
  }
  return null
}
