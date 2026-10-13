// L'icona di un sito: quella nella linguetta del browser e fra i preferiti.
// Il cliente la carica in «Marchio e stile» (`minisito.icona_url`, un PNG
// quadrato fatto dal nostro caricamento). Senza, resta tutto com'era: l'icona
// per i telefoni è il logo, il resto lo decide la pagina.
// Senza dipendenze: la usano le pagine e i layout del sito.
const buono = v => (typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v) ? v : null)

export function iconeSito({ icona, logo } = {}) {
  const i = buono(icona)
  if (i) return { icon: [{ url: i, type: 'image/png' }], shortcut: i, apple: i }
  return { apple: buono(logo) || '/icons/apple-touch-icon.png' }
}
