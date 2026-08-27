// Un prodotto del catalogo si compra dallo shop.
//
// Terzo strato del modello (`CATALOGO.md`): la cosa vive nei Prodotti, sopra ci
// vanno *in offerta* e *in vendita*. Le domande, a cui si risponde provando:
//   1. acceso «Vendi», compare davvero nello scaffale pubblico?
//   2. il prezzo che si paga è quello del catalogo o quello del carrello?
//   3. si può comprare la roba di un'altra azienda conoscendone l'id?
//
// Uso: node probe-vendi-dal-catalogo.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const L = process.env.TEST_LOCALE || TEST_URL
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

const nati = []
async function cliente(tag) {
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-VD-${tag}-${Date.now()}`, require_2fa: false }).select().single()
  const { data: en } = await admin.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', slug: `zz-vd-${tag.toLowerCase()}-${Date.now()}`, name: `ZZ ${tag}`, active: true }).select().single()
  const { data: v } = await admin.from('vetrine').insert({ entity_tipo: 'attivita', entity_id: en.id, titolo: 'ZZ Catalogo', preset: 'viaggi', slug: `zz-cat-${Date.now()}`, status: 'pubblicata' }).select().single()
  nati.push({ az: az.id, en: en.id, v: v.id })
  return { az: az.id, en: en.id, v: v.id }
}

try {
  const A = await cliente('A'), B = await cliente('B')
  const nuovo = async (vetrina, entity, props) => (await admin.from('vetrina_elementi')
    .insert({ vetrina_id: vetrina, entity_tipo: 'attivita', entity_id: entity, slug: `zz-${Date.now()}${Math.random().toString(36).slice(2, 6)}`, status: 'pubblicata', ...props })
    .select().single()).data

  const inVendita = await nuovo(A.v, A.en, { titolo: 'ZZ Maglietta', in_vendita: true, prezzo_vendita: 25, stock: 10, valore_primario: '999' })
  const soloCatalogo = await nuovo(A.v, A.en, { titolo: 'ZZ Non in vendita', in_vendita: false, prezzo_vendita: 15 })
  const bozza = await nuovo(A.v, A.en, { titolo: 'ZZ Bozza', in_vendita: true, prezzo_vendita: 30 })
  await admin.from('vetrina_elementi').update({ status: 'bozza' }).eq('id', bozza.id)
  const diB = await nuovo(B.v, B.en, { titolo: 'ZZ Roba di B', in_vendita: true, prezzo_vendita: 50 })

  console.log('\nCOMPRARE UN PRODOTTO DEL CATALOGO\n')
  const scaffale = await (await fetch(`${L}/api/shop/public/${A.az}/prodotti`)).json()
  const nomi = (Array.isArray(scaffale) ? scaffale : []).map(x => x.nome)
  ok(nomi.includes('ZZ Maglietta'), `quello in vendita è sullo scaffale [${nomi.join(', ') || '—'}]`)
  ok(!nomi.includes('ZZ Non in vendita'), 'quello non in vendita resta solo nel catalogo')
  ok(!nomi.includes('ZZ Bozza'), 'una bozza non si vende')
  ok(!nomi.includes('ZZ Roba di B'), 'e la roba di un\'altra azienda non compare')
  const scheda = (Array.isArray(scaffale) ? scaffale : []).find(x => x.nome === 'ZZ Maglietta')
  ok(scheda?.prezzo === 25, `il prezzo è quello di vendita, non il «prezzo da» del catalogo (${scheda?.prezzo})`)

  console.log('\n  al momento di pagare:\n')
  const ordina = (azienda, voci) => fetch(`${L}/api/shop/public/${azienda}/ordine`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_cliente: `zz${Date.now()}@example.com`, nome_cliente: 'ZZ', voci }),
  })
  // ⚠️ Il prezzo arriva dal carrello: se lo shop se ne fidasse, si comprerebbe a
  // un euro qualsiasi cosa.
  const r = await ordina(A.az, [{ prodotto_id: inVendita.id, qty: 2, prezzo: 1 }])
  ok(r.ok, `l'ordine passa (HTTP ${r.status})`)
  const ord = r.ok ? await r.json() : null
  ok(ord?.totale === 50, `il totale è 50 € (25 × 2), non quello proposto dal carrello (${ord?.totale})`)

  const rubato = await ordina(A.az, [{ prodotto_id: diB.id, qty: 1 }])
  ok(!rubato.ok, `non si compra dallo shop di A un prodotto di B (HTTP ${rubato.status})`)
  const inBozza = await ordina(A.az, [{ prodotto_id: bozza.id, qty: 1 }])
  ok(!inBozza.ok, `né una bozza (HTTP ${inBozza.status})`)

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  UN SOLO CARICAMENTO: DAL CATALOGO ALLO SCAFFALE')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
finally {
  for (const x of nati) {
    await admin.from('ordini').delete().eq('azienda_id', x.az)
    await admin.from('vetrina_elementi').delete().eq('entity_id', x.en)
    await admin.from('vetrine').delete().eq('id', x.v)
    await admin.from('entita').delete().eq('id', x.en)
    const { error } = await admin.from('aziende').delete().eq('id', x.az)
    if (error) console.error('pulizia:', error.message)
  }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
