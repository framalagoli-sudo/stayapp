// Un solo modo di caricare quello che si vende.
//
// Il difetto, segnalato da Francesco il 28/08 dopo aver percorso il flusso:
// «catalogo, prodotti, shop, offerte mi sembrano slegati». Aveva ragione, e in
// parte l'avevo peggiorato io — creando le route mancanti dello shop avevo
// riaperto una seconda porta che scriveva nella vecchia tabella `prodotti`.
//
// Le domande, a cui si risponde percorrendo il pannello come un cliente:
//   1. dallo shop si può ancora creare un prodotto "parallelo"?
//   2. creando un'offerta il sistema chiede da cosa partire?
//   3. partendo da un prodotto, l'offerta resta legata a quello?
//
// Uso: node probe-flusso-unico.mjs
import { withProbeSession, admin, TEST_URL } from './probe-auth.mjs'
const L = process.env.TEST_LOCALE || TEST_URL
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

let az = null, en = null, v = null, el = null
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-FLU-${Date.now()}`, require_2fa: false }).select().single(); az = a.id
  const { data: e } = await admin.from('entita').insert({ azienda_id: az, tipo: 'attivita', slug: `zz-flu-${Date.now()}`, name: 'ZZ Negozio', active: true }).select().single(); en = e.id
  const { data: vt } = await admin.from('vetrine').insert({ entity_tipo: 'attivita', entity_id: en, titolo: 'ZZ Catalogo', preset: 'viaggi', slug: `zz-c-${Date.now()}`, status: 'pubblicata' }).select().single(); v = vt.id
  const { data: elm } = await admin.from('vetrina_elementi').insert({ vetrina_id: v, entity_tipo: 'attivita', entity_id: en, titolo: 'ZZ Maglietta', slug: `zz-m-${Date.now()}`, status: 'pubblicata', valore_primario: '25' }).select().single(); el = elm.id

  console.log('\nUN SOLO MODO DI CARICARE I PRODOTTI\n')

  await withProbeSession(async ({ page }) => {
    const errori = []
    page.on('pageerror', x => errori.push('ECCEZIONE: ' + x.message))

    // 1. Lo shop non deve più offrire una creazione tutta sua.
    await page.goto(`${L}/admin/shop`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const testoShop = await page.locator('body').innerText()
    ok(!/Nuovo prodotto|Crea il primo prodotto/.test(testoShop),
       'lo shop non propone più una creazione tutta sua')
    ok(/prodotti|catalogo/i.test(testoShop), 'e rimanda al catalogo')

    // 2. Creando un'offerta, il sistema chiede da cosa partire.
    await page.goto(`${L}/admin/offerte`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Nuova offerta/ }).click()
    await page.getByText(/Che cosa vuoi mettere in offerta/).waitFor({ timeout: 15000 }).catch(() => {})
    const testoScelta = await page.locator('body').innerText()
    ok(/Che cosa vuoi mettere in offerta/.test(testoScelta), 'chiede che cosa mettere in offerta, invece di creare al buio')
    ok(/Crea qualcosa di nuovo/.test(testoScelta), 'si può partire da zero')
    await page.getByText('ZZ Maglietta').first().waitFor({ timeout: 15000 }).catch(() => {})
    ok(/ZZ Maglietta/.test(await page.locator('body').innerText()), 'e si può partire da un prodotto che si ha già')

    // 3. Partendo dal prodotto, il legame resta.
    await page.getByText('ZZ Maglietta').first().click()
    await page.waitForTimeout(4000)
    const { data: nate } = await admin.from('offerte').select('id, titolo, prodotto_id, prezzo').eq('azienda_id', az)
    ok(nate?.length === 1, `l'offerta è stata creata (${nate?.length || 0})`)
    ok(nate?.[0]?.prodotto_id === el, 'e resta legata al prodotto da cui è partita')
    ok(nate?.[0]?.titolo === 'ZZ Maglietta', 'riprende il nome del prodotto, senza farlo riscrivere')

    ok(errori.length === 0, `nessun errore nel browser${errori.length ? ': ' + errori.slice(0, 2).join(' | ') : ''}`)
  }, { width: 1280, height: 1000 })

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  UNA PORTA SOLA: DAL CATALOGO ALL\'OFFERTA E ALLO SHOP')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
finally {
  if (az) await admin.from('offerte').delete().eq('azienda_id', az)
  if (el) await admin.from('vetrina_elementi').delete().eq('id', el)
  if (v) await admin.from('vetrine').delete().eq('id', v)
  if (en) await admin.from('entita').delete().eq('id', en)
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
