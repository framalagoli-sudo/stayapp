// Il campo trappola anti-robot non deve far sparire le richieste delle persone.
//
// 18/11/2026: una richiesta vera dal modulo di Panoramic non è mai arrivata — il
// completamento automatico del browser riempiva con ogni probabilità la trappola
// (il primo campo di testo, prima di «Nome e cognome»), e il server scartava in
// silenzio. Regola nuova in lib/campo-trappola.js: robot = trappola piena E invio
// troppo rapido (o senza il tempo, che scrive il JavaScript della pagina).
//
// Poi lo spam (migration 147): si salva marcato, e il titolare decide.
//
// Azienda ZZ con moduli SENZA email di notifica: nessuna email parte.
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

let az = null, az2 = null
const utenti = []
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

  // ── Lo spam si salva marcato (migration 147, lib/spam-moduli.js) ─────────────
  // Secondo modulo: il primo ha già usato quasi tutti i 5 invii l'ora.
  console.log('\n2b. LO SPAM SI SALVA, MARCATO\n')
  const { data: form2, error: e2 } = await a.from('form_builder').insert({ azienda_id: az.id, nome: 'ZZ spam', attivo: true, campi: [...campi, { id: randomUUID(), tipo: 'textarea', label: 'Messaggio', required: false, opzioni: [], placeholder: '' }], email_notifica: null }).select().single()
  if (e2) throw new Error('modulo 2: ' + e2.message)
  const msg = form2.campi[4].id
  const manda2 = async (extra, n) => {
    const corpo = { [campi[0].id]: `ZZ Persona ${n}`, [campi[1].id]: `zz-spam-${t}-${n}@playwright.internal`, [campi[3].id]: true, _hp: '', _t: 9000, ...extra }
    await fetch(`${BASE}/api/form-builder/public/${form2.token}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
    const { data } = await a.from('form_submissions').select('id, possibile_spam, spam_motivo, contatto_id').eq('form_id', form2.id).filter('dati->>' + campi[1].id, 'eq', corpo[campi[1].id]).maybeSingle()
    return data
  }
  const cirillico = await manda2({ [campi[0].id]: 'Олена Коваленко', [msg]: 'Добрий день, чи вільний номер?' }, 1)
  ok(cirillico && !cirillico.possibile_spam && cirillico.contatto_id, 'scritto in cirillico → richiesta normale, con contatto (prima spariva)', JSON.stringify(cirillico))
  const casino = await manda2({ [msg]: 'Che casino trovare parcheggio, ce n\'è uno vicino?' }, 2)
  ok(casino && !casino.possibile_spam, '«che casino» → richiesta normale (prima spariva)', JSON.stringify(casino))
  const link = await manda2({ [msg]: 'Visit https://spam.example.invalid and https://altro.example.invalid' }, 3)
  ok(link?.possibile_spam && /link/.test(link.spam_motivo || '') && !link.contatto_id, 'due link → salvata in «Possibile spam», senza contatto', JSON.stringify(link))
  const rapida = await manda2({ _t: 700 }, 4)
  ok(rapida?.possibile_spam && /2 secondi/.test(rapida.spam_motivo || ''), 'inviata in 0,7 s → «Possibile spam»', JSON.stringify(rapida))

  console.log('\n2c. IL TITOLARE DECIDE\n')
  const nuovoTitolare = async (aziendaId, etichetta) => {
    const email = `zz-spam-${etichetta}-${t}@playwright.internal`, password = randomUUID() + 'Aa1!'
    const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true })
    await a.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: 'ZZ', azienda_id: aziendaId }, { onConflict: 'id' })
    const { data: s } = await createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
    utenti.push(u.user.id)
    return s.session.access_token
  }
  const tok = await nuovoTitolare(az.id, 'tit')
  const H = { Authorization: `Bearer ${tok}`, 'content-type': 'application/json' }
  const lista = await (await fetch(`${BASE}/api/form-builder/${form2.id}/submissions?spam=1`, { headers: H })).json()
  ok(lista.conteggi?.spam === 2 && lista.conteggi?.richieste === 2 && lista.data?.length === 2, 'il titolare vede 2 richieste e 2 «possibile spam»', JSON.stringify(lista.conteggi))
  const sposta = await fetch(`${BASE}/api/form-builder/${form2.id}/submissions`, { method: 'PATCH', headers: H, body: JSON.stringify({ id: link.id, possibile_spam: false }) })
  const dopo = (await a.from('form_submissions').select('possibile_spam, contatto_id').eq('id', link.id).single()).data
  ok(sposta.status === 200 && !dopo.possibile_spam && dopo.contatto_id, '«Non è spam» → torna fra le richieste e crea il contatto', JSON.stringify(dopo))
  az2 = (await a.from('aziende').insert({ ragione_sociale: `ZZ-TRAPPOLA-B-${t}`, require_2fa: false }).select().single()).data
  const tokB = await nuovoTitolare(az2.id, 'b')
  const estraneo = await fetch(`${BASE}/api/form-builder/${form2.id}/submissions`, { method: 'PATCH', headers: { Authorization: `Bearer ${tokB}`, 'content-type': 'application/json' }, body: JSON.stringify({ id: rapida.id, possibile_spam: false }) })
  const intatta = (await a.from('form_submissions').select('possibile_spam').eq('id', rapida.id).single()).data
  ok(estraneo.status === 403 && intatta.possibile_spam, 'un\'altra azienda non può spostarla (403)', String(estraneo.status))

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
  for (const x of [az, az2]) if (x) await cancellaAziendaDiProva(x.id)
  for (const u of utenti) { try { await a.auth.admin.deleteUser(u) } catch {} }
  console.log('[probe] pulito')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nLE PERSONE PASSANO, I ROBOT NO')
  process.exit(problemi ? 1 : 0)
}
