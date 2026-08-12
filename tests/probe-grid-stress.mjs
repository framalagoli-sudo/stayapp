// Prova ostile: le liste admin reggono un nome lungo inserito da un cliente?
//
// probe-overflow.mjs misura il layout con i DATI DI OGGI. Questa sonda invece
// inietta nella prima riga di ogni `display:grid` una stringa lunga senza spazi
// (il caso reale: un nome/URL/email che non va a capo) e verifica se la riga
// esce dal contenitore. Serve a decidere se il fix `minmax(0, 1fr)` è difesa
// necessaria o zelo inutile — e a distinguere le grid già protette (controprova).
//
// Uso:  cd tests && node probe-grid-stress.mjs [--width 1280]

import { admin, withProbeSession, gotoAdmin } from './probe-auth.mjs'

const widthArg = process.argv.indexOf('--width')
const WIDTH = widthArg > -1 ? Number(process.argv[widthArg + 1]) : 1280

const STRESS = () => {
  const LONG = 'Ristorante' + 'X'.repeat(90)
  const out = []

  const grids = [...document.querySelectorAll('*')].filter(el => {
    const cs = getComputedStyle(el)
    return cs.display === 'grid' && el.children.length > 0 && el.clientWidth > 0
  })

  for (const grid of grids) {
    const cs = getComputedStyle(grid)
    const row = grid.firstElementChild
    if (!row) continue

    // primo nodo di testo non vuoto della riga = tipicamente il nome in elenco
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
    let node = null
    while ((node = walker.nextNode())) if (node.nodeValue.trim()) break
    if (!node) continue

    const before = {
      gridDelta: grid.scrollWidth - grid.clientWidth,
      rowOut: Math.round(row.getBoundingClientRect().right - grid.getBoundingClientRect().right),
    }
    const original = node.nodeValue
    node.nodeValue = LONG
    const after = {
      gridDelta: grid.scrollWidth - grid.clientWidth,
      rowOut: Math.round(row.getBoundingClientRect().right - grid.getBoundingClientRect().right),
    }
    node.nodeValue = original

    // Sfora solo DOPO l'iniezione = la lista non regge nomi lunghi
    if (after.rowOut > 1 || after.gridDelta > 1) {
      const parts = []
      for (let n = grid; n && n !== document.body && parts.length < 3; n = n.parentElement) {
        let s = n.tagName.toLowerCase()
        if (typeof n.className === 'string' && n.className.trim()) {
          s += '.' + n.className.trim().split(/\s+/)[0]
        }
        parts.unshift(s)
      }
      out.push({
        cols: cs.gridTemplateColumns,
        path: parts.join(' > '),
        width: grid.clientWidth,
        before, after,
        sample: original.trim().slice(0, 40),
      })
    }
  }
  return out
}

async function targets() {
  const first = async table => {
    const { data } = await admin.from(table).select('id').limit(1)
    return data?.[0]?.id ?? null
  }
  const risto = await first('ristoranti')
  const att = await first('attivita')
  const pagina = await first('pagine')
  const form = await first('form_builder')
  const vetrina = await first('vetrine')

  const urls = [
    '/admin', '/admin/aziende', '/admin/properties', '/admin/ristoranti',
    '/admin/attivita', '/admin/users', '/admin/staff', '/admin/contatti',
    '/admin/eventi', '/admin/blog', '/admin/form-builder', '/admin/shop',
    '/admin/property/sito', '/admin/property/pagine', '/admin/property/vetrine',
    '/admin/property/services', '/admin/property/activities', '/admin/property/excursions',
  ]
  if (risto) urls.push(`/admin/ristoranti/${risto}/menu`, `/admin/ristoranti/${risto}/sito`)
  if (att) urls.push(`/admin/attivita/${att}/sito`)
  if (pagina) urls.push(`/admin/pagine/${pagina}`)
  if (form) urls.push(`/admin/form-builder/${form}`)
  if (vetrina) urls.push(`/admin/vetrine/${vetrina}`)
  return urls
}

await withProbeSession(async ({ page }) => {
  const urls = await targets()
  console.log(`\nProva ostile (nome lungo) — ${urls.length} pagine @ ${WIDTH}px\n`)

  let total = 0
  for (const url of urls) {
    try {
      await gotoAdmin(page, url)
      const hits = await page.evaluate(STRESS)
      if (!hits.length) { console.log(`ok  ${url}`); continue }
      total += hits.length
      console.log(`\n### ${url}  — ${hits.length} griglie cedono`)
      for (const h of hits) {
        console.log(`  cols=${h.cols}  larghezza ${h.width}px`)
        console.log(`      prima: riga fuori ${h.before.rowOut}px / overflow ${h.before.gridDelta}px`)
        console.log(`      dopo : riga fuori ${h.after.rowOut}px / overflow ${h.after.gridDelta}px`)
        console.log(`      ${h.path}   (voce: "${h.sample}")`)
      }
    } catch (e) {
      console.log(`ERR ${url}  ${e.message.split('\n')[0]}`)
    }
  }
  console.log(`\n\n===== TOTALE griglie che cedono al nome lungo: ${total} =====`)
}, { width: WIDTH })
