// Riassunto compatto dei DATI REALI già inseriti per un'entità, da dare in pasto
// all'AI builder: così i testi del sito nascono dai contenuti esistenti (servizi,
// menu, attività, dotazioni, orari, punti forza…) invece di essere ri-digitati.
// Pura formattazione, nessuna dipendenza, safe server-side. Output limitato.
// WHITELIST: emette solo campi pensati per essere pubblici; MAI wifi_password,
// regole interne, ecc. — anche se l'entità viene letta con select('*').

const CAP_ITEMS = 12
const CAP_CHARS = 1800

function tidy(s, n) {
  s = String(s ?? '').replace(/\s+/g, ' ').trim()
  return s.length > n ? s.slice(0, n) + '…' : s
}

function names(arr, ...keys) {
  if (!Array.isArray(arr)) return []
  return arr
    .map(it => (typeof it === 'string' ? it : keys.map(k => it?.[k]).find(Boolean) || ''))
    .filter(Boolean)
}

export function entityDataSummary(entity, entity_tipo) {
  if (!entity) return ''
  const lines = []
  const push = (label, val) => { if (val) lines.push(`${label}: ${val}`) }

  push('Indirizzo', entity.address && tidy(entity.address, 120))
  push('Orari', entity.schedule && tidy(typeof entity.schedule === 'string' ? entity.schedule : JSON.stringify(entity.schedule), 200))
  if (entity.checkin_time || entity.checkout_time) push('Check-in/out', `${entity.checkin_time || '—'} / ${entity.checkout_time || '—'}`)

  const amen = names(entity.amenities)
  if (amen.length) push('Dotazioni', amen.slice(0, CAP_ITEMS).join(', '))

  if (Array.isArray(entity.services) && entity.services.length) {
    const s = entity.services.slice(0, CAP_ITEMS)
      .map(x => (typeof x === 'string' ? x : x?.description ? `${x.name || x.nome || ''} (${tidy(x.description, 60)})` : (x?.name || x?.nome || '')))
      .filter(Boolean)
    if (s.length) push('Servizi', s.join('; '))
  }

  if (Array.isArray(entity.activities)) {
    const items = entity.activities.flatMap(c => names(c?.items, 'name', 'nome'))
    if (items.length) push('Attività', items.slice(0, CAP_ITEMS).join(', '))
  }
  const exc = names(entity.excursions, 'name', 'nome')
  if (exc.length) push('Escursioni', exc.slice(0, CAP_ITEMS).join(', '))

  if (Array.isArray(entity.menu) && entity.menu.length) {
    const cats = entity.menu.slice(0, 6).map(c => {
      const dishes = names(c?.items, 'name', 'nome').slice(0, 6).join(', ')
      const cat = c?.name || c?.categoria || ''
      return cat ? `${cat}${dishes ? `: ${dishes}` : ''}` : ''
    }).filter(Boolean)
    if (cats.length) push('Menu', cats.join(' | '))
  }

  const mini = entity.minisito || {}
  const hl = names(mini.highlights, 'text', 'title')
  if (hl.length) push('Punti forza dichiarati', hl.slice(0, CAP_ITEMS).join(', '))
  if (Array.isArray(mini.stats) && mini.stats.length) {
    const st = mini.stats.slice(0, 6).map(s => `${s?.value || ''} ${s?.label || ''}`.trim()).filter(Boolean)
    if (st.length) push('Numeri', st.join(', '))
  }
  if (Array.isArray(mini.faq) && mini.faq.length) {
    const q = mini.faq.slice(0, 5).map(f => f?.q || f?.question || f?.domanda || '').filter(Boolean)
    if (q.length) push('FAQ', q.join(' | '))
  }

  const gal = Array.isArray(entity.gallery) ? entity.gallery.length : 0
  if (gal) push('Foto in galleria', String(gal))

  const out = lines.join('\n')
  return out.length > CAP_CHARS ? out.slice(0, CAP_CHARS) + '…' : out
}
