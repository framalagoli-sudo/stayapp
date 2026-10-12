// Le sezioni condivise: una sezione scritta una volta e usata su più pagine.
//
// Crea due aziende di prova (la seconda fa l'estranea) e percorre:
//   - la stessa sezione su due pagine, letta dal CORPO GREZZO del sito
//   - una modifica sola che cambia tutte e due le pagine
//   - cosa si salva nella pagina (solo il riferimento, mai una copia)
//   - eliminare una sezione in uso (rifiutato, con l'elenco delle pagine)
//   - i casi ostili: un'altra azienda che legge, modifica, elimina o USA la
//     sezione di un altro sito; una sezione dentro una sezione; nessun token
//   - l'editor col browser: «Rendi condivisa», la scheda con l'avviso, la
//     modifica dall'interno, «Stacca», e l'editor visuale che la disegna
//
// A mano. `$env:TEST_URL='http://localhost:3000'` per il locale.
// Uso: node probe-sezioni.mjs [cartella-foto]

import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv[2] || null
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const aziende = [], utenti = []
let browser = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)

async function nuovaAzienda(sigla) {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-SEZIONI-${sigla}-${t}`, require_2fa: false, moduli: { attivita: true } }).select().single(), 'azienda')
  aziende.push(az.id)
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', name: `ZZ Studio ${sigla}`, slug: `zz-sez-${sigla.toLowerCase()}-${t}`, active: true, minisito: { active: true } }).select().single(), 'entità')
  const email = `zz-sez-${sigla.toLowerCase()}-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utenti.push(u.user.id)
  await a.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return { az, ent, sessione: s.session, token: s.session.access_token }
}
const api = async (token, metodo, percorso, corpo) => {
  const r = await fetch(BASE + percorso, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(corpo ? { body: JSON.stringify(corpo) } : {}) })
  let dati = null; try { dati = await r.json() } catch {}
  return { stato: r.status, dati }
}
const html = async percorso => (await fetch(BASE + percorso, { headers: { 'Cache-Control': 'no-cache' } })).text()
const quante = (testo, cosa) => testo.split(cosa).length - 1

try {
  const A = await nuovaAzienda('A'), B = await nuovaAzienda('B')
  const hero = { id: 'b-hero', type: 'hero', data: { title: 'ZZ Copertina', height: 'compatta' } }
  const testo = (id, titolo) => ({ id, type: 'about', data: { title: titolo, text: 'Un testo di prova.' } })
  const pagina = (ent, slug, titolo, blocks) => deve(a.from('pagine').insert({ entity_tipo: 'attivita', entity_id: ent.id, slug, titolo, status: 'pubblicata', nel_menu: slug !== '__home__', blocks }).select('id').single(), `pagina ${slug}`)
  const homeA = await pagina(A.ent, '__home__', 'Home', [hero, testo('b-suo', 'ZZ Solo della home')])
  const altraA = await pagina(A.ent, 'servizi', 'ZZ Servizi', [testo('b-serv', 'ZZ Solo dei servizi'), testo('b-coda', 'ZZ In coda')])
  const homeB = await pagina(B.ent, '__home__', 'Home', [testo('b-b', 'ZZ Pagina di B')])
  const urlHome = `/a/${A.ent.slug}`, urlAltra = `/a/${A.ent.slug}/p/servizi`

  console.log(`\n${BASE} — una sezione, due pagine`)
  const creata = await api(A.token, 'POST', '/api/sezioni', { entity_tipo: 'attivita', entity_id: A.ent.id, nome: 'ZZ Chiamata', blocks: [{ id: 's1', type: 'about', data: { title: 'ZZ Condivisa uno', text: 'Scritta una volta.' } }] })
  esito(creata.stato === 201 && !!creata.dati?.id, 'la sezione si crea', JSON.stringify(creata))
  const sid = creata.dati.id
  const rif = id => ({ id, type: 'sezione', data: { sezione_id: sid, altro: 'OSTILE' }, _blocchi: [{ id: 'x', type: 'about', data: { title: 'ZZ COPIA OSTILE' } }], _nome: 'OSTILE', style: { bg: 'dark' } })
  const s1 = await api(A.token, 'PATCH', `/api/pagine/${homeA.id}`, { blocks: [hero, rif('r1'), testo('b-suo', 'ZZ Solo della home')] })
  const s2 = await api(A.token, 'PATCH', `/api/pagine/${altraA.id}`, { blocks: [testo('b-serv', 'ZZ Solo dei servizi'), rif('r2'), rif('r3')] })
  esito(s1.stato === 200 && s2.stato === 200, 'si mette in due pagine (in una, due volte)')
  const salvata = (await deve(a.from('pagine').select('blocks').eq('id', homeA.id).single(), 'rilettura')).blocks[1]
  esito(JSON.stringify(salvata) === JSON.stringify({ id: 'r1', type: 'sezione', data: { sezione_id: sid } }), 'nella pagina si salva SOLO il riferimento: niente copia del contenuto', JSON.stringify(salvata))
  let h = await html(urlHome), h2 = await html(urlAltra)
  esito(h.includes('ZZ Condivisa uno') && h.includes('ZZ Solo della home') && !h.includes('OSTILE'), 'la home la stampa nell’HTML, in mezzo ai suoi blocchi')
  esito(quante(h2, 'Scritta una volta.') >= 2 && h2.includes('ZZ Solo dei servizi'), 'l’altra pagina la stampa due volte')
  esito(!/data-blocco|ev-blocco|_blocchi/.test(h + h2), 'nel corpo grezzo non c’è niente dell’editor')
  const grezza = await api(null, 'GET', `/api/guest/pagina/attivita/${A.ent.id}/__home__`)
  esito(grezza.stato === 200 && !grezza.dati.blocks.some(b => b.type === 'sezione') && grezza.dati.blocks.some(b => b.id === 'r1:s1' && b.data?.title === 'ZZ Condivisa uno'), 'anche la route pubblica della pagina dà blocchi normali, già aperti')
  esito((await fetch(`${BASE}/en${urlAltra}`)).status === 200, 'la pagina in inglese risponde')

  console.log('\nuna modifica sola')
  const mod = await api(A.token, 'PATCH', `/api/sezioni/${sid}`, { blocks: [{ id: 's1', type: 'about', data: { title: 'ZZ Condivisa DUE', text: 'Cambiata in un posto.' } }, { id: 'annidata', type: 'sezione', data: { sezione_id: sid } }] })
  esito(mod.stato === 200 && mod.dati.blocks.length === 1, 'si cambia la sezione (e una sezione dentro la sezione viene scartata)', JSON.stringify(mod.dati))
  h = await html(urlHome); h2 = await html(urlAltra)
  esito(h.includes('ZZ Condivisa DUE') && h2.includes('ZZ Condivisa DUE') && !(h + h2).includes('ZZ Condivisa uno'), 'cambiano tutte e due le pagine, senza toccarle')
  const elenco = await api(A.token, 'GET', `/api/sezioni?entity_tipo=attivita&entity_id=${A.ent.id}`)
  esito(elenco.stato === 200 && elenco.dati.length === 1 && elenco.dati[0].usata_in.length === 2 && elenco.dati[0].usata_in.some(u => u.titolo === 'Home'), 'l’elenco dice in quali pagine è usata', JSON.stringify(elenco.dati?.[0]?.usata_in))
  const via = await api(A.token, 'DELETE', `/api/sezioni/${sid}`)
  esito(via.stato === 409 && /Home/.test(via.dati?.error || '') && (await deve(a.from('sezioni').select('id').eq('id', sid), 'c’è')).length === 1, 'eliminarla mentre è in uso è rifiutato, con i nomi delle pagine', JSON.stringify(via))
  esito((await api(A.token, 'PATCH', `/api/sezioni/${sid}`, { blocks: [] })).stato === 400, 'una sezione non si può svuotare')

  console.log('\ni casi ostili')
  esito((await api(null, 'GET', `/api/sezioni?entity_tipo=attivita&entity_id=${A.ent.id}`)).stato === 401, 'senza accesso l’elenco non risponde')
  esito((await api(null, 'PATCH', `/api/sezioni/${sid}`, { nome: 'x' })).stato === 401 && (await api(null, 'DELETE', `/api/sezioni/${sid}`)).stato === 401, 'senza accesso non si modifica né si elimina')
  const bLegge = await api(B.token, 'GET', `/api/sezioni?entity_tipo=attivita&entity_id=${A.ent.id}`)
  esito(bLegge.stato === 404 && !JSON.stringify(bLegge.dati).includes('ZZ Condivisa'), 'un’altra azienda non legge le sezioni di questo sito')
  esito((await api(B.token, 'PATCH', `/api/sezioni/${sid}`, { nome: 'ZZ RUBATA' })).stato === 404 && (await api(B.token, 'DELETE', `/api/sezioni/${sid}`)).stato === 404, '…non le modifica e non le elimina')
  esito((await api(B.token, 'POST', '/api/sezioni', { entity_tipo: 'attivita', entity_id: A.ent.id, nome: 'x', blocks: [testo('q', 'ZZ intrusa')] })).stato === 404, '…e non ne crea sul sito di un altro')
  const intatta = await deve(a.from('sezioni').select('nome, blocks').eq('id', sid).single(), 'intatta')
  esito(intatta.nome === 'ZZ Chiamata' && intatta.blocks[0].data.title === 'ZZ Condivisa DUE' && (await deve(a.from('sezioni').select('id').eq('entity_id', A.ent.id), 'conta')).length === 1, 'dopo i tentativi la sezione è com’era')
  await api(B.token, 'PATCH', `/api/pagine/${homeB.id}`, { blocks: [testo('b-b', 'ZZ Pagina di B'), { id: 'furto', type: 'sezione', data: { sezione_id: sid } }] })
  const hB = await html(`/a/${B.ent.slug}`)
  esito(hB.includes('ZZ Pagina di B') && !hB.includes('ZZ Condivisa'), 'un altro sito che mette quell’id nella sua pagina non ne vede il contenuto')
  esito((await api(A.token, 'PATCH', '/api/sezioni/non-un-id', { nome: 'x' })).stato === 404, 'un id che non è un id dà «non trovata»')

  // ── L'editor, col browser ────────────────────────────────────────────────
  console.log('\nl’editor')
  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1440, height: 900 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(A.sessione) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  let nomeDato = 'ZZ Dal browser'
  page.on('dialog', d => d.type() === 'prompt' ? d.accept(nomeDato) : d.accept())
  const scatta = async nome => { if (FOTO) await page.screenshot({ path: `${FOTO}/sezioni-${nome}.png` }) }
  const salva = async () => { await page.getByRole('button', { name: 'Salva', exact: true }).click(); await page.getByText('Salvato ✓').waitFor({ timeout: 20000 }) }

  await page.goto(`${BASE}/admin/pagine/${altraA.id}`, { waitUntil: 'domcontentloaded' })
  const schede = page.locator('span', { hasText: /^Sezione condivisa · ZZ Chiamata$/ })
  await schede.first().waitFor({ timeout: 30000 }).then(() => esito(true, 'nell’elenco dei blocchi la sezione si riconosce, col suo nome'), () => esito(false, 'nell’elenco dei blocchi la sezione si riconosce, col suo nome'))
  await schede.first().click()
  const avviso = page.locator('[data-sezione-avviso]')
  await avviso.waitFor({ timeout: 15000 }).catch(() => {})
  esito(/tutte le pagine/.test(await avviso.textContent().catch(() => '')) && /Home/.test(await avviso.textContent().catch(() => '')), 'aprendola c’è scritto che cambia ovunque, e dove altro è usata', await avviso.textContent().catch(() => 'assente'))
  await scatta('scheda')

  // Cambiare dall'interno: cambia anche la home, che non è aperta.
  await page.locator('[data-sezione-blocco="about"]').first().getByRole('button', { name: 'Modifica' }).click()
  const titolo = page.locator('[data-sezione-blocco="about"]').first().locator('input[type="text"]').first()
  await titolo.fill('ZZ Condivisa TRE')
  await salva()
  esito((await deve(a.from('sezioni').select('blocks').eq('id', sid).single(), 'dopo')).blocks[0].data.title === 'ZZ Condivisa TRE', 'modificata da una pagina e salvata: la sezione è cambiata')
  h = await html(urlHome)
  esito(h.includes('ZZ Condivisa TRE') && !h.includes('ZZ Condivisa DUE'), 'ed è cambiata anche la home, che nessuno ha aperto')
  const dopoSalva = (await deve(a.from('pagine').select('blocks').eq('id', altraA.id).single(), 'pagina dopo')).blocks
  esito(dopoSalva.filter(b => b.type === 'sezione').length === 2 && dopoSalva.every(b => !('_blocchi' in b) && !('_nome' in b)), 'la pagina salvata dall’editor tiene solo i riferimenti')

  // «Rendi condivisa» su un blocco normale.
  await page.goto(`${BASE}/admin/pagine/${homeA.id}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-rendi-condivisa]').last().waitFor({ timeout: 30000 })
  await page.locator('[data-rendi-condivisa]').last().click()
  await page.locator('span', { hasText: /^Sezione condivisa · ZZ Dal browser$/ }).waitFor({ timeout: 15000 }).then(() => esito(true, '«Rendi condivisa» trasforma un blocco normale in una sezione col nome dato'), () => esito(false, '«Rendi condivisa» trasforma un blocco normale in una sezione col nome dato'))
  await salva()
  const nuove = await deve(a.from('sezioni').select('id, nome, blocks').eq('entity_id', A.ent.id).eq('nome', 'ZZ Dal browser'), 'nuova')
  h = await html(urlHome)
  esito(nuove.length === 1 && nuove[0].blocks[0]?.data?.title === 'ZZ Solo della home' && h.includes('ZZ Solo della home'), 'la sezione nuova contiene quel blocco, e la pagina lo mostra come prima')

  // Editor visuale: la sezione si vede ed è una cosa sola.
  await page.locator('.pe-apri-visuale').click()
  const riq = page.frameLocator('iframe[title="Editor visuale"]')
  const cornice = riq.locator('[data-blocco][data-nome^="Sezione condivisa · ZZ Chiamata"]')
  await cornice.getByText('ZZ Condivisa TRE').waitFor({ timeout: 30000 }).then(() => esito(true, 'nell’editor visuale la sezione è disegnata dentro una cornice sola, col suo nome'), () => esito(false, 'nell’editor visuale la sezione è disegnata dentro una cornice sola, col suo nome'))
  await cornice.getByText('ZZ Condivisa TRE').click()
  await page.locator('[data-sezione-condivisa] [data-sezione-avviso]').waitFor({ timeout: 15000 }).then(() => esito(true, 'cliccandola si apre la sua scheda, con l’avviso'), () => esito(false, 'cliccandola si apre la sua scheda, con l’avviso'))
  esito(await cornice.locator('[contenteditable="true"]').count() === 0, 'sulla pagina i suoi testi non si scrivono al volo: si cambiano dalla scheda, sapendo che vale ovunque')
  await scatta('visuale')
  // Scrivendo nella scheda la pagina segue senza salvare.
  await page.locator('[data-sezione-blocco="about"]').first().getByRole('button', { name: 'Modifica' }).click()
  await page.locator('[data-sezione-blocco="about"]').first().locator('input[type="text"]').first().fill('ZZ Condivisa QUATTRO')
  await cornice.getByText('ZZ Condivisa QUATTRO').waitFor({ timeout: 15000 }).then(() => esito(true, 'scrivendo nella scheda la pagina cambia subito'), () => esito(false, 'scrivendo nella scheda la pagina cambia subito'))
  // «Stacca»: qui resta una copia, la sezione e l'altra pagina non cambiano.
  await page.locator('[data-sezione-stacca]').click()
  await riq.locator('[data-blocco]:not([data-nome^="Sezione condivisa"])').getByText('ZZ Condivisa QUATTRO').waitFor({ timeout: 15000 }).then(() => esito(true, '«Stacca» lascia qui una copia normale'), () => esito(false, '«Stacca» lascia qui una copia normale'))
  await page.keyboard.press('Control+S')
  await page.getByText('Salvato ✓').first().waitFor({ timeout: 20000 }).catch(() => {})
  const homeDopo = (await deve(a.from('pagine').select('blocks').eq('id', homeA.id).single(), 'home dopo')).blocks
  const sezDopo = (await deve(a.from('sezioni').select('blocks').eq('id', sid).single(), 'sezione dopo')).blocks
  esito(homeDopo.some(b => b.type === 'about' && b.data?.title === 'ZZ Condivisa QUATTRO') && !homeDopo.some(b => b.type === 'sezione' && b.data.sezione_id === sid), 'la home salvata ha la copia e non più il riferimento')
  esito(sezDopo[0].data.title === 'ZZ Condivisa TRE' && (await html(urlAltra)).includes('ZZ Condivisa TRE'), 'la sezione e l’altra pagina sono rimaste com’erano: la modifica fatta prima di staccare è restata nella copia')
  esito(errori.length === 0, 'nessun errore nel browser', errori.slice(0, 3).join(' | '))

  console.log('\nquando non serve più')
  await api(A.token, 'PATCH', `/api/pagine/${altraA.id}`, { blocks: [testo('b-serv', 'ZZ Solo dei servizi')] })
  const finale = await api(A.token, 'DELETE', `/api/sezioni/${sid}`)
  esito(finale.stato === 200 && (await deve(a.from('sezioni').select('id').eq('id', sid), 'via')).length === 0, 'staccata da tutte le pagine, si elimina')
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const u of utenti) await a.auth.admin.deleteUser(u).catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
