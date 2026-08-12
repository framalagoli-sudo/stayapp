// Prova ostile lato OSPITE: le liste della PWA reggono un nome lungo?
// Stesso difetto cercato in admin (grid senza gridTemplateColumns), ma qui lo
// spazio è stretto (mobile) e a vederlo sarebbe il cliente finale.
//
// Uso: cd tests && node probe-guest-stress.mjs

import { chromium } from '@playwright/test'
import { admin, TEST_URL } from './probe-auth.mjs'

const STRESS = () => {
  const LONG = 'Escursione' + 'X'.repeat(60)
  const out = []
  const grids = [...document.querySelectorAll('*')].filter(el => {
    const cs = getComputedStyle(el)
    return cs.display === 'grid' && el.children.length > 0 && el.clientWidth > 0
  })
  const describe = el => {
    const parts = []
    for (let n = el; n && n !== document.body && parts.length < 3; n = n.parentElement) {
      parts.unshift(n.tagName.toLowerCase())
    }
    return parts.join('>')
  }

  for (const grid of grids) {
    const row = grid.firstElementChild
    if (!row) continue

    // Ogni nodo di testo della riga, uno alla volta: così si vede QUALE testo
    // fa cedere il layout (una label statica = falso allarme, un dato inserito
    // dal cliente = difetto vero).
    const nodes = []
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
    let n = null
    while ((n = walker.nextNode())) if (n.nodeValue.trim()) nodes.push(n)

    let worst = null
    for (const node of nodes) {
      const original = node.nodeValue
      node.nodeValue = LONG
      const after = {
        gridDelta: grid.scrollWidth - grid.clientWidth,
        rowOut: Math.round(row.getBoundingClientRect().right - grid.getBoundingClientRect().right),
        pageScrolls: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
      node.nodeValue = original
      if ((after.rowOut > 1 || after.gridDelta > 1) && (!worst || after.gridDelta > worst.gridDelta)) {
        worst = { ...after, culprit: original.trim().slice(0, 40) }
      }
    }
    if (worst) out.push({ width: grid.clientWidth, path: describe(grid), ...worst })
  }
  return out
}

// Entità con attività o escursioni popolate (le liste sospette lato guest)
const { data: props } = await admin
  .from('properties')
  .select('slug, name, activities, excursions')
  .eq('active', true)

const targets = (props || []).filter(p =>
  (Array.isArray(p.activities) && p.activities.length) ||
  (Array.isArray(p.excursions) && p.excursions.length)
)

if (!targets.length) {
  console.log('Nessuna struttura attiva con attività/escursioni: niente da misurare.')
  process.exit(0)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

for (const p of targets) {
  const url = `${TEST_URL}/s/${p.slug}?qr=1`
  console.log(`\n### ${p.name} — ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(1000)

  // Il banner cookie è in overlay fisso e intercetta i click sulla bottom nav
  for (const label of ['Accetta tutti', 'Accetta', 'Accetto', 'OK']) {
    const btn = page.getByRole('button', { name: label, exact: false }).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {})
      await page.waitForTimeout(400)
      break
    }
  }

  // Schermata iniziale (Home) prima di qualsiasi navigazione
  const homeHits = await page.evaluate(STRESS)
  if (homeHits.length) {
    console.log(`  [schermata iniziale] ${homeHits.length} griglie cedono:`)
    for (const h of homeHits) {
      console.log(`      ${h.path}  larghezza ${h.width}px  riga fuori ${h.rowOut}px  overflow ${h.gridDelta}px`)
      console.log(`         testo che fa cedere: "${h.culprit}"`)
    }
  } else {
    console.log('  [schermata iniziale] ok')
  }

  // Gira le voci della bottom nav: le liste stanno dentro le tab
  const tabs = await page.locator('nav button, nav a, [role="tablist"] button').all()
  console.log(`  voci di navigazione: ${tabs.length}`)
  for (let i = 0; i < tabs.length; i++) {
    try {
      await tabs[i].click({ timeout: 3000 })
      await page.waitForTimeout(600)
      const label = (await tabs[i].innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
      const hits = await page.evaluate(STRESS)
      if (hits.length) {
        console.log(`  [${label || i}] ${hits.length} griglie cedono:`)
        for (const h of hits) {
          console.log(`      ${h.path}  larghezza ${h.width}px  riga fuori ${h.rowOut}px  overflow ${h.gridDelta}px  pagina ${h.pageScrolls}px`)
          console.log(`         testo che fa cedere: "${h.culprit}"`)
        }
      } else {
        console.log(`  [${label || i}] ok`)
      }
    } catch {
      console.log(`  [${i}] non cliccabile`)
    }
  }
}

await browser.close()
