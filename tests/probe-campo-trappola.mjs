// Il campo trappola anti-robot non deve far sparire le richieste delle persone.
//
// 18/11/2026: una richiesta vera dal modulo di Panoramic non è mai arrivata — il
// completamento automatico del browser riempiva con ogni probabilità la trappola
// (il primo campo di testo, prima di «Nome e cognome»), e il server scartava in
// silenzio. Regola nuova in lib/campo-trappola.js: robot = trappola piena E invio
// troppo rapido (o senza il tempo, che scrive il JavaScript della pagina).
//
// Azienda ZZ con un modulo SENZA email di notifica: nessuna email parte.
// Uso: cd tests && node probe-campo-trappola.mjs
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomUUID } from 'crypto'
import { sembraUnRobot } from '../client-next/lib/campo-trappola.js'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let problemi = 0
const ok = (c, testo, dettaglio = '') => { console.log(`  ${c ? '✓' : '✗'} ${testo}${!c && dettaglio ? `  — ${dettaglio}` : ''}`); if (!c) problemi++ }

console.log('\n1. LA REGOLA\n')
ok(!sembraUnRobot('', undefined), 'trappola vuota → persona')
ok(sembraUnRobot('Mario', undefined), 'trappola piena, nessun tempo → robot')
ok(sembraUnRobot('Mario', 400), 'trappola piena, inviato in 0,4 s → robot')
ok(!sembraUnRobot('Mario Rossi', 25000), 'trappola piena dopo 25 s (completamento automatico) → persona')
ok(sembraUnRobot('x', 'abc'), 'tempo non numerico → robot')

let az = null
try {
  const t = Date.now()
  az = (await a.from('aziende').insert({ ragione_sociale: `ZZ-TRAPPOLA-${t}`, require_2fa: false }).select().single()).data
  const campi = [
    { id: randomUUID(), tipo: 'text', label: 'Nome e cognome', required: true, opzioni: [], placeholder: '' },
    { id: randomUUID(), tipo: 'email', label: 'Email', required: true, opzioni: [], placeholder: '' },
    { id: randomUUID(), tipo: 'tel', label: 'Telefono', required: false, opzioni: [], placeholder: '' },
    { id: randomUUID(), tipo: 'consenso', label: 'Accetto', required: true, opzioni: [], placeholder: '', privacy_url: '' },
  ]
  const { data: form, error } = await a.from('form_builder').insert({ azienda_id: az.id, nome: 'ZZ trappola', attivo: true, campi, email_notifica: null }).select().single()
  if (error) throw new Error('modulo: ' + error.message)
  const invii = async () => (await a.from('form_submissions').select('id', { count: 'exact', head: true }).eq('form_id', form.id)).count
  const manda = async (extra, n) => {
    const corpo = { [campi[0].id]: `ZZ Persona ${n}`, [campi[1].id]: `zz-trappola-${t}-${n}@playwright.internal`, [campi[3].id]: true, ...extra }
    const r = await fetch(`${BASE}/api/form-builder/public/${form.token}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
    return r.status
  }

  console.log('\n2. LA ROUTE VERA\n')
  let prima = await invii()
  ok(await manda({ _hp: '', _t: 9000 }, 1) === 200 && await invii() === prima + 1, 'invio normale → salvato')
  prima = await invii()
  ok(await manda({ _hp: 'Mario Rossi', _t: 8000 }, 2) === 200 && await invii() === prima + 1, 'trappola riempita dal browser, dopo 8 s → SALVATO (prima spariva)')
  prima = await invii()
  ok(await manda({ _hp: 'spam' }, 3) === 200 && await invii() === prima, 'trappola piena senza tempo (robot) → risponde ok, non salva')
  prima = await invii()
  ok(await manda({ _hp: 'spam', _t: 300 }, 4) === 200 && await invii() === prima, 'trappola piena in 0,3 s (robot) → non salva')

  console.log('\n3. NEL BROWSER (pagina /form)\n')
  const b = await chromium.launch()
  const p = await b.newPage()
  await p.goto(`${BASE}/form?token=${form.token}`, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('form input', { timeout: 30000 })
  const info = await p.evaluate(() => {
    const f = document.querySelector('form'); if (!f) return null
    const tutti = [...f.querySelectorAll('input')]
    const trappola = f.querySelector('input[name="_controllo"]')
    return { ultima: trappola && tutti.indexOf(trappola) === tutti.length - 1, vecchia: !!f.querySelector('input[name="_hp"]'),
      completamenti: tutti.filter(i => i !== trappola && !['checkbox', 'hidden'].includes(i.type)).map(i => i.getAttribute('autocomplete')) }
  })
  ok(info?.ultima && !info.vecchia, 'la trappola è l\'ultimo campo del modulo', JSON.stringify(info))
  ok(JSON.stringify(info?.completamenti) === JSON.stringify(['name', 'email', 'tel']), 'nome, email e telefono dichiarano il completamento automatico', JSON.stringify(info?.completamenti))
  await b.close()
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (az) await cancellaAziendaDiProva(az.id)
  console.log('[probe] pulito')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nLE PERSONE PASSANO, I ROBOT NO')
  process.exit(problemi ? 1 : 0)
}
