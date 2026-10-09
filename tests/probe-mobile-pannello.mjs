// Il pannello a larghezza telefono: cosa esce dallo schermo.
//
// 09/10/2026, Francesco: «mi sono reso conto di un bug nel design mobile — la
// parte relativa agli eventi va sistemata, ma forse il bug può essere esteso
// in generale alla versione mobile».
//
// Non deduce dal codice: apre le pagine a 390px con dati LUNGHI (un nome senza
// spazi, un'email lunga, un titolo lungo) e misura:
//   · la pagina scorre di lato? (non deve mai)
//   · quali elementi finiscono oltre il bordo destro, e di quanto;
//   · quali pulsanti sono tagliati;
//   · quali testi sono SCHIACCIATI (una colonna larga una lettera, che si
//     legge in verticale) o SBORDANO sopra quello che hanno accanto;
//   · quali titoli sono troncati fino a non dire più niente («ZZ …»).
// ⚠️ La prima versione cercava solo ciò che esce dallo schermo e dava tutto
// verde su una pagina col titolo scritto in verticale: un difetto di
// impaginazione su telefono quasi mai «esce», si stringe.
// E fa una foto di ogni pagina, perché un difetto di impaginazione si vede
// prima di misurarsi.
//
// Azienda ZZ, si pulisce da sola. Nessuna email parte.
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-mobile-pannello.mjs <cartella-foto> [--largo 390]
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const foto = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null
const iL = process.argv.indexOf('--largo')
const LARGO = iL > -1 ? Number(process.argv[iL + 1]) : 390
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }

// Eseguita nel browser.
const MISURA = () => {
  const vw = document.documentElement.clientWidth
  const dentroScorrevole = el => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return n } return null }
  const descr = el => { const p = []; for (let n = el; n && n !== document.body && p.length < 3; n = n.parentElement) { let s = n.tagName.toLowerCase(); for (const at of n.attributes) if (at.name.startsWith('data-')) { s += `[${at.name}]`; break } p.unshift(s) } return p.join(' > ') }
  const fuori = [], tagliati = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    // Oltre il bordo destro (o sinistro) dello schermo, e non dentro un riquadro che scorre o taglia di suo.
    if ((r.right > vw + 1 || r.left < -1) && !dentroScorrevole(el) && cs.position !== 'fixed') {
      fuori.push({ dove: descr(el), sfora: Math.round(Math.max(r.right - vw, -r.left)), largo: Math.round(r.width), testo: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50) })
    }
    // Pulsanti e link: tagliati dal loro contenitore, o troppo piccoli per un dito.
    if (el.tagName === 'BUTTON' || (el.tagName === 'A' && el.getAttribute('href'))) {
      const c = dentroScorrevole(el)
      if (c && getComputedStyle(c).overflowX === 'hidden') {
        const rc = c.getBoundingClientRect()
        if (r.right > rc.right + 2 || r.left < rc.left - 2) tagliati.push({ dove: descr(el), testo: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40), nascosti: Math.round(Math.max(r.right - rc.right, rc.left - r.left)) })
      }
    }
  }
  // Testi schiacciati, che sbordano, o troncati fino a sparire.
  const schiacciati = [], sbordano = [], troncati = []
  for (const el of document.querySelectorAll('body *')) {
    const proprio = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim()
    if (proprio.length < 6) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.display === 'inline') continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const riga = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3
    const corpo = parseFloat(cs.fontSize)
    // Schiacciato: così stretto che ci stanno meno di quattro caratteri per riga.
    if (r.width < corpo * 2.2 && r.height > riga * 3) schiacciati.push({ dove: descr(el), largo: Math.round(r.width), alto: Math.round(r.height), testo: proprio.slice(0, 50) })
    // Sborda: il testo è più largo della sua scatola e niente lo taglia → finisce sopra il vicino.
    else if (el.scrollWidth - el.clientWidth > 2 && cs.overflowX === 'visible' && !dentroScorrevole(el)) sbordano.push({ dove: descr(el), di: el.scrollWidth - el.clientWidth, testo: proprio.slice(0, 50) })
    // Troncato coi puntini fino a mostrare meno di un terzo, e meno di otto caratteri.
    else if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth) {
      const visibili = Math.floor(el.clientWidth / (corpo * 0.55))
      if (visibili < 8 && visibili < proprio.length / 3) troncati.push({ dove: descr(el), visibili, testo: proprio.slice(0, 50) })
    }
  }
  // Solo i più esterni: un figlio che sfora insieme al padre è lo stesso difetto.
  const insieme = new Set(fuori.map(f => f.dove))
  return {
    scorre: document.documentElement.scrollWidth - vw,
    fuori: fuori.sort((x, y) => y.sfora - x.sfora).filter((f, i, l) => l.findIndex(g => g.testo === f.testo) === i).slice(0, 6),
    tagliati: tagliati.slice(0, 6),
    schiacciati: schiacciati.slice(0, 6), sbordano: sbordano.slice(0, 6), troncati: troncati.slice(0, 6),
    quanti: insieme.size,
  }
}

let az = null, utente = null, browser = null, problemi = 0
function stampa(nome, m, coda = '') {
  const pulita = m.scorre <= 0 && ![m.fuori, m.tagliati, m.schiacciati, m.sbordano, m.troncati].some(l => l.length)
  if (!pulita) problemi++
  console.log(`  ${pulita ? '✓' : '✗'} ${nome}${coda}${m.scorre > 0 ? `  — la pagina scorre di lato di ${m.scorre}px` : ''}`)
  for (const f of m.fuori) console.log(`      fuori dallo schermo di ${f.sfora}px: «${f.testo}»  ${f.dove}`)
  for (const g of m.tagliati) console.log(`      pulsante tagliato di ${g.nascosti}px: «${g.testo}»  ${g.dove}`)
  for (const x of m.schiacciati) console.log(`      SCHIACCIATO (largo ${x.largo}px, alto ${x.alto}px): «${x.testo}»  ${x.dove}`)
  for (const x of m.sbordano) console.log(`      sborda di ${x.di}px sopra il vicino: «${x.testo}»  ${x.dove}`)
  for (const x of m.troncati) console.log(`      troncato a ~${x.visibili} caratteri: «${x.testo}»  ${x.dove}`)
}
try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-MOBILE-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale con un nome piuttosto lungo', slug: `zz-mob-${t}`, active: true }).select().single(), 'entità')
  const ev = await deve(a.from('eventi').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, title: 'ZZ Serata di degustazione con musica dal vivo e cena alla carta', slug: `zz-mob-${t}`,
    date_start: new Date(Date.now() + 9 * 864e5).toISOString(), price: 35, prezzo_modo: 'cifra', acconto_percentuale: 30, seats_total: 60, posti_riservati: 10, published: true, active: true, notify_owner_on_booking: false, send_guest_confirmation: false }).select().single(), 'evento')
  await deve(a.from('eventi').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, title: 'ZZ Concerto', slug: `zz-mob2-${t}`,
    date_start: new Date(Date.now() - 9 * 864e5).toISOString(), price: 0, prezzo_modo: 'gratuito', published: true, active: true }).select().single(), 'evento passato')
  const riga = (nome, extra) => ({ event_id: ev.id, guest_name: nome, guest_email: `${nome.toLowerCase().replace(/[^a-z]/g, '')}.indirizzo.molto.lungo-${t}@playwright.internal`, guest_phone: '+39 333 1234567', seats: 2, total_amount: 70, privacy_accettata: true, notes: 'Allergia alle arachidi, tavolo vicino al palco se possibile, arrivano tardi', ...extra })
  await deve(a.from('event_bookings').insert([
    riga('Mariagiovanna Francescantonietti-Dellarovere', { status: 'confirmed', pagamento_stato: 'pagato', importo_online: 21 }),
    riga('Annaluciamariateresagiuseppinafrancesca', { status: 'confirmed', pagamento_stato: 'non_richiesto' }),
    riga('Carlo Link', { status: 'confirmed', pagamento_stato: 'non_pagato', pagamento_id: `cs_test_mob${t}`, pagamento_richiesto_il: new Date().toISOString(), importo_online: 21 }),
    riga('Dario Alla Cassa', { status: 'pending', pagamento_stato: 'non_pagato', pagamento_id: `cs_test_mobb${t}` }),
    riga('Elena Da Confermare', { status: 'pending', pagamento_stato: 'non_richiesto' }),
    riga('Franco In Attesa', { status: 'waitlist', pagamento_stato: 'non_richiesto' }),
    riga('Gina Disdetta', { status: 'cancelled', pagamento_stato: 'non_pagato' }),
  ]), 'prenotazioni')
  const tutto = [{ start: '09:00', end: '18:00' }]
  const ris = await deve(a.from('risorse').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, nome: 'ZZ Sala grande al piano superiore', modalita: 'slot', durata_minuti: 60, quantita: 1, prezzo: 80, acconto_percentuale: 25, attiva: true, visibile_minisito: true,
    disponibilita: { lun: tutto, mar: tutto, mer: tutto, gio: tutto, ven: tutto, sab: tutto, dom: tutto } }).select().single(), 'risorsa')
  await deve(a.from('prenotazioni').insert({ risorsa_id: ris.id, azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, data: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10), ora_inizio: '10:00', ora_fine: '11:00',
    cliente_nome: 'Mariagiovanna Francescantonietti-Dellarovere', cliente_email: `indirizzo.molto.lungo.davvero-${t}@playwright.internal`, cliente_telefono: '+39 333 1234567', n_persone: 2, stato: 'in_attesa', pagamento_stato: 'non_richiesto', importo_totale: 80, prezzo_unitario: 80, privacy_accettata: true }), 'prenotazione risorsa')

  const email = `zz-mob-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })

  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: LARGO, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))

  const PAGINE = [
    ['eventi-elenco', '/admin/eventi', 'ZZ Serata'],
    ['evento-prenotazioni', `/admin/eventi/${ev.id}/prenotazioni`, 'Mariagiovanna'],
    ['evento-modifica', `/admin/eventi/${ev.id}`, null],
    ['prenotazioni', '/admin/prenotazioni', 'ZZ Serata'],
    ['calendario-risorse', '/admin/booking', null],
    ['risorse', '/admin/booking/risorse', 'ZZ Sala'],
    ['dashboard', '/admin', null],
    ['contatti', '/admin/contatti', null],
    ['newsletter', '/admin/newsletter', null],
    ['pagamenti', '/admin/pagamenti', null],
  ]
  // ⚠️ La sonda prova prima sé stessa: inietta un testo schiacciato e uno che
  // sborda, e si ferma se non li trova. Senza, un verde non direbbe niente.
  await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await page.evaluate(() => {
    const d = document.createElement('div')
    d.innerHTML = '<div style="display:flex;width:300px"><div style="flex:1;min-width:0;font-size:16px" data-finto-schiacciato>Un titolo abbastanza lungo da andare a capo molte volte</div><div style="flex-shrink:0;width:290px">x</div></div><div style="width:80px;white-space:nowrap;font-size:16px" data-finto-sborda>Parolalunghissimasenzaspaziechenonvaacapo</div>'
    document.body.appendChild(d)
  })
  const prova = await page.evaluate(MISURA)
  if (!prova.schiacciati.some(x => x.dove.includes('data-finto-schiacciato')) || !prova.sbordano.some(x => x.dove.includes('data-finto-sborda'))) {
    throw new Error(`la sonda non vede i difetti finti (schiacciati: ${prova.schiacciati.length}, sbordano: ${prova.sbordano.length}): la misura è sbagliata`)
  }
  // Il menu non si disegna finché azienda ed entità non sono caricate: si aspetta
  // che ci sia, o la sonda proverebbe dieci pagine credendo di averle provate tutte.
  await page.waitForFunction(() => document.querySelectorAll('a[href^="/admin"]').length > 15, null, { timeout: 45000 }).catch(() => {})
  const nelMenu = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/admin"]')].map(x => x.getAttribute('href').split('?')[0]))])
  for (const h of nelMenu) if (!PAGINE.some(x => x[1] === h) && !/login|logout/.test(h)) PAGINE.push([h.replace('/admin/', '').replace(/\//g, '-').replace(ent.id, 'entita') || 'dashboard', h, null])
  console.log(`\nA ${LARGO}px di larghezza — ${PAGINE.length} pagine (la sonda vede i due difetti finti: può misurare)\n`)
  for (const [nome, percorso, attendi] of PAGINE) {
    await page.goto(BASE + percorso, { waitUntil: 'domcontentloaded' })
    if (attendi) await page.getByText(attendi).first().waitFor({ timeout: 45000 }).catch(() => {})
    else await page.waitForTimeout(3500)
    await page.waitForTimeout(800)
    stampa(nome, await page.evaluate(MISURA), `  ${percorso.replace(ev.id, '<evento>').replace(ent.id, '<entità>')}`)
    if (foto) await page.screenshot({ path: `${foto}/mobile-${nome}.png`, fullPage: true })
  }

  // La finestra «Chiedi il pagamento» e il modulo «Segna prenotazione», aperti.
  await page.goto(`${BASE}/admin/eventi/${ev.id}/prenotazioni`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Mariagiovanna').first().waitFor({ timeout: 45000 }).catch(() => {})
  await page.getByRole('button', { name: /Segna prenotazione/ }).click().catch(() => {})
  await page.waitForTimeout(600)
  stampa('modulo «Segna prenotazione» aperto', await page.evaluate(MISURA))
  if (foto) await page.screenshot({ path: `${foto}/mobile-evento-segna.png` })
  await page.locator('[data-chiedi-pagamento-di]').first().click().catch(() => {})
  await page.locator('[data-chiedi-pagamento]').waitFor({ timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1500)
  stampa('finestra «Chiedi il pagamento»', await page.evaluate(MISURA))
  if (foto) await page.screenshot({ path: `${foto}/mobile-chiedi-pagamento.png` })

  // La pagina pubblica dell'evento, come la apre chi arriva da un social: senza login.
  const fuoriCtx = await browser.newContext({ locale: 'it-IT', viewport: { width: LARGO, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const pub = await fuoriCtx.newPage()
  pub.on('pageerror', e => errori.push('pubblica: ' + e.message))
  await pub.goto(`${BASE}/eventi/${ev.id}`, { waitUntil: 'networkidle' })
  await pub.getByRole('button', { name: 'Accetto' }).click({ timeout: 4000 }).catch(() => {})
  await pub.waitForTimeout(800)
  stampa('pagina pubblica dell’evento', await pub.evaluate(MISURA), '  /eventi/<evento>')
  if (foto) await pub.screenshot({ path: `${foto}/mobile-evento-pubblico.png`, fullPage: true })

  // L'ombra del menu chiuso, e lo sfondo che deve arrivare in fondo allo schermo.
  await page.goto(BASE + '/admin/eventi', { waitUntil: 'domcontentloaded' })
  await page.getByText('ZZ Serata').first().waitFor({ timeout: 45000 }).catch(() => {})
  const ombra = await page.evaluate(() => { const m = document.querySelector('.admin-sidebar'); return m ? getComputedStyle(m).boxShadow : 'manca' })
  const bassa = await page.evaluate(() => { const m = document.querySelector('.admin-main'); return m ? Math.round(m.getBoundingClientRect().bottom) >= window.innerHeight : true })
  if (ombra !== 'none' || !bassa) problemi++
  console.log(`  ${ombra === 'none' ? '✓' : '✗'} il menu laterale chiuso non lascia ombra sul bordo della pagina (${ombra})`)
  console.log(`  ${bassa ? '✓' : '✗'} lo sfondo della pagina arriva in fondo allo schermo`)

  console.log(errori.length ? `\n  ✗ errori nel browser: ${[...new Set(errori)].slice(0, 3).join(' | ')}` : '\n  ✓ nessun errore nel browser')
  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PAGINE DA GUARDARE` : 'A QUESTA LARGHEZZA NIENTE ESCE DALLO SCHERMO')
} catch (e) {
  console.error('ERRORE:', e.message.split('\n')[0]); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
