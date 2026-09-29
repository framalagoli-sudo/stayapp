// I colori dell'app del QR, decisi in un posto solo per le tre app
// (struttura, ristorante, attività).
//
// Il cliente sceglie lo sfondo dell'app in `theme.appSfondo`, senza toccare il
// sito: 'sito' (predefinito: come il sito) · 'scuro' · 'chiaro'. Il valore
// arriva dal database, quindi passa da un catalogo chiuso.
//
// Il colore principale del marchio non è detto che si legga sullo sfondo
// scelto — Garage 22 ha il nero, che su un'app scura sparisce. Per icone,
// prezzi e pulsanti si usa quindi `primary` = il primo fra principale e
// secondario che contrasta, altrimenti il colore del testo. `brand` resta il
// colore originale: serve all'intestazione, che ha sempre scritte bianche.
//
// Questo file lo legge il browser: nessun import che tocchi il server.
import { contrastRatio } from './blockTypes'

export const SFONDI_APP = [
  { key: 'sito',   label: 'Come il sito' },
  { key: 'scuro',  label: 'Scuro' },
  { key: 'chiaro', label: 'Chiaro' },
]

const SCURO  = { bgColor: '#0f0f13', textColor: '#f2f2f5', subText: '#a9a9b5', cardBg: '#1a1a21', surfaceBg: '#22222b', navBg: '#0a0a0d', borderColor: '#2c2c36' }
const CHIARO = { bgColor: '#ffffff', textColor: '#1a1a2e', subText: '#6b6b76', cardBg: '#ffffff', surfaceBg: '#f7f7f9', navBg: '#ffffff', borderColor: '#efefef' }

export function sfondoApp(theme) {
  const k = theme?.appSfondo
  return SFONDI_APP.some(s => s.key === k) ? k : 'sito'
}

function esadecimale(c) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(c || '')) ? c : null
}

export function paletteApp(theme = {}) {
  const scelta = sfondoApp(theme)
  const bgSito = esadecimale(theme.bgColor) || '#ffffff'
  const scuroDelSito = contrastRatio(bgSito, '#ffffff') > contrastRatio(bgSito, '#000000')

  let p
  if (scelta === 'scuro') p = { ...SCURO }
  else if (scelta === 'chiaro') p = { ...CHIARO }
  else {
    // Come il sito: fondo e testo del tema. Le superfici seguono il tono del
    // fondo — prima si riconosceva lo scuro solo se era esattamente #1a1a2e, e
    // un sito scuro diverso riceveva schede bianche con testo chiaro.
    const base = scuroDelSito ? SCURO : CHIARO
    const testo = esadecimale(theme.textColor)
    p = {
      ...base,
      bgColor: bgSito,
      textColor: testo && contrastRatio(testo, bgSito) >= 4.5 ? testo : base.textColor,
    }
    if (!scuroDelSito) p.subText = '#777'
  }
  const isDark = scelta === 'scuro' || (scelta === 'sito' && scuroDelSito)

  const brand = esadecimale(theme.primaryColor) || '#e63946'
  // Si legge sia sul fondo sia sulle schede: le icone stanno su entrambi.
  const leggibile = c => c && Math.min(contrastRatio(c, p.bgColor), contrastRatio(c, p.cardBg)) >= 3
  const primary = [brand, esadecimale(theme.secondaryColor)].find(leggibile) || p.textColor
  // Scritta sopra un pulsante del colore principale.
  const onPrimary = contrastRatio('#ffffff', primary) >= 3 ? '#ffffff' : '#111111'
  const icona = esadecimale(theme.iconColor)
  const iconColor = leggibile(icona) ? icona : primary

  return { ...p, isDark, brand, primary, onPrimary, iconColor }
}
