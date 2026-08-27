// Dentro Offerte si sceglie un prodotto dal catalogo.
//
// È il verso opposto di «Crea offerta»: la stessa cosa vista dall'altro lato.
// Un'offerta amplifica qualcosa che il cliente ha già caricato, e quando
// finisce quella cosa resta nel catalogo. Vedi `CATALOGO.md`.
//
// ⚠️ In locale la prima visita a una route la compila: senza attese generose
// sembra che la pagina non carichi niente, e non è vero. Costa due giri di
// diagnosi su un guasto che non esiste.
//
// Uso: node probe-offerta-da-prodotto.mjs
import { withProbeSession, TEST_URL, admin } from './probe-auth.mjs'
import { createClient } from '@supabase/supabase-js'
const { data: az } = await admin.from('aziende').insert({ ragione_sociale:`ZZ-SEL-${Date.now()}`, require_2fa:false }).select().single()
const { data: en } = await admin.from('entita').insert({ azienda_id:az.id, tipo:'attivita', slug:`zz-sel-${Date.now()}`, name:'ZZ Agenzia', active:true }).select().single()
const { data: v } = await admin.from('vetrine').insert({ entity_tipo:'attivita', entity_id:en.id, titolo:'ZZ Viaggi', preset:'viaggi', slug:'zz-viaggi', status:'pubblicata' }).select().single()
const { data: el } = await admin.from('vetrina_elementi').insert({ vetrina_id:v.id, entity_tipo:'attivita', entity_id:en.id, titolo:'ZZ Sharm el Sheikh', slug:'zz-sharm', status:'pubblicata', valore_primario:'790' }).select().single()
const { data: of } = await admin.from('offerte').insert({ azienda_id:az.id, entity_id:en.id, titolo:'Nuova offerta', attiva:true, pubblicata:false, modo:'richiesta', impegno:'chiedi' }).select().single()
console.log('preparato: prodotto «ZZ Sharm el Sheikh», offerta vuota\n')
await withProbeSession(async ({ page }) => {
  const err = []
  page.on('pageerror', e => err.push('ECCEZIONE: '+e.message))
  await page.goto(`${TEST_URL}/admin/offerte/${of.id}`, { waitUntil:'networkidle' })
  await page.waitForTimeout(9000)
  const t = await page.locator('body').innerText()
  console.log('la voce c\'è:', /Quale prodotto stai promuovendo/.test(t) ? '✓' : '✗')
  const sel = page.locator('body select')
  const n = await sel.count()
  let trovato = -1
  for (let i=0;i<n;i++) { const op = await sel.nth(i).locator('option').allInnerTexts(); if (op.some(x=>/ZZ Sharm/.test(x))) { trovato = i; break } }
  console.log('il prodotto è nella tendina:', trovato >= 0 ? `✓ (tendina ${trovato})` : '✗')
  if (trovato >= 0) {
    await sel.nth(trovato).selectOption({ label: /ZZ Sharm/ }).catch(async () => { await sel.nth(trovato).selectOption(el.id) })
    await page.waitForTimeout(900)
    const dopo = await page.locator('body').innerText()
    console.log('riprende il titolo:', /ZZ Sharm el Sheikh/.test(dopo) ? '✓' : '✗')
    await page.getByRole('button', { name:/^Salva$/ }).click()
    await page.waitForTimeout(9000)
    const { data: ver } = await admin.from('offerte').select('prodotto_id, titolo, prezzo').eq('id', of.id).single()
    console.log('salvato — prodotto_id:', ver.prodotto_id === el.id ? '✓ collegato' : '✗ '+ver.prodotto_id)
    console.log('           titolo:', ver.titolo, '· prezzo:', ver.prezzo)
  }
  console.log('errori:', err.length ? err : 'nessuno')
}, { width: 1280, height: 950 })
await admin.from('offerte').delete().eq('azienda_id', az.id)
await admin.from('vetrina_elementi').delete().eq('id', el.id)
await admin.from('vetrine').delete().eq('id', v.id)
await admin.from('entita').delete().eq('id', en.id)
const { error } = await admin.from('aziende').delete().eq('id', az.id); if (error) console.error('pulizia:', error.message)
console.log('[probe] pulito')
