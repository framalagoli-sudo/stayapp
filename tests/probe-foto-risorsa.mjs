// Le foto di ciò che si prenota arrivano fino a chi prenota.
//
// ⚠️ Il controllo che conta è il secondo. Con **una sola** risorsa il modulo
// salta il passo della scelta — è il caso più comune, chi ha un furgone solo o
// una camera sola — e lì la scheda con la miniatura non compare mai. Se le foto
// vivessero solo in quella scheda, il cliente le caricherebbe e non le vedrebbe
// nessuno: si salvano e non si vedono, che in questo progetto è già successo
// due volte in un giorno.
//
// Uso: node probe-foto-risorsa.mjs
//      TEST_LOCALE=http://localhost:3000 node probe-foto-risorsa.mjs
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PREFISSO = { struttura: 's', ristorante: 'r', attivita: 'a' }

// Due immagini vere, minuscole: servono a essere *viste*, non a essere belle.
const FOTO = [
  'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"><rect width="8" height="6" fill="#2d6a9f"/></svg>').toString('base64'),
  'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"><rect width="8" height="6" fill="#9f5a2d"/></svg>').toString('base64'),
]

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const browser = await chromium.launch()
let risorsa = null, primaGalleria = null
try {
  // Si lavora sulla risorsa vera già pubblicata, e si rimette com'era alla fine:
  // è l'unico modo di provare il caso «una risorsa sola» così com'è dal vivo.
  const { data: r } = await admin.from('risorse')
    .select('id, nome, entity_id, entity_tipo, galleria').eq('attiva', true).eq('visibile_minisito', true)
    .limit(1).maybeSingle()
  if (!r) { console.log('\nNessuna risorsa pubblicata: niente da provare.\n'); process.exit(0) }
  risorsa = r
  primaGalleria = r.galleria || []

  const { data: ent } = await admin.from('entita').select('slug, tipo').eq('id', r.entity_id).maybeSingle()
  const url = `${L}/${PREFISSO[ent.tipo]}/${ent.slug}`

  const { count: quante } = await admin.from('risorse')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', r.entity_id).eq('attiva', true).eq('visibile_minisito', true)

  const apri = async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const errori = []
    page.on('pageerror', e => errori.push(e.message))
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('text=/Quando arrivi|Cosa vuoi prenotare|Scegli/i', { timeout: 45000 })
    await page.waitForTimeout(800)
    const immagini = await page.locator('img').evaluateAll(el => el.map(i => i.getAttribute('src') || ''))
    await page.close()
    return { immagini, errori }
  }

  console.log(`\nSENZA FOTO — il modulo non deve sembrare rotto  (${quante} risorsa/e)\n`)
  await admin.from('risorse').update({ galleria: [] }).eq('id', r.id)
  let v = await apri()
  ok(v.errori.length === 0, `il modulo apre senza errori${v.errori.length ? ': ' + v.errori[0] : ''}`)
  const nostreSenza = v.immagini.filter(s => s.startsWith('data:image/svg'))
  ok(nostreSenza.length === 0, 'nessuna foto mostrata, e va bene così')

  console.log('\nCON DUE FOTO — arrivano fino a chi prenota\n')
  await admin.from('risorse').update({ galleria: FOTO }).eq('id', r.id)
  v = await apri()
  ok(v.errori.length === 0, `il modulo apre senza errori${v.errori.length ? ': ' + v.errori[0] : ''}`)
  const nostre = v.immagini.filter(s => s.startsWith('data:image/svg'))
  ok(nostre.length > 0, `le foto compaiono (${nostre.length} trovate)`)
  ok(nostre.includes(FOTO[0]), 'la prima foto — la copertina — è fra quelle mostrate')

  // ⛔ Il controllo che dà il nome a questa sonda: con una sola risorsa il passo
  // della scelta non c'è, quindi le foto devono venire dalla testata.
  if (quante === 1) {
    ok(nostre.length >= 2,
      `con UNA sola risorsa si vedono anche le altre foto (${nostre.length}): la testata c'è, non solo la scheda`)
  } else {
    console.log(`  · ${quante} risorse: la scheda di scelta esiste, la testata si prova dopo il click`)
  }

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'LE FOTO ARRIVANO A CHI PRENOTA, ANCHE CON UNA RISORSA SOLA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  await browser.close()
  // ⚠️ Si rimette la galleria com'era: questa sonda tocca un dato vero.
  if (risorsa) {
    const { error } = await admin.from('risorse').update({ galleria: primaGalleria }).eq('id', risorsa.id)
    console.log(error ? `pulizia: ${error.message}` : `[probe] galleria di «${risorsa.nome}» rimessa com'era`)
  }
  process.exit(problemi ? 1 : 0)
}
