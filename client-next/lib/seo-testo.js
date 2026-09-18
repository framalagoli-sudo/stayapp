// La descrizione che Google mostra sotto il titolo, quando il cliente non l'ha
// scritta.
//
// ⛔ Misurato il 18/09/2026 su metodotvb.it: **nessuna** delle quattro pagine
// interne aveva una descrizione. Senza, Google se la inventa pescando un pezzo
// qualsiasi della pagina — spesso il menu o un pulsante. Meglio dargli la prima
// frase vera del contenuto: è la stessa cosa che farebbe una persona.
//
// Resta un ripiego: se il cliente scrive la sua, vince la sua.

const TESTO_DEI_BLOCCHI = ['tagline', 'text', 'sottotitolo', 'subtitle', 'descrizione', 'titolo', 'title']

function pulisci(t) {
  return String(t || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Primo testo sensato dei blocchi, in ordine di pagina. Sotto i 40 caratteri si
// tira dritto: «Chi siamo» come descrizione non dice niente a nessuno.
export function descrizioneDaBlocchi(blocchi, max = 155) {
  for (const b of Array.isArray(blocchi) ? blocchi : []) {
    const d = b?.data || {}
    for (const chiave of TESTO_DEI_BLOCCHI) {
      const t = pulisci(d[chiave])
      if (t.length >= 40) return taglia(t, max)
    }
    for (const it of Array.isArray(d.items) ? d.items : []) {
      const t = pulisci(it?.text || it?.testo)
      if (t.length >= 40) return taglia(t, max)
    }
  }
  return ''
}

// Taglia alla parola intera: una descrizione mozzata a metà parola si legge male.
export function taglia(testo, max = 155) {
  const t = pulisci(testo)
  if (t.length <= max) return t
  const corto = t.slice(0, max - 1)
  const spazio = corto.lastIndexOf(' ')
  return (spazio > max * 0.6 ? corto.slice(0, spazio) : corto).trimEnd() + '…'
}
