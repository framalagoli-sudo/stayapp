// Sonda diagnostica: cerca overflow orizzontale nelle pagine admin in produzione.
//
// Perché: le liste admin usano `display:grid` con inline styles; senza
// gridTemplateColumns la colonna si dimensiona sul contenuto e la riga sfora la
// scheda (campi e pulsanti finiscono fuori dal riquadro). Vedi il fix di
// RistoranteMenuPage (11/08/2026). Questo script misura invece di dedurre.
//
// Uso:  cd tests && node probe-overflow.mjs [--width 1280]

import { admin, TEST_URL, withProbeSession, gotoAdmin } from './probe-auth.mjs'

const widthArg = process.argv.indexOf('--width')
const WIDTH = widthArg > -1 ? Number(process.argv[widthArg + 1]) : 1280

// Misura eseguita nel browser: elementi il cui contenuto sfora la propria
// larghezza. Si tengono solo le "foglie" (chi sfora senza discendenti che
// sforano) = la causa vera, non la catena di antenati trascinati.
const MEASURE = () => {
  const skipTag = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'SVG', 'PATH', 'IMG', 'CANVAS'])
  const hits = []
  for (const el of document.querySelectorAll('*')) {
    if (skipTag.has(el.tagName)) continue
    const cs = getComputedStyle(el)
    if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue
    if (cs.position === 'fixed' || cs.display === 'none') continue
    const delta = el.scrollWidth - el.clientWidth
    if (delta > 1 && el.clientWidth > 0) hits.push({ el, delta, cs })
  }
  const set = new Set(hits.map(h => h.el))
  const leaves = hits.filter(h => ![...h.el.querySelectorAll('*')].some(d => set.has(d)))

  const describe = el => {
    const parts = []
    for (let n = el; n && n !== document.body && parts.length < 4; n = n.parentElement) {
      let s = n.tagName.toLowerCase()
      if (n.id) s += '#' + n.id
      else if (typeof n.className === 'string' && n.className.trim()) {
        s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.')
      }
      parts.unshift(s)
    }
    return parts.join(' > ')
  }

  return {
    pageScrolls: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    items: leaves
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 8)
      .map(h => ({
        path: describe(h.el),
        delta: h.delta,
        clientWidth: h.el.clientWidth,
        scrollWidth: h.el.scrollWidth,
        display: h.cs.display,
        gridTemplateColumns: h.cs.gridTemplateColumns,
        text: (h.el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70),
      })),
  }
}

async function buildUrls() {
  const first = async table => {
    const { data } = await admin.from(table).select('id').limit(1)
    return data?.[0] ?? null
  }
  const risto = await first('ristoranti')
  const att = await first('attivita')
  const prop = await first('properties')
  const pagina = await first('pagine')
  const form = await first('form_builder')
  const vetrina = await first('vetrine')

  const urls = [
    '/admin',
    '/admin/aziende', '/admin/properties', '/admin/ristoranti', '/admin/attivita',
    '/admin/users', '/admin/staff', '/admin/contatti', '/admin/requests',
    '/admin/prenotazioni', '/admin/eventi', '/admin/blog', '/admin/form-builder',
    '/admin/shop', '/admin/loyalty', '/admin/recensioni', '/admin/survey',
    '/admin/newsletter', '/admin/automazioni', '/admin/piano-editoriale',
    '/admin/content-studio', '/admin/analytics', '/admin/preventivi',
    '/admin/qrcode', '/admin/seo-geo', '/admin/audit-log', '/admin/impostazioni',
    '/admin/security', '/admin/help', '/admin/integrazioni', '/admin/booking',
    '/admin/booking/risorse', '/admin/booking/prenotazioni', '/admin/ai-site-builder',
    // Entità: le pagine con liste annidate (il pattern a rischio)
    '/admin/property/info', '/admin/property/sito', '/admin/property/pagine',
    '/admin/property/vetrine', '/admin/property/services', '/admin/property/activities',
    '/admin/property/excursions', '/admin/property/gallery', '/admin/property/theme',
    '/admin/property/domini', '/admin/property/modules', '/admin/property/chatbot',
  ]
  if (risto) urls.push(
    `/admin/ristoranti/${risto.id}/menu`, `/admin/ristoranti/${risto.id}/sito`,
    `/admin/ristoranti/${risto.id}/pagine`, `/admin/ristoranti/${risto.id}/vetrine`,
    `/admin/ristoranti/${risto.id}/info`, `/admin/ristoranti/${risto.id}/gallery`,
  )
  if (att) urls.push(
    `/admin/attivita/${att.id}/sito`, `/admin/attivita/${att.id}/pagine`,
    `/admin/attivita/${att.id}/vetrine`, `/admin/attivita/${att.id}/info`,
  )
  if (pagina) urls.push(`/admin/pagine/${pagina.id}`)
  if (form) urls.push(`/admin/form-builder/${form.id}`)
  if (vetrina) urls.push(`/admin/vetrine/${vetrina.id}`)
  if (prop) urls.push(`/admin/struttura/${prop.id}/info`)
  return urls
}

await withProbeSession(async ({ page }) => {
  const urls = await buildUrls()
  console.log(`\nSonda overflow — ${urls.length} pagine @ ${WIDTH}px — ${TEST_URL}\n`)

  const report = []
  for (const url of urls) {
    try {
      await gotoAdmin(page, url)
      const res = await page.evaluate(MEASURE)
      if (res.items.length || res.pageScrolls > 1) {
        report.push({ url, ...res })
        console.log(`\n### ${url}   (pagina scrolla: ${res.pageScrolls}px)`)
        for (const it of res.items) {
          const cols = it.display.includes('grid') ? ` cols=${it.gridTemplateColumns}` : ''
          console.log(`  +${it.delta}px  ${it.clientWidth}->${it.scrollWidth}  [${it.display}${cols}]`)
          console.log(`      ${it.path}`)
          console.log(`      "${it.text}"`)
        }
      } else {
        console.log(`ok  ${url}`)
      }
    } catch (e) {
      console.log(`ERR ${url}  ${e.message.split('\n')[0]}`)
    }
  }

  console.log(`\n\n===== RIEPILOGO: ${report.length}/${urls.length} pagine con overflow =====`)
  for (const r of report) {
    console.log(`${r.url}  max +${r.items[0]?.delta ?? 0}px  pagina ${r.pageScrolls}px`)
  }
}, { width: WIDTH })
