// L'aspetto dell'app del QR, deciso in un posto solo per le tre app
// (struttura, ristorante, attività).
//
// Il cliente lo sceglie senza toccare il sito: lo sfondo in `theme.appSfondo`,
// il resto in `theme.app` (accento, icone, testo, caratteri, schede, angoli,
// intestazione, allergeni). Ogni valore arriva dal database, quindi passa da un
// catalogo chiuso o dal controllo dell'esadecimale; in mancanza vale quello
// del sito, così chi non tocca nulla vede l'app di sempre.
//
// Nessuna scelta può rendere l'app illeggibile: un colore che non contrasta
// con il fondo viene sostituito, e il pannello lo dice (`sostituiti`).
// Il colore principale del marchio non è detto che si legga sullo sfondo —
// Garage 22 ha il nero, che su un'app scura sparisce. Per icone, prezzi e
// pulsanti si usa quindi `primary` = il primo leggibile fra accento scelto,
// principale e secondario, altrimenti il colore del testo. `brand` resta il
// colore originale: serve all'intestazione, che ha sempre scritte bianche.
//
// Questo file lo legge il browser: nessun import che tocchi il server.
import { contrastRatio } from './blockTypes'
import { HEADING_FONTS, BODY_FONTS } from './fonts'

export const SFONDI_APP = [
  { key: 'sito',      label: 'Come il sito' },
  { key: 'scuro',     label: 'Scuro' },
  { key: 'chiaro',    label: 'Chiaro' },
  { key: 'personale', label: 'Un colore mio' },
]
export const SCHEDE_APP = [
  { key: 'ombra', label: 'Con ombra' },
  { key: 'bordo', label: 'Con bordo' },
  { key: 'piatte', label: 'Piatte' },
]
export const ANGOLI_APP = [
  { key: 'rounded', label: 'Arrotondati' },
  { key: 'mixed',   label: 'Leggeri' },
  { key: 'square',  label: 'Squadrati' },
]
export const INTESTAZIONI_APP = [
  { key: 'sito',    label: 'Come il sito' },
  { key: 'pieno',   label: 'Colore pieno' },
  { key: 'sfumato', label: 'Sfumata' },
  { key: 'foto',    label: 'Foto di copertina' },
]
// Gli allergeni sono un obbligo di legge (Reg. UE 1169/2011): si sceglie fra
// stili già leggibili su fondo chiaro e scuro, mai un colore libero.
export const ALLERGENI_APP = [
  { key: 'classico', label: 'Etichetta ambra' },
  { key: 'contorno', label: 'Solo contorno' },
  { key: 'pieno',    label: 'Etichetta scura' },
]

// Gli stili pronti: toccano forma e fondo, mai i colori del marchio.
export const STILI_APP = [
  { key: 'sito', label: 'Come il sito', desc: "L'app riprende il sito", sfondo: 'sito', app: {} },
  { key: 'scuro', label: 'Scuro elegante', desc: 'Fondo nero, titoli classici', sfondo: 'scuro',
    app: { schede: 'bordo', fontTitoli: 'playfair', fontTesto: 'inter', angoli: 'mixed', intestazione: 'pieno' } },
  { key: 'caldo', label: 'Caldo', desc: 'Fondo crema, morbido', sfondo: 'personale',
    app: { sfondo: '#f6efe4', schede: 'ombra', fontTitoli: 'cormorant', fontTesto: 'lato', angoli: 'rounded' } },
  { key: 'minimal', label: 'Minimal', desc: 'Bianco, linee nette', sfondo: 'chiaro',
    app: { schede: 'bordo', fontTitoli: 'dm-sans', fontTesto: 'inter', angoli: 'square', intestazione: 'pieno' } },
]

const SCURO  = { bgColor: '#0f0f13', textColor: '#f2f2f5', subText: '#a9a9b5', cardBg: '#1a1a21', surfaceBg: '#22222b', navBg: '#0a0a0d', borderColor: '#2c2c36' }
const CHIARO = { bgColor: '#ffffff', textColor: '#1a1a2e', subText: '#6b6b76', cardBg: '#ffffff', surfaceBg: '#f7f7f9', navBg: '#ffffff', borderColor: '#efefef' }

const tra = (catalogo, k, predefinito) => catalogo.some(c => c.key === k) ? k : predefinito

export function sfondoApp(theme) {
  return tra(SFONDI_APP, theme?.appSfondo, 'sito')
}

export function esadecimale(c) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(c || '')) ? c : null
}

function esteso(hex) {
  const h = hex.replace('#', '')
  return h.length === 3 ? h.split('').map(c => c + c).join('') : h
}
// `a` mescolato a `b` in proporzione t (0 = a, 1 = b).
function mescola(a, b, t) {
  const [x, y] = [esteso(a), esteso(b)].map(h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)))
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
const scuro = c => contrastRatio(c, '#ffffff') > contrastRatio(c, '#000000')

// Le scelte «solo app», ripulite: quello che non è nel catalogo non esiste.
export function aspettoApp(theme = {}) {
  const a = (theme && typeof theme.app === 'object' && theme.app) || {}
  return {
    sfondo:       esadecimale(a.sfondo),
    accento:      esadecimale(a.accento),
    icone:        esadecimale(a.icone),
    testo:        esadecimale(a.testo),
    fontTitoli:   HEADING_FONTS.some(f => f.key === a.fontTitoli) ? a.fontTitoli : null,
    fontTesto:    BODY_FONTS.some(f => f.key === a.fontTesto) ? a.fontTesto : null,
    schede:       tra(SCHEDE_APP, a.schede, null),
    angoli:       tra(ANGOLI_APP, a.angoli, null),
    intestazione: tra(INTESTAZIONI_APP, a.intestazione, 'sito'),
    allergeni:    tra(ALLERGENI_APP, a.allergeni, 'classico'),
  }
}

export function paletteApp(theme = {}) {
  const scelta = sfondoApp(theme)
  const asp = aspettoApp(theme)
  const bgSito = esadecimale(theme.bgColor) || '#ffffff'

  let p
  if (scelta === 'scuro') p = { ...SCURO }
  else if (scelta === 'chiaro') p = { ...CHIARO }
  else if (scelta === 'personale' && asp.sfondo) {
    // Un fondo scelto a mano: le superfici ne seguono il tono, un po' più
    // chiare se è scuro; sul chiaro le schede restano bianche.
    const bg = asp.sfondo
    p = scuro(bg)
      ? { ...SCURO, bgColor: bg, cardBg: mescola(bg, '#ffffff', 0.07), surfaceBg: mescola(bg, '#ffffff', 0.11), navBg: mescola(bg, '#000000', 0.3), borderColor: mescola(bg, '#ffffff', 0.15) }
      : { ...CHIARO, bgColor: bg, surfaceBg: mescola(bg, '#000000', 0.03), navBg: bg, borderColor: mescola(bg, '#000000', 0.09) }
  } else {
    // Come il sito: fondo e testo del tema. Le superfici seguono il tono del
    // fondo — prima si riconosceva lo scuro solo se era esattamente #1a1a2e, e
    // un sito scuro diverso riceveva schede bianche con testo chiaro.
    const base = scuro(bgSito) ? SCURO : CHIARO
    const testo = esadecimale(theme.textColor)
    p = {
      ...base,
      bgColor: bgSito,
      textColor: testo && contrastRatio(testo, bgSito) >= 4.5 ? testo : base.textColor,
    }
    if (!scuro(bgSito)) p.subText = '#777'
  }
  const isDark = scuro(p.bgColor)

  // Schede piatte su fondo bianco sparirebbero: prendono il grigio chiaro.
  if (asp.schede === 'piatte' && !isDark && contrastRatio(p.cardBg, p.bgColor) < 1.05) p.cardBg = mescola(p.bgColor, '#000000', 0.04)

  // Chi sceglie un colore e non lo vede usato deve saperlo: si annota qui.
  const sostituiti = {}
  const suEntrambi = (c, soglia) => c && Math.min(contrastRatio(c, p.bgColor), contrastRatio(c, p.cardBg)) >= soglia

  if (asp.testo) {
    if (suEntrambi(asp.testo, 4.5)) p.textColor = asp.testo
    else sostituiti.testo = p.textColor
  }

  const brand = esadecimale(theme.primaryColor) || '#e63946'
  const leggibile = c => suEntrambi(c, 3)
  if (asp.accento && !leggibile(asp.accento)) sostituiti.accento = true
  const primary = [asp.accento, brand, esadecimale(theme.secondaryColor)].find(leggibile) || p.textColor
  if (sostituiti.accento) sostituiti.accento = primary
  // Scritta sopra un pulsante del colore principale.
  const onPrimary = contrastRatio('#ffffff', primary) >= 3 ? '#ffffff' : '#111111'

  const icona = asp.icone || esadecimale(theme.iconColor)
  const iconColor = leggibile(icona) ? icona : primary
  if (asp.icone && iconColor !== asp.icone) sostituiti.icone = iconColor

  // Ombre e bordi delle schede: variabili CSS impostate SOLO se il cliente ha
  // scelto uno stile, così chi non tocca nulla vede le ombre di sempre (i
  // componenti tengono il loro valore come ripiego).
  const variabili = {}
  if (asp.schede) {
    variabili['--ombra-scheda'] = asp.schede === 'ombra' && !isDark ? '0 2px 16px rgba(0,0,0,0.07)' : 'none'
    variabili['--bordo-scheda'] = asp.schede === 'bordo' || (asp.schede === 'ombra' && isDark) ? `1px solid ${p.borderColor}` : '1px solid transparent'
  }

  return {
    ...p, isDark, brand, primary, onPrimary, iconColor, sostituiti, variabili,
    fontHeading: asp.fontTitoli || theme.fontHeading,
    fontBody: asp.fontTesto || theme.fontBody,
    borderStyle: asp.angoli || theme.borderStyle,
    intestazione: asp.intestazione,
    stileAllergeni: asp.allergeni,
  }
}

// La scritta e il fondo di un allergene, per ognuno dei tre stili.
export function coloriAllergene(stile, isDark) {
  if (stile === 'contorno') {
    const c = isDark ? '#FCD34D' : '#92400E'
    return { background: 'transparent', color: c, border: `1px solid ${c}` }
  }
  if (stile === 'pieno') return { background: '#78350F', color: '#FFFBEB', border: '1px solid #78350F' }
  return { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }
}
