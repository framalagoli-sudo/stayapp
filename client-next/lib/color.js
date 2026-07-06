// True se il colore (hex #rgb o #rrggbb) è "scuro" → sopra ci va il logo negativo.
// Default: scuro (il footer di default è scuro).
export function isDarkColor(hex) {
  if (!hex || typeof hex !== 'string') return true
  const m = hex.trim().replace('#', '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return true
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum < 0.5
}

// Sceglie il logo giusto per lo sfondo: su scuro usa il negativo se c'è, altrimenti il positivo.
export function logoForBackground(entity, dark) {
  if (!entity) return null
  return (dark && entity.logo_dark_url) ? entity.logo_dark_url : (entity.logo_url || null)
}
