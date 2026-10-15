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

// I colori di servizio di UNA sezione che ha uno sfondo suo («Stile sezione»).
// Lo sfondo cambiava solo il fondo: testo, testo tenue e bordi restavano quelli
// della pagina, e ogni blocco doveva rimediare da solo — quasi nessuno lo faceva
// per intero. Su una sezione scura i sottotitoli sparivano, e su un sito scuro
// una sezione «Grigio» o «Bianco» rendeva invisibile il testo di tutti i blocchi
// (misurato il 15/10/2026, 36 su 38).
// `tono`: 'chiaro' (bianco, grigi, un colore del tema chiaro) · 'scuro' (il
// fondo scuro pieno) · 'colore' (colore del tema, sfumato, foto con velo).
//
// ⚠️ Su una sezione scura o colorata le SCHEDE restano quelle della pagina (sul
// sito chiaro, bianche): cambiano solo i testi che stanno direttamente sul fondo.
// Dentro le schede la regola `.lbr-sez-inv [style*="var(--sup"]` del disegnatore
// rimette i colori della pagina, che `variabiliPagina` copia in `--p-…`.
// Così i siti già pubblicati non cambiano faccia: si legge quello che non si leggeva.
export function variabiliSezione(tono) {
  if (tono === 'chiaro') return variabiliSuperficie(false)
  if (tono === 'scuro') {
    const { '--txt': txt, '--txt-medio': medio, '--txt-tenue': tenue, '--txt-fioco': fioco, '--bordo': bordo, '--bordo-tenue': bordoTenue } = variabiliSuperficie(true)
    return { '--txt': txt, '--txt-medio': medio, '--txt-tenue': tenue, '--txt-fioco': fioco, '--bordo': bordo, '--bordo-tenue': bordoTenue }
  }
  return {
    '--txt': '#ffffff',
    // Il testo piccolo sul colore del tema deve stare quasi bianco: già a 0,65
    // su un blu medio scende a 3,3, e uno sfumato verso un arancio scuro chiede 0,92.
    '--txt-medio': 'rgba(255,255,255,0.95)',
    '--txt-tenue': 'rgba(255,255,255,0.92)',
    '--txt-fioco': 'rgba(255,255,255,0.9)',
    '--bordo': 'rgba(255,255,255,0.24)',
    '--bordo-tenue': 'rgba(255,255,255,0.14)',
  }
}

// I colori della pagina, copiati in `--p-…`: servono alle schede dentro una
// sezione scura o colorata per tornare ai colori della pagina (vedi sopra).
export function variabiliPagina(scuro) {
  const v = variabiliSuperficie(scuro)
  const out = {}
  for (const k of ['--txt', '--txt-medio', '--txt-tenue', '--txt-fioco', '--bordo', '--bordo-tenue']) out['--p-' + k.slice(2)] = v[k]
  return out
}
