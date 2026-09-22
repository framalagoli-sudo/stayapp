// I colori di servizio dei blocchi: sfondo delle schede, testo, testo tenue, bordi.
//
// ⛔ Erano scritti a mano 277 volte dentro `LandingBlockRenderer`: `#fff` per una
// scheda, `#1a1a2e` per un titolo, `#888` per una didascalia. Finché tutti i siti
// erano su fondo bianco funzionava. Un sito su fondo scuro invece diventava
// illeggibile — schede bianche e testo nero su una pagina nera — e per questo il
// fondo scuro non era mai stato una scelta possibile.
//
// Ora quei valori sono variabili CSS. ⚠️ In chiaro valgono ESATTAMENTE i colori
// di prima: i siti online non cambiano di un pixel. Cambiano solo se il cliente
// sceglie un tema scuro.

// Luminanza percepita (0 = nero, 1 = bianco). Serve solo a decidere se una
// pagina è scura: non è un calcolo di contrasto WCAG.
export function eScuro(hex) {
  const h = String(hex || '').trim().replace('#', '')
  if (h.length !== 3 && h.length !== 6) return false
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(v, 16)
  if (Number.isNaN(n)) return false
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.45
}

// I valori chiari sono quelli storici, uno per uno. I valori scuri sono la loro
// traduzione: una scheda resta un gradino più chiara del fondo, il testo tenue
// resta tenue senza sparire.
export function variabiliSuperficie(scuro) {
  return scuro
    ? {
      '--sup': '#161622',          // scheda / superficie sollevata
      '--sup-2': '#1e1e2c',        // superficie alternativa (strisce, riquadri)
      '--txt': '#f2f3f7',          // testo forte
      '--txt-medio': '#cfd2dc',
      '--txt-tenue': '#9aa0ad',
      // Misurato il 21/09 su una scheda di metodotvb: `#7b8190` su una
      // superficie sollevata dava 4,22, appena sotto il minimo leggibile.
      // Le etichette piccole sono proprio quelle che non si possono tirare.
      '--txt-fioco': '#909aa8',
      '--bordo': 'rgba(255,255,255,0.14)',
      '--bordo-tenue': 'rgba(255,255,255,0.08)',
      '--ombra': '0 2px 8px rgba(0,0,0,0.5)',
    }
    : {
      '--sup': '#ffffff',
      '--sup-2': '#fafafa',
      '--txt': '#1a1a2e',
      '--txt-medio': '#444444',
      // ⛔ Erano `#888888` e `#aaaaaa`, i valori storici: su bianco danno 3,54
      // e 2,32, cioè **sotto il minimo leggibile** per il testo piccolo, che è
      // esattamente il testo a cui vengono applicati (didascalie, ruoli,
      // etichette). Misurato il 22/09/2026 su inlingua Terni.
      // `#767676` è il grigio più chiaro che arriva a 4,5 su bianco; il tenue
      // sta un gradino sopra, così i due restano distinguibili.
      '--txt-tenue': '#6b6b6b',
      '--txt-fioco': '#767676',
      '--bordo': '#eeeeee',
      '--bordo-tenue': '#f0f0f0',
      '--ombra': '0 2px 8px rgba(0,0,0,0.06)',
    }
}
