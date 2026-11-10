// Il titolare modifica una prenotazione di una risorsa (10/11/2026, Automax).
//
// Le domande a cui si risponde provando:
//   1. spostando le date il totale si ricalcola col listino (calendario dei
//      prezzi compreso), e un totale scritto a mano resta quello;
//   2. la prenotazione non occupa sé stessa (allungarla di un giorno si può),
//      ma non si sovrappone a un'altra;
//   3. le regole di vendita (minimo, giorni senza ritiro) non fermano il
//      titolare; i giorni non vendibili sì;
//   4. già pagata: date sì, totale no. Alla cassa del sito o annullata: niente;
//   5. un'altra azienda riceve 404 e i valori ostili vengono rifiutati, i campi
//      non previsti ignorati;
//   6. (--browser) il percorso dal pannello: Prenotazioni → Modifica → Salva.
//
// Crea due aziende «ZZ» e pulisce con `cancellaAziendaDiProva`.
// Uso: node probe-modifica-prenotazione.mjs [--browser] [cartella-foto]
//      ($env:TEST_URL='http://localhost:3000' per il locale)

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { admin, cancellaAziendaDiProva } from './probe-auth.mjs'

const { SUPABASE_URL, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const BROWSER = process.argv.includes('--browser')
const FOTO = process.argv.slice(2).find(a => !a.startsWith('--'))
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

const piu = (g, n) => { const d = new Date(`${g}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const dow = g => new Date(`${g}T12:00:00Z`).getUTCDay()
let LUN = piu(new Date().toISOString().slice(0, 10), 40)
while (dow(LUN) !== 1) LUN = piu(LUN, 1)
const MAR = piu(LUN, 1), MER = piu(LUN, 2), GIO = piu(LUN, 3), VEN = piu(LUN, 4), SAB = piu(LUN, 5)

async function aziendaConTitolare(nome) {
  const { data: a, error } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${Date.now()}`, require_2fa: false }).select().single()
  if (error) throw error
  const { data: e } = await admin.from('entita').insert({ azienda_id: a.id, tipo: 'attivita', slug: `zz-${nome.toLowerCase()}-${Date.now()}`, name: `ZZ ${nome}`, active: true }).select().single()
  const email = `probe-mod-${nome.toLowerCase()}-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: us } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  await admin.from('profiles').upsert({ id: us.user.id, role: 'admin_azienda', azienda_id: a.id, full_name: 'P' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  return { az: a.id, ent: e.id, uid: us.user.id, token: s.session.access_token, sessione: s.session }
}

const conToken = token => (path, opts = {}) => fetch(`${TEST_URL}${path}`, {
  ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
})

let A = null, B = null
try {
  A = await aziendaConTitolare('ModA')
  B = await aziendaConTitolare('ModB')
  const fa = conToken(A.token), fb = conToken(B.token)

  console.log('\nMODIFICARE UNA PRENOTAZIONE\n')
  const creata = await fa('/api/booking/risorse', { method: 'POST', body: JSON.stringify({
    nome: 'ZZ Furgone', modalita: 'giornaliero', entity_tipo: 'attivita', entity_id: A.ent,
    quantita: 1, prezzo: 100, attiva: true, conferma_auto: true, visibile_minisito: true,
    disponibilita: { conta_giorno_uscita: true },
  }) })
  if (!creata.ok) throw new Error(`risorsa: ${(await creata.text()).slice(0, 200)}`)
  const R = (await creata.json()).id
  // Il venerdì costa 150; il mercoledì ha un minimo di 7 giorni e niente ritiro
  // il giovedì; il sabato non è vendibile.
  const tariffe = corpo => fa(`/api/booking/risorse/${R}/tariffe`, { method: 'POST', body: JSON.stringify(corpo) })
  await tariffe({ azione: 'imposta', dal: VEN, al: VEN, valori: { prezzo: 150 } })
  await tariffe({ azione: 'imposta', dal: MER, al: MER, valori: { minimo_notti: 6 } })
  await tariffe({ azione: 'imposta', dal: GIO, al: GIO, valori: { chiuso_arrivo: true } })
  await tariffe({ azione: 'imposta', dal: SAB, al: SAB, valori: { non_vendibile: true } })

  const prenota = async (dal, al, extra = {}) => {
    const r = await fa('/api/booking/prenotazioni', { method: 'POST', body: JSON.stringify({ risorsa_id: R, data: dal, data_fine: al, cliente_nome: 'Mario Prova', cliente_email: 'delivered+mod@resend.dev', ...extra }) })
    const j = await r.json()
    if (!r.ok) throw new Error(`prenotazione ${dal}→${al}: ${j.error}`)
    return j
  }
  const modifica = (id, corpo, f = fa) => f(`/api/booking/prenotazioni/${id}/modifica`, { method: 'POST', body: JSON.stringify(corpo) })
  const riga = async id => (await admin.from('prenotazioni').select('*').eq('id', id).single()).data

  // ── 1. date e totale ──
  const p1 = await prenota(LUN, LUN)
  ok(Number(p1.importo_totale) === 100, `nasce lun→lun a 100 (${p1.importo_totale})`)
  let r = await modifica(p1.id, { anteprima: true, data: LUN, data_fine: MAR })
  let j = await r.json()
  ok(r.ok && j.listino === 200 && j.giorni === 2, `anteprima lun→mar: listino 200, 2 giorni (${j.listino ?? j.error})`)
  ok(Number((await riga(p1.id)).importo_totale) === 100 && (await riga(p1.id)).data_fine === LUN, 'l’anteprima non scrive niente')
  r = await modifica(p1.id, { data: LUN, data_fine: MAR, cliente_telefono: '333 1234567' })
  j = await r.json()
  let p = await riga(p1.id)
  ok(r.ok && p.data_fine === MAR && Number(p.importo_totale) === 200, `salvata lun→mar a 200 (${p.data_fine}, ${p.importo_totale})`)
  ok(p.cliente_telefono === '333 1234567' && p.dettaglio_prezzo?.giorni?.length === 2, 'telefono salvato, fotografia del conto aggiornata')
  r = await modifica(p1.id, { importo_totale: 180 })
  p = await riga(p1.id)
  ok(r.ok && Number(p.importo_totale) === 180 && p.dettaglio_prezzo?.a_mano === true, `totale scritto a mano: 180, segnato «a mano» (${p.importo_totale})`)

  // ── 2. non occupa sé stessa, ma non si sovrappone ad altre ──
  const p2 = await prenota(GIO, GIO, { cliente_nome: 'Altro Cliente' }).catch(() => null)
  // Il giovedì non si ritira dal sito: il titolare sì (regole di vendita), ma il
  // POST del titolare le applica. Allora l'altra prenotazione va il venerdì.
  const altra = p2 || await prenota(VEN, VEN, { cliente_nome: 'Altro Cliente' })
  r = await modifica(p1.id, { data: LUN, data_fine: MER })
  ok(r.ok, `allungare la propria di un giorno (lun→mer) si può (HTTP ${r.status})`)
  r = await modifica(p1.id, { data: LUN, data_fine: altra.data }); j = await r.json()
  ok(r.status === 409 && /occupato/i.test(j.error || ''), `sovrapporsi a un’altra prenotazione: 409 «${j.error}»`)
  p = await riga(p1.id)
  ok(p.data_fine === MER, 'dopo il rifiuto la prenotazione è rimasta com’era')

  // ── 3. regole di vendita no, non vendibile sì ──
  await admin.from('prenotazioni').delete().eq('id', altra.id)
  const p3 = await prenota(VEN, VEN, { cliente_nome: 'Terzo' })
  r = await modifica(p3.id, { data: GIO, data_fine: GIO }); j = await r.json()
  ok(r.ok, `il titolare sposta il ritiro al giovedì (chiuso al ritiro per il sito): ${r.status} ${j.error || ''}`)
  r = await modifica(p3.id, { data: VEN, data_fine: SAB }); j = await r.json()
  ok(r.status === 409 && /non è disponibile/.test(j.error || ''), `il sabato non vendibile resta fuori: «${j.error}»`)
  // Il minimo di 7 giorni del mercoledì non vale per il titolare: provato
  // allungando p1 sopra (lun→mer), e qui partendo dal mercoledì.
  await admin.from('prenotazioni').delete().eq('id', p1.id)
  r = await modifica(p3.id, { data: MER, data_fine: MER }); j = await r.json()
  ok(r.ok, `ritiro e riconsegna il mercoledì (minimo 7 giorni per il sito): ${r.status} ${j.error || ''}`)

  // ── 4. pagata, alla cassa, annullata ──
  await admin.from('prenotazioni').update({ pagamento_stato: 'pagato', importo_online: 100 }).eq('id', p3.id)
  const prima = Number((await riga(p3.id)).importo_totale)
  r = await modifica(p3.id, { importo_totale: 50 }); j = await r.json()
  ok(r.status === 409 && /già stata pagata/.test(j.error || ''), `pagata: il totale non si cambia (${r.status})`)
  r = await modifica(p3.id, { data: MER, data_fine: GIO }); j = await r.json()
  p = await riga(p3.id)
  ok(r.ok && p.data_fine === GIO && Number(p.importo_totale) === prima && (j.avvisi || []).some(a => /già stata pagata/.test(a)),
    `pagata: le date sì, il totale resta ${prima} con l’avviso (${p.importo_totale})`)
  await admin.from('prenotazioni').update({ stato: 'in_attesa', pagamento_stato: 'non_pagato', pagamento_richiesto_il: null }).eq('id', p3.id)
  r = await modifica(p3.id, { cliente_nome: 'Cambio' })
  ok(r.status === 409, `alla cassa del sito: non si tocca (${r.status})`)
  await admin.from('prenotazioni').update({ stato: 'cancellata', pagamento_stato: 'non_richiesto' }).eq('id', p3.id)
  r = await modifica(p3.id, { cliente_nome: 'Cambio' })
  ok(r.status === 409, `annullata: non si modifica (${r.status})`)

  // ── 5. altra azienda e valori ostili ──
  const p4 = await prenota(LUN, LUN, { cliente_nome: 'Quarto' })
  r = await modifica(p4.id, { cliente_nome: 'Dirottato' }, fb); const corpoB = await r.text()
  const inventato = await modifica('00000000-0000-4000-8000-000000000000', { cliente_nome: 'X' }, fb)
  ok(r.status === 404 && inventato.status === r.status && corpoB === await inventato.text(), `un’altra azienda: ${r.status}, uguale a un id inventato`)
  ok((await riga(p4.id)).cliente_nome === 'Quarto', 'e il nome non è cambiato')
  r = await modifica(p4.id, {}, conToken('nessuno'))
  ok(r.status === 401, `senza login: ${r.status}`)
  for (const [corpo, cosa] of [
    [{ cliente_email: 'non-una-email' }, 'email non valida'],
    [{ cliente_nome: '   ' }, 'nome vuoto'],
    [{ cliente_nome: { $ne: 1 } }, 'nome non testuale'],
    [{ data: '2026-13-45', data_fine: '2026-13-46' }, 'data inventata'],
    [{ data: MAR, data_fine: LUN }, 'riconsegna prima del ritiro'],
    [{ importo_totale: -5 }, 'totale negativo'],
    [{ importo_totale: 'mille' }, 'totale non numerico'],
  ]) {
    r = await modifica(p4.id, corpo)
    ok(r.status === 400, `rifiutato: ${cosa} (${r.status})`)
  }
  r = await modifica(p4.id, { cliente_nome: 'Quarto Bis', azienda_id: B.az, stato: 'completata', pagamento_stato: 'pagato', risorsa_id: '00000000-0000-4000-8000-000000000000' })
  p = await riga(p4.id)
  ok(r.ok && p.cliente_nome === 'Quarto Bis' && p.azienda_id === A.az && p.stato === 'confermata' && p.pagamento_stato !== 'pagato' && p.risorsa_id === R,
    'campi non previsti (azienda, stato, pagamento, risorsa) ignorati')
  r = await modifica(p4.id, { cliente_nome: '<img src=x onerror=alert(1)>' })
  p = await riga(p4.id)
  ok(r.ok && p.cliente_nome === '<img src=x onerror=alert(1)>', 'un nome con marcatura si salva come testo (lo disegna React, che lo escapa)')
  r = await modifica(p4.id, { cliente_nome: 'Quarto', avvisa: true }); j = await r.json()
  ok(r.ok && ['inviata', 'non_partita'].includes(j.email), `«avvisa il cliente» risponde con l’esito dell’email (${j.email})`)

  // ── 6. il percorso dal pannello ──
  if (BROWSER) {
    const { chromium } = await import('playwright')
    const b = await chromium.launch()
    for (const larg of [1280, 390]) {
      const ref = new URL(SUPABASE_URL).hostname.split('.')[0]
      const ctx = await b.newContext({ viewport: { width: larg, height: 900 },
        storageState: { cookies: [], origins: [{ origin: new URL(TEST_URL).origin, localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(A.sessione) }] }] } })
      const pg = await ctx.newPage()
      const errori = []
      pg.on('pageerror', x => errori.push(x.message))
      await pg.goto(`${TEST_URL}/admin/prenotazioni`, { waitUntil: 'domcontentloaded' })
      const bottone = pg.locator(`[data-modifica-di="${p4.id}"]`)
      await bottone.waitFor({ timeout: 90000 })
      await bottone.click()
      const fin = pg.locator('[data-modifica-prenotazione]')
      await fin.waitFor()
      const nuovaFine = larg === 1280 ? MAR : LUN
      await fin.locator('input[type="date"]').nth(1).fill(nuovaFine)
      await pg.getByText('Col listino le date nuove costano', { exact: false }).waitFor({ timeout: 20000 })
      const fuori = await fin.evaluate(el => el.getBoundingClientRect().right > window.innerWidth + 1)
      ok(!fuori, `${larg}px: la finestra sta nello schermo`)
      if (FOTO) await pg.screenshot({ path: `${FOTO}/modifica-${larg}.png` })
      await fin.getByRole('button', { name: /^Salva/ }).click()
      await pg.locator('[data-modifica-fatta]').waitFor({ timeout: 20000 })
      p = await riga(p4.id)
      ok(p.data_fine === nuovaFine, `${larg}px: dal pannello la riconsegna diventa ${nuovaFine} (${p.data_fine})`)
      ok(!errori.length, `${larg}px: nessun errore nella pagina${errori.length ? ': ' + errori[0] : ''}`)
      await ctx.close()
    }
    await b.close()
  }
} catch (e) {
  console.error('  ✗ errore:', e.message); ko++
} finally {
  for (const x of [A, B]) {
    if (!x) continue
    try { await cancellaAziendaDiProva(x.az) } catch (e) { console.error('pulizia', e.message) }
  }
  console.log(ko ? `\n[probe] ${ko} problemi` : '\n[probe] aziende di prova eliminate — tutto verde')
  process.exit(ko ? 1 : 0)
}
