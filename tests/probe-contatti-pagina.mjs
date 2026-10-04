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
  const { data, error } = await a.from('contatti').insert({ azienda_id: az.id, fonte: 'evento', tags: ['evento', 'ZZ Serata A'], pipeline_stage: null, note: '[03/10/2026] Ha prenotato «ZZ Serata A» — 2 posti', ...dati }).select().single()
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
  await persona(mia, { nome: 'ZZ Dario', email: `zz-dario-${t}@playwright.internal`, fonte: 'manuale', tags: ['vip'], pipeline_stage: 'proposta', note: null })
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
  // Le etichette scritte a mano diventano liste; quelle messe dal sistema («evento», il titolo della serata) no.
  ok(L['vip'] === 1 && L['evento'] === undefined && L['In trattativa'] === 1, `un’etichetta a mano è una lista, quelle automatiche no (vip ${L['vip']}, evento ${L['evento']}, in trattativa ${L['In trattativa']})`)
  const testoListe = (await page.locator('[data-liste]').innerText()).replace(/\s+/g, ' ')
  ok(/EVENTI .*LISTE D’ATTESA .*MODULI .*ETICHETTE .*ALTRO .*DA SISTEMARE/i.test(testoListe), 'raggruppate per provenienza')
  ok(!/ZZ Estraneo/.test(await page.locator('body').innerText()), 'i contatti di un’altra azienda non compaiono')

  console.log('\n3 · LA TABELLA\n')
  ok((await nomi())[0] === 'ZZ Anna', `all’inizio è in cima chi si è visto più di recente (${(await nomi())[0]})`)
  const corpo = (await page.locator('[data-tabella-contatti]').innerText()).replace(/\s+/g, ' ')
  ok(!/Nuovo lead|Da contattare|\bevento\b/.test(corpo), 'niente stadio e niente tag automatici sulle righe')
  ok(/Ha prenotato «ZZ Serata B»/.test(corpo) && /In lista d’attesa per «ZZ Serata B»/.test(corpo), 'l’ultima attività è detta a parole')
  ok(/Email da correggere/.test(corpo), 'un’email scritta male è segnalata sulla riga')
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
  const scheda = page.locator('[data-scheda]')
  const storia = (await page.locator('[data-storia]').innerText()).replace(/\s+/g, ' ')
  ok(/3 attività/.test(storia) && storia.indexOf('ZZ Serata B') < storia.indexOf('ZZ Serata A') && /Ha compilato «ZZ Modulo iscrizione»/.test(storia), 'la storia viene dal registro, la più recente in cima')
  ok(/2 posti/.test(storia), 'con i dettagli (quanti posti)')
  ok(/Arrivato da: Evento/.test(await page.locator('[data-origine]').innerText()), 'in cima dice da dove è arrivato')
  const link = await page.locator('[data-recapiti] a').evaluateAll(els => els.map(e => e.getAttribute('href')))
  ok(link.some(h => h.startsWith('mailto:')) && link.includes('tel:333 1112233') && link.length === 2, `email e telefono si toccano (${link.map(h => h.split(':')[0]).join(', ')})`)
  // ⛔ La storia era scritta tre volte: registro, tag automatici, note. Nel
  // campo delle etichette ora ci sono solo quelle del titolare.
  ok(await scheda.getByText('ZZ Serata A', { exact: true }).count() === 0 && !/evento ×|lista attesa/.test(await scheda.innerText()), 'le etichette messe dal sistema non si vedono nella scheda')
  if (process.env.FOTO) await page.screenshot({ path: `${process.env.FOTO}/contatti-scheda.png` })
  const cassa = await scheda.boundingBox(), salva = await page.getByRole('button', { name: 'Salva modifiche' }).boundingBox()
  ok(cassa.height <= page.viewportSize().height * 0.93 && salva.y + salva.height <= cassa.y + cassa.height + 1 && salva.y > 0, 'la scheda sta nella finestra e «Salva» è sempre a vista')
  ok(await page.getByRole('button', { name: 'Elimina contatto' }).count() === 0, '«Elimina» non è più un pulsante rosso in fondo')
  await page.locator('[data-togliere]').click()
  const togliere = (await scheda.innerText()).replace(/\s+/g, ' ')
  ok(/Elimina contatto Sparisce dall’elenco/.test(togliere) && /Rendi anonimo Per chi chiede la cancellazione/.test(togliere) && !/GDPR|Art\. 17/.test(togliere), 'le due azioni che non si disfano stanno a parte, e ognuna dice cosa fa')
  ok(await page.getByRole('button', { name: /Copia il link per la recensione/ }).count() === 1, 'il link per la recensione sta qui')
  await page.keyboard.press('Escape')
  await page.locator('[data-scheda]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  ok(await page.locator('[data-scheda]').count() === 0, 'Esc chiude la scheda')

  // Salvare: le note sono del titolare, le etichette del sistema non si perdono.
  await page.locator(`[data-contatto="${anna.id}"]`).click()
  await page.locator('[data-scheda] textarea').fill('Nota scritta dal titolare')
  await page.locator('[data-scheda]').getByPlaceholder(/Aggiungi tag/).fill('amica')
  await page.locator('[data-scheda]').getByPlaceholder(/Aggiungi tag/).press('Enter')
  await page.locator('[data-trattativa]').selectOption('contattato')
  await page.locator('[data-scheda] input[type="checkbox"]').nth(1).check()
  ok(/Spunta solo se questa persona ti ha detto di sì/.test(await page.locator('[data-scheda]').innerText()) && /bloccare il numero da Meta/.test(await page.locator('[data-scheda]').innerText()), 'spuntando un consenso a mano si legge cosa comporta')
  await page.getByRole('button', { name: 'Salva modifiche' }).click()
  await page.locator('[data-scheda]').waitFor({ state: 'detached', timeout: 10000 })
  const { data: dopo } = await a.from('contatti').select('note, attivita_numero, tags, pipeline_stage, whatsapp_optin, whatsapp_optin_il, iscritto_newsletter').eq('id', anna.id).single()
  ok(dopo.note === 'Nota scritta dal titolare' && dopo.attivita_numero === 3, 'salvare la scheda scrive le note e non tocca la storia')
  ok(JSON.stringify(dopo.tags) === JSON.stringify(['evento', 'ZZ Serata A', 'amica']), `le etichette del sistema restano nei dati, quella nuova si aggiunge (${JSON.stringify(dopo.tags)})`)
  ok(dopo.pipeline_stage === 'contattato' && dopo.whatsapp_optin === true && !!dopo.whatsapp_optin_il && dopo.iscritto_newsletter === true, 'qualunque contatto si può mettere in trattativa dalla scheda, e il consenso segnato a mano ha la sua data')

  console.log('\n5 · AGGIUNGERE A MANO, E LE TRATTATIVE\n')
  await page.getByRole('button', { name: 'Aggiungi' }).first().click()
  await page.getByPlaceholder('Nome e cognome').fill('ZZ Elena')
  await page.getByPlaceholder('+39 333 1234567').fill('320 1234567')
  await page.getByRole('button', { name: 'Aggiungi contatto' }).click()
  await page.locator('[data-tabella-contatti]').getByText('ZZ Elena').waitFor({ timeout: 15000 }).catch(() => {})
  const { data: elena } = await a.from('contatti').select('telefono_e164, fonte, pipeline_stage').eq('azienda_id', mia.id).eq('nome', 'ZZ Elena').maybeSingle()
  ok(elena?.fonte === 'manuale' && elena?.telefono_e164 === '+393201234567', `un contatto aggiunto a mano si crea davvero, con la chiave del telefono (${elena ? elena.telefono_e164 : 'NON CREATO'})`)
  ok(elena?.pipeline_stage === null, 'e non finisce in trattativa da solo')
  ok((await liste())['Aggiunti a mano'] === 2, 'ed entra da solo nella sua lista')
  // ⛔ Si chiamava «Pipeline» e conteneva tutti: 114 contatti su 116 fermi a «Nuovo lead».
  await page.getByRole('button', { name: 'Trattative' }).click()
  await page.locator('[data-trattative]').waitFor({ timeout: 8000 })
  if (process.env.FOTO) await page.screenshot({ path: `${process.env.FOTO}/contatti-trattative.png` })
  const tr = (await page.locator('[data-trattative]').innerText()).replace(/\s+/g, ' ')
  ok(await page.locator('[data-trattativa-scheda]').count() === 2 && /Gli altri 3 contatti non sono in trattativa/.test(tr), `in trattativa c’è solo chi ci deve stare: 2 su 5 (${await page.locator('[data-trattativa-scheda]').count()})`)
  ok(/Da contattare .*Contattato .*In trattativa .*Concluso .*Perso/.test(tr) && !/Nuovo lead|Chiuso ✓/.test(tr), 'gli stadi hanno nomi in italiano')
  ok(await page.locator('[data-colonna="contattato"] [data-trattativa-scheda]').count() === 1 && await page.locator('[data-colonna="proposta"] [data-trattativa-scheda]').count() === 1, 'ognuno nella sua colonna')
  const colonne = await page.locator('[data-colonna]').evaluateAll(els => ({ destra: Math.max(...els.map(e => e.getBoundingClientRect().right)), schermo: innerWidth, schede: Math.max(...[...document.querySelectorAll('[data-trattativa-scheda]')].map(e => e.getBoundingClientRect().height)) }))
  ok(colonne.destra <= colonne.schermo && colonne.schede < 60, `le cinque colonne stanno nello schermo e le schede sono basse (${Math.round(colonne.schede)}px)`)
  ok(!/\bevento\b/.test(tr), 'niente tag automatici sulle schede')
  // Uno stadio inventato non entra, e non fa sparire nessuno.
  const finto = await fetch(`${BASE}/api/contatti/${anna.id}`, { method: 'PATCH', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ pipeline_stage: 'inventato' }) })
  ok(finto.status === 400, `uno stadio che non esiste viene rifiutato (HTTP ${finto.status})`)
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
  await ctx.close()

  console.log('\n5b · I COLLABORATORI\n')
  // 🔒 Senza il permesso «Contatti» non li leggono: prima il permesso nascondeva la voce di menu e basta.
  const collaboratore = async permessi => {
    const em = `zz-cp-staff-${utenti.length}-${t}@playwright.internal`, pw = randomBytes(24).toString('base64url') + 'Aa1!'
    const { data: us } = await a.auth.admin.createUser({ email: em, password: pw, email_confirm: true }); utenti.push(us.user.id)
    await a.from('profiles').upsert({ id: us.user.id, role: 'staff', full_name: 'ZZ Staff', azienda_id: mia.id, permissions: permessi }, { onConflict: 'id' })
    const { data: ss } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email: em, password: pw })
    return { Authorization: `Bearer ${ss.session.access_token}` }
  }
  const senza = await collaboratore({ eventi: true })
  const r1 = await fetch(`${BASE}/api/contatti`, { headers: senza }), r2 = await fetch(`${BASE}/api/contatti/attivita`, { headers: senza })
  const corpo1 = await r1.text()
  ok(r1.status === 403 && r2.status === 403 && !/ZZ Anna|playwright/.test(corpo1), `un collaboratore senza il permesso non legge né i contatti né il registro (HTTP ${r1.status}, ${r2.status})`)
  const con = await collaboratore({ contatti: true })
  const r3 = await fetch(`${BASE}/api/contatti`, { headers: con }).then(x => x.json())
  ok(Array.isArray(r3) && r3.length === 5 && r3.every(c => c.azienda_id === mia.id), 'con il permesso li legge, e solo quelli della sua azienda')

  console.log('\n6 · SU TELEFONO, E CON TANTA GENTE\n')
  // ⛔ La prima versione su un telefono era alta sei schermate: tutte le liste in
  // colonna prima del primo contatto, una tabella da scorrere di lato e i
  // pulsanti in alto fuori dallo schermo. Francesco: «da smartphone è innavigabile».
  const folla = Array.from({ length: 26 }, (_, i) => ({ azienda_id: mia.id, nome: `ZZ Folla ${String(i).padStart(2, '0')} con un nome lunghissimo che non finisce più`, email: `zz-folla-${i}-${t}@playwright.internal`, fonte: 'import', pipeline_stage: null, tags: i < 10 ? ['clienti-2026'] : [] }))
  await a.from('contatti').insert(folla)
  for (let i = 0; i < 9; i++) await a.from('contatti_attivita').insert({ azienda_id: mia.id, contatto_id: anna.id, tipo: 'evento', titolo: `ZZ Evento numero ${i} con un titolo molto lungo per vedere se si taglia`, origine_id: `44444444-4444-4444-8444-44444444440${i}`, riferimento: `folla-${i}-${t}`, avvenuta_il: giorniFa(40 + i) })
  const tel = await browser.newContext({ locale: 'it-IT', viewport: { width: 390, height: 844 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  const m = await tel.newPage()
  const erroriTel = []
  m.on('pageerror', e => erroriTel.push(e.message))
  await m.goto(`${BASE}/admin/contatti`, { waitUntil: 'domcontentloaded' })
  await m.locator('[data-schede-contatti]').waitFor({ timeout: 60000 })
  await m.waitForTimeout(600)
  if (process.env.FOTO) await m.screenshot({ path: `${process.env.FOTO}/contatti-telefono.png`, fullPage: true })
  const misura = await m.evaluate(() => ({ largo: document.documentElement.scrollWidth, alto: document.documentElement.scrollHeight, schermo: window.innerWidth }))
  ok(misura.largo <= misura.schermo, `niente esce di lato (pagina ${misura.largo}px su uno schermo di ${misura.schermo})`)
  ok(misura.alto < 844 * 3.2, `con 31 persone e 11 eventi la pagina sta in meno di tre schermate (${(misura.alto / 844).toFixed(1)})`)
  ok(!(await m.locator('[data-liste]').isVisible()) && await m.locator('[data-lista-tendina]').isVisible(), 'le liste sono un menu a tendina, non una colonna')
  ok(!(await m.locator('[data-tabella-contatti]').isVisible()), 'e al posto della tabella ci sono le schede')
  for (const nome of ['Importa', 'Esporta', 'Aggiungi']) {
    const b = await m.getByRole('button', { name: nome }).first().boundingBox()
    ok(!!b && b.x >= 0 && b.x + b.width <= 390, `il pulsante «${nome}» sta dentro lo schermo`)
  }
  ok(await m.locator('[data-contatto-scheda]').count() === 25 && /Mostra altri 6 · ne restano 6/.test(await m.locator('[data-mostra-altri]').innerText()), 'si vedono 25 persone per volta, e dice quante ne restano')
  ok(await m.locator('[data-lista-tendina] optgroup[label="Importati"] option').count() === 1 && /clienti-2026 \(10\)/.test(await m.locator('[data-lista-tendina]').innerText()), 'il nome dato a un file importato è una lista')
  await m.locator('[data-mostra-altri]').click()
  ok(await m.locator('[data-contatto-scheda]').count() === 31 && await m.locator('[data-mostra-altri]').count() === 0, '«Mostra altri» le aggiunge, e quando sono tutte sparisce')
  const larghezze = await m.locator('[data-contatto-scheda]').evaluateAll(els => Math.max(...els.map(e => e.getBoundingClientRect().right)))
  ok(larghezze <= 390, 'un nome lunghissimo si taglia con i puntini, non allarga la scheda')
  await m.locator('[data-lista-tendina]').selectOption({ label: 'Importati da file (26)' })
  await m.waitForTimeout(300)
  ok(await m.locator('[data-contatto-scheda]').count() === 25 && /26 persone/.test(await m.locator('[data-conto-lista]').innerText()), 'scegliendo una lista dalla tendina cambia l’elenco, e si riparte dalle prime 25')
  await m.locator('[data-lista-tendina]').selectOption('tutti')
  await m.locator('[data-ordine-tendina]').selectOption('volte:desc')
  await m.waitForTimeout(300)
  ok(/ZZ Anna/.test(await m.locator('[data-contatto-scheda]').first().innerText()), 'si ordina anche da telefono: in cima chi ha fatto di più')
  await m.locator('[data-contatto-scheda]').first().click()
  await m.locator('[data-storia]').waitFor({ timeout: 8000 })
  ok(true, 'toccando una scheda si apre la persona, con la sua storia')
  await m.keyboard.press('Escape')
  await m.getByRole('button', { name: 'Trattative' }).click()
  await m.locator('[data-linguetta="contattato"]').waitFor({ timeout: 8000 })
  const strette = await m.evaluate(() => ({ largo: document.documentElement.scrollWidth, alto: document.documentElement.scrollHeight, colonneVisibili: [...document.querySelectorAll('[data-colonna]')].filter(e => e.offsetParent).length }))
  ok(strette.largo <= 390 && strette.colonneVisibili === 0 && strette.alto < 844 * 1.5, `le trattative su telefono: uno stadio alla volta, niente da scorrere di lato (${(strette.alto / 844).toFixed(1)} schermate)`)
  await m.locator('[data-linguetta="contattato"]').click()
  ok(await m.locator('[data-trattativa-riga]').count() === 1 && /ZZ Anna/.test(await m.locator('[data-trattativa-riga]').first().innerText()), 'toccando una linguetta si vede chi è in quello stadio')
  ok(erroriTel.length === 0, `nessun errore nel browser${erroriTel.length ? ' — ' + erroriTel[0] : ''}`)
  await tel.close()

  // Su computer, con undici eventi: se ne vedono cinque e «Mostra altre».
  const pc = await browser.newContext({ locale: 'it-IT', viewport: { width: 1360, height: 900 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  const d = await pc.newPage()
  await d.goto(`${BASE}/admin/contatti`, { waitUntil: 'domcontentloaded' })
  await d.locator('[data-tabella-contatti]').waitFor({ timeout: 60000 })
  await d.waitForTimeout(500)
  if (process.env.FOTO) await d.screenshot({ path: `${process.env.FOTO}/contatti-computer.png`, fullPage: true })
  const prima = await d.locator('[data-lista]').count()
  ok(await d.locator('[data-altre="Eventi"]').innerText() === 'Mostra altre 6', `un gruppo lungo mostra cinque liste e «Mostra altre 6» (${await d.locator('[data-altre="Eventi"]').innerText().catch(() => 'manca')})`)
  await d.locator('[data-altre="Eventi"]').click()
  ok(await d.locator('[data-lista]').count() === prima + 6, 'e cliccandolo compaiono tutte')
  const altezze = await d.locator('[data-tabella-contatti] tbody tr').evaluateAll(els => els.map(e => e.getBoundingClientRect().height))
  ok(altezze.length === 25 && Math.max(...altezze) < 70, `le righe restano basse anche con nomi e titoli lunghi (la più alta ${Math.round(Math.max(...altezze))}px)`)
  await pc.close()

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
