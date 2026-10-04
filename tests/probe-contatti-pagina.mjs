// La pagina «Contatti»: liste calcolate dai fatti, tabella ordinabile, scheda con la storia.
//
// Francesco, guardando Garage 22 (04/10/2026): «trovo grande caos anche qui …
// è importante per il cliente arrivare lì e trovare ordine, così come delle
// liste di contatti ordinabili». La pagina era un elenco di schede con quattro
// comandi per riga, «Lead» su tutti e fino a cinque tag ciascuno.
//
// Aperta come la apre un titolare, con un browser vero. Cosa prova:
//   1. la route del registro: solo la propria azienda, niente senza login,
//      nessun dato di persone nel corpo;
//   2. le liste: ci sono quelle giuste, con i numeri giusti;
//   3. la tabella: si ordina, si cerca, e dice chi si può contattare;
//   4. la scheda: la storia letta dal registro, i comandi che prima erano sulla riga;
//   5. aggiungere un contatto a mano funziona, e la pipeline c'è ancora.
//
// Tutto su aziende ZZ scritte nel database: nessuna email, nessuna prenotazione vera.
//
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-contatti-pagina.mjs
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const aziende = [], utenti = []
const giorniFa = n => new Date(Date.now() - n * 864e5).toISOString()

async function azienda(nome) {
  const { data, error } = await a.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single()
  if (error) throw new Error('azienda: ' + error.message)
  aziende.push(data.id)
  await a.from('entita').insert({ azienda_id: data.id, tipo: 'ristorante', name: `ZZ Locale ${nome}`, slug: `zz-cp-${nome.toLowerCase()}-${t}`, active: true })
  return data
}
async function persona(az, dati, fatti = []) {
  const { data, error } = await a.from('contatti').insert({ azienda_id: az.id, fonte: 'evento', tags: ['evento', 'ZZ Serata A con un titolo lungo'], ...dati }).select().single()
  if (error) throw new Error('contatto: ' + error.message)
  for (const f of fatti) {
    const { error: e2 } = await a.from('contatti_attivita').insert({ azienda_id: az.id, contatto_id: data.id, ...f })
    if (e2) throw new Error('registro: ' + e2.message)
  }
  return data
}

let browser = null
try {
  const mia = await azienda('PAGINA'), altra = await azienda('ALTRA')
  const SA = '11111111-1111-4111-8111-11111111aaaa', SB = '22222222-2222-4222-8222-22222222bbbb', MO = '33333333-3333-4333-8333-33333333cccc'
  const serataA = (n, quando, posti = 2) => ({ tipo: 'evento', titolo: 'ZZ Serata A', origine_id: SA, riferimento: `a-${n}-${t}`, dettaglio: { posti }, avvenuta_il: quando })
  const serataB = (n, quando) => ({ tipo: 'evento', titolo: 'ZZ Serata B', origine_id: SB, riferimento: `b-${n}-${t}`, dettaglio: { posti: 1 }, avvenuta_il: quando })

  const anna = await persona(mia, { nome: 'ZZ Anna', email: `zz-anna-${t}@playwright.internal`, telefono: '333 1112233', iscritto_newsletter: true },
    [serataA(1, giorniFa(20)), serataB(1, giorniFa(3)), { tipo: 'modulo', titolo: 'ZZ Modulo iscrizione', origine_id: MO, riferimento: `m-1-${t}`, avvenuta_il: giorniFa(30) }])
  await persona(mia, { nome: 'ZZ Bruno', email: `zz-bruno-${t}@gmail.con` }, [serataA(2, giorniFa(19), 12), serataA(3, giorniFa(19), 2)])
  await persona(mia, { nome: 'ZZ Carla', telefono: '+39 347 5556677', telefono_e164: '+393475556677' }, [{ tipo: 'lista_attesa', titolo: 'ZZ Serata B', origine_id: SB, riferimento: `w-1-${t}`, dettaglio: { posti: 4 }, avvenuta_il: giorniFa(5) }])
  await persona(mia, { nome: 'ZZ Dario', email: `zz-dario-${t}@playwright.internal`, fonte: 'manuale', tags: [] })
  const estraneo = await persona(altra, { nome: 'ZZ Estraneo', email: `zz-estraneo-${t}@playwright.internal` }, [serataA(9, giorniFa(1))])

  const email = `zz-cp-tit-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utenti.push(u.user.id)
  await a.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: 'ZZ Titolare', azienda_id: mia.id }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const H = { Authorization: `Bearer ${s.session.access_token}` }

  console.log('\n1 · LA ROUTE DEL REGISTRO\n')
  ok((await fetch(`${BASE}/api/contatti/attivita`)).status === 401, 'senza login non risponde')
  const r = await fetch(`${BASE}/api/contatti/attivita?azienda_id=${altra.id}`, { headers: H })
  const grezzo = await r.text(), righe = JSON.parse(grezzo)
  ok(r.status === 200 && righe.length === 6 && !righe.some(x => x.contatto_id === estraneo.id), `chiedendo l'azienda di un altro si riceve solo la propria (${righe.length} righe, nessuna altrui)`)
  ok(!/playwright\.internal|gmail\.con|ZZ Anna|ZZ Bruno|\+39|3331112233/.test(grezzo), 'nel corpo grezzo nessun nome, email o telefono')
  ok([...new Set(righe.flatMap(x => Object.keys(x)))].sort().join(',') === 'avvenuta_il,contatto_id,dettaglio,origine_id,riferimento,tipo,titolo', 'escono solo i campi del registro')

  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1360, height: 1000 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  await page.goto(`${BASE}/admin/contatti`, { waitUntil: 'domcontentloaded' })
  // Se la tabella non compare si dice perché: un errore nel browser non lo vede né la build né una GET.
  await page.locator('[data-tabella-contatti]').waitFor({ timeout: 60000 }).catch(async e => {
    console.log('  errori nel browser:', errori.join(' | ') || 'nessuno')
    console.log('  a schermo:', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300))
    throw e
  })
  await page.waitForTimeout(500)
  if (process.env.FOTO) await page.screenshot({ path: `${process.env.FOTO}/contatti-pagina.png`, fullPage: true })
  const liste = async () => Object.fromEntries(await page.locator('[data-lista]').evaluateAll(els => els.map(e => [e.querySelector('span').textContent.trim(), Number(e.querySelectorAll('span')[1].textContent)])))
  const nomi = () => page.locator('[data-tabella-contatti] tbody tr td:first-child > div:first-child').allInnerTexts()
  const conto = async () => (await page.locator('[data-conto-lista]').innerText()).replace(/\s+/g, ' ')

  console.log('\n2 · LE LISTE\n')
  const L = await liste()
  ok(L['Tutti'] === 4 && L['Si possono contattare'] === 1 && L['Tornati più volte'] === 1, `Tutti 4 · contattabili 1 · tornati 1 (${L['Tutti']}, ${L['Si possono contattare']}, ${L['Tornati più volte']})`)
  // Bruno ha prenotato DUE volte la stessa serata: è una volta sola, non «tornato».
  ok(L['ZZ Serata A'] === 2 && L['ZZ Serata B'] === 1, `una lista per ogni evento, e chi prenota due volte la stessa serata conta una volta (A ${L['ZZ Serata A']}, B ${L['ZZ Serata B']})`)
  ok(L['ZZ Modulo iscrizione'] === 1 && L['Aggiunti a mano'] === 1 && L['Email da correggere'] === 1, 'moduli, aggiunti a mano ed email da correggere hanno la loro lista')
  const testoListe = (await page.locator('[data-liste]').innerText()).replace(/\s+/g, ' ')
  ok(/EVENTI .*LISTE D’ATTESA .*MODULI .*ALTRO .*DA SISTEMARE/i.test(testoListe), 'raggruppate per provenienza')
  ok(!/ZZ Estraneo/.test(await page.locator('body').innerText()), 'i contatti di un’altra azienda non compaiono')

  console.log('\n3 · LA TABELLA\n')
  ok((await nomi())[0] === 'ZZ Anna', `all’inizio è in cima chi si è visto più di recente (${(await nomi())[0]})`)
  const corpo = (await page.locator('[data-tabella-contatti]').innerText()).replace(/\s+/g, ' ')
  ok(!/Nuovo lead|ZZ Serata A con un titolo lungo/.test(corpo), 'niente «Lead» e niente tag automatici sulle righe')
  ok(/Ha prenotato «ZZ Serata B»/.test(corpo) && /In lista d’attesa per «ZZ Serata B»/.test(corpo), 'l’ultima attività è detta a parole')
  ok(/email da correggere/.test(corpo), 'un’email scritta male è segnalata sulla riga')
  await page.locator('[data-ordina="nome"]').click()
  ok(JSON.stringify(await nomi()) === JSON.stringify(['ZZ Anna', 'ZZ Bruno', 'ZZ Carla', 'ZZ Dario']), 'cliccando «Nome» si ordina dalla A')
  await page.locator('[data-ordina="nome"]').click()
  ok((await nomi())[0] === 'ZZ Dario', 'ricliccando si inverte')
  await page.locator('[data-ordina="volte"]').click()
  ok((await nomi())[0] === 'ZZ Anna' && (await nomi())[3] === 'ZZ Dario', 'per «Attività»: prima chi ha fatto di più')
  await page.locator('[data-lista]', { hasText: 'ZZ Serata A' }).click()
  ok((await page.locator('[data-titolo-lista]').innerText()) === 'Chi ha prenotato «ZZ Serata A»' && /2 persone · 1 si può contattare per promozione/.test(await conto()), `la lista dell’evento dice chi c’è e a quanti si può scrivere («${await conto()}»)`)
  await page.locator('[data-lista]', { hasText: 'Email da correggere' }).click()
  ok(JSON.stringify(await nomi()) === JSON.stringify(['ZZ Bruno']) && /nessuna ha dato il consenso/.test(await conto()), 'e se nessuno ha dato il consenso lo dice')
  await page.locator('[data-lista="tutti"]').click()
  await page.getByPlaceholder(/Cerca/).fill('347')
  ok(JSON.stringify(await nomi()) === JSON.stringify(['ZZ Carla']), 'la ricerca trova anche per numero')
  await page.getByPlaceholder(/Cerca/).fill('')

  console.log('\n4 · LA SCHEDA\n')
  await page.locator(`[data-contatto="${anna.id}"]`).click()
  await page.locator('[data-storia]').waitFor({ timeout: 8000 })
  const storia = (await page.locator('[data-storia]').innerText()).replace(/\s+/g, ' ')
  ok(/3 attività/.test(storia) && storia.indexOf('ZZ Serata B') < storia.indexOf('ZZ Serata A') && /Ha compilato «ZZ Modulo iscrizione»/.test(storia), 'la storia viene dal registro, la più recente in cima')
  ok(/2 posti/.test(storia), 'con i dettagli (quanti posti)')
  ok(await page.getByRole('button', { name: /Copia il link per la recensione/ }).count() === 1 && await page.getByRole('button', { name: 'Elimina contatto' }).count() === 1, 'il link per la recensione ed «Elimina» ora stanno qui')
  await page.locator('textarea').fill('Nota scritta dal titolare')
  await page.getByRole('button', { name: 'Salva modifiche' }).click()
  await page.locator('[data-storia]').waitFor({ state: 'detached', timeout: 10000 })
  const { data: dopo } = await a.from('contatti').select('note, attivita_numero').eq('id', anna.id).single()
  ok(dopo.note === 'Nota scritta dal titolare' && dopo.attivita_numero === 3, 'salvare la scheda scrive le note e non tocca la storia')

  console.log('\n5 · AGGIUNGERE A MANO, E LA PIPELINE\n')
  await page.getByRole('button', { name: 'Aggiungi' }).first().click()
  await page.getByPlaceholder('Nome e cognome').fill('ZZ Elena')
  await page.getByPlaceholder('+39 333 1234567').fill('320 1234567')
  await page.getByRole('button', { name: 'Aggiungi contatto' }).click()
  await page.locator('[data-tabella-contatti]').getByText('ZZ Elena').waitFor({ timeout: 15000 }).catch(() => {})
  const { data: elena } = await a.from('contatti').select('telefono_e164, fonte').eq('azienda_id', mia.id).eq('nome', 'ZZ Elena').maybeSingle()
  ok(elena?.fonte === 'manuale' && elena?.telefono_e164 === '+393201234567', `un contatto aggiunto a mano si crea davvero, con la chiave del telefono (${elena ? elena.telefono_e164 : 'NON CREATO'})`)
  ok((await liste())['Aggiunti a mano'] === 2, 'ed entra da solo nella sua lista')
  await page.getByRole('button', { name: 'Pipeline' }).click()
  await page.getByText('Nuovo lead').first().waitFor({ timeout: 8000 })
  ok(/In trattativa/.test(await page.locator('body').innerText()), 'la pipeline è rimasta, nella sua vista')
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
  await ctx.close()

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'I CONTATTI SI LEGGONO: LISTE, ORDINE, STORIA')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
