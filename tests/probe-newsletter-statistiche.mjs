// Sonda: com'è andata una newsletter (migration 143).
//
// In locale (TEST_URL=http://localhost:3000, server di sviluppo avviato con
// RESEND_WEBHOOK_SECRET uguale a SEGRETO_PROVA qui sotto):
//   1. il webhook firmato aggancia gli eventi alla riga giusta, conta la prima
//      volta, chi clicca conta anche come aperta, il link per disiscriversi e un
//      `javascript:` non si salvano; senza firma 401; un id sconosciuto non fa niente;
//   2. il resoconto: numeri giusti, nomi solo a chi può leggere i contatti,
//      404 a un'altra azienda, 401 senza login, nessun dato altrui nel corpo grezzo;
//   3. nel pannello, come il titolare, su computer e telefono.
// Con --vivo, in produzione: un invio VERO a delivered+…@resend.dev (il pozzo di
// Resend) e la riga col suo id; poi aspetta la consegna dal webhook vero.
//
//   $env:TEST_URL='http://localhost:3000'; node probe-newsletter-statistiche.mjs [cartella-foto]
//   node probe-newsletter-statistiche.mjs --vivo

import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes, createHmac } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const VIVO = process.argv.includes('--vivo')
const BASE = (VIVO ? 'https://www.oltrenova.com' : (process.env.TEST_URL || 'http://localhost:3000')).replace(/\/$/, '')
const FOTO = process.argv.slice(2).find(x => !x.startsWith('--')) || null
export const SEGRETO_PROVA = 'whsec_' + Buffer.from('oltrenova-sonda-statistiche-00000').toString('base64')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const aziende = [], utenti = []
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const chiama = (percorso, metodo, corpo, headers = {}) => fetch(BASE + percorso, {
  method: metodo, headers: { 'content-type': 'application/json', ...headers }, body: corpo === undefined ? undefined : (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)),
}).then(async r => { const grezzo = await r.text(); let j = {}; try { j = JSON.parse(grezzo) } catch {} return { stato: r.status, grezzo, j } })

async function azienda(nome) {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  aziende.push(az.id)
  az.ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: `ZZ Locale ${nome}`, slug: `zz-nst-${nome.toLowerCase()}-${t}`, active: true }).select().single(), 'entità')
  return az
}
async function accesso(aziendaId, role = 'admin_azienda', permissions = null) {
  const email = `zz-nst-${utenti.length}-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utenti.push(u.user.id)
  await a.from('profiles').upsert({ id: u.user.id, role, full_name: 'ZZ', azienda_id: aziendaId, ...(permissions ? { permissions } : {}) }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return s.session
}
function firmato(evento) {
  const corpo = JSON.stringify(evento), id = 'msg_' + randomBytes(8).toString('hex'), ts = String(Math.floor(Date.now() / 1000))
  const firma = createHmac('sha256', Buffer.from(SEGRETO_PROVA.replace('whsec_', ''), 'base64')).update(`${id}.${ts}.${corpo}`).digest('base64')
  return chiama('/api/resend-webhook', 'POST', corpo, { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': `v1,${firma}` })
}
const evento = (type, email_id, extra = {}) => ({ type, created_at: new Date().toISOString(), data: { email_id, to: ['x@playwright.internal'], subject: 'ZZ', ...extra } })

let browser = null
try {
  const mia = await azienda('STAT'), altra = await azienda('ACCANTO')
  const sMia = await accesso(mia.id), sAltra = await accesso(altra.id)
  const H = { Authorization: `Bearer ${sMia.access_token}` }

  if (VIVO) {
    console.log('\nINVIO VERO (a delivered+…@resend.dev)\n')
    const [c] = await deve(a.from('contatti').insert({ azienda_id: mia.id, nome: 'ZZ Pozzo', email: `delivered+zzstat-${t}@resend.dev`, iscritto_newsletter: true, pipeline_stage: null, fonte: 'manuale', unsubscribe_token: randomBytes(16).toString('hex') }).select('id'), 'contatto')
    const nl = await deve(a.from('newsletters').insert({ azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id, subject: 'ZZ prova statistiche', template_id: 'semplice', status: 'draft',
      content: { heading: 'Prova', text: 'Prova delle statistiche', cta_text: 'Apri', cta_url: 'https://www.oltrenova.com/' } }).select('id').single(), 'newsletter')
    const invio = await chiama(`/api/newsletter/${nl.id}/send`, 'POST', {}, H)
    ok(invio.stato === 200, `invio accettato (${invio.stato}) ${invio.stato !== 200 ? invio.grezzo.slice(0, 200) : ''}`)
    const [riga] = await deve(a.from('newsletter_destinatari').select('id, contatto_id, resend_id').eq('newsletter_id', nl.id), 'righe')
    ok(riga?.contatto_id === c.id && /^[0-9a-f-]{36}$/.test(riga?.resend_id || ''), `la riga c’è, con l’id di Resend (${riga?.resend_id})`)
    let consegnata = null
    for (let i = 0; i < 24 && !consegnata; i++) {
      await new Promise(r => setTimeout(r, 5000))
      consegnata = (await deve(a.from('newsletter_destinatari').select('consegnata_il').eq('id', riga.id).single(), 'rilettura')).consegnata_il
    }
    ok(!!consegnata, consegnata ? `il webhook vero ha segnato la consegna (${consegnata})` : 'in 2 minuti nessuna consegna: su Resend il webhook non è iscritto a «email.delivered»?')
    const r = await chiama(`/api/newsletter/${nl.id}/statistiche`, 'GET', undefined, H)
    ok(r.stato === 200 && r.j.tracciata && r.j.inviate === 1, `il resoconto risponde: inviate ${r.j.inviate}, consegnate ${r.j.consegnate}`)
  } else {
    console.log('\n1 · IL WEBHOOK\n')
    const persone = await deve(a.from('contatti').insert(['Anna', 'Bruno', 'Carla'].map(n => ({ azienda_id: mia.id, nome: `ZZ ${n}`, email: `zz-nst-${n.toLowerCase()}-${t}@playwright.internal`, iscritto_newsletter: true, pipeline_stage: null, fonte: 'manuale' }))).select('id, nome'), 'contatti')
    const [estraneo] = await deve(a.from('contatti').insert({ azienda_id: altra.id, nome: 'ZZ Estraneo Segreto', email: `zz-nst-estraneo-${t}@playwright.internal`, pipeline_stage: null, fonte: 'manuale' }).select('id'), 'estraneo')
    const nl = await deve(a.from('newsletters').insert({ azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id, subject: 'ZZ resoconto', template_id: 'semplice', status: 'sent', sent_at: new Date().toISOString(), recipients_count: 3, content: { heading: 'x', text: 'y' } }).select('id').single(), 'newsletter')
    const ids = persone.map(() => crypto.randomUUID())
    await deve(a.from('newsletter_destinatari').insert(persone.map((p, k) => ({ newsletter_id: nl.id, azienda_id: mia.id, contatto_id: p.id, resend_id: ids[k] }))), 'righe')
    const [A, B, C] = ids

    const senza = await chiama('/api/resend-webhook', 'POST', evento('email.opened', A))
    ok(senza.stato === 401, `senza firma: ${senza.stato}`)
    for (const id of ids) await firmato(evento('email.delivered', id))
    const r1 = await firmato(evento('email.opened', A)); await firmato(evento('email.opened', A))
    ok(r1.stato === 200, `con firma: ${r1.stato}${r1.stato !== 200 ? ' — il server di sviluppo ha RESEND_WEBHOOK_SECRET = SEGRETO_PROVA?' : ''}`)
    await firmato(evento('email.clicked', B, { click: { link: 'https://example.com/prenota?x=1', ipAddress: '1.2.3.4', userAgent: 'ZZ' } }))
    await firmato(evento('email.clicked', B, { click: { link: 'https://example.com/prenota?x=1' } }))
    await firmato(evento('email.clicked', B, { click: { link: `${BASE}/unsubscribe?token=abc&nl=${nl.id}` } }))
    await firmato(evento('email.clicked', B, { click: { link: 'javascript:alert(1)' } }))
    await firmato(evento('email.bounced', C))
    const ignoto = await firmato(evento('email.opened', crypto.randomUUID()))
    ok(ignoto.stato === 200, `un id che non è una newsletter: 200, nessun effetto`)

    const righe = await deve(a.from('newsletter_destinatari').select('resend_id, consegnata_il, aperta_il, cliccata_il, rimbalzata_il').eq('newsletter_id', nl.id), 'rilettura')
    const di = id => righe.find(r => r.resend_id === id)
    ok(righe.every(r => r.consegnata_il), 'tre consegnate')
    ok(di(A).aperta_il && !di(A).cliccata_il, 'Anna: aperta')
    ok(di(B).aperta_il && di(B).cliccata_il, 'Bruno: ha cliccato, e conta anche come aperta')
    ok(di(C).rimbalzata_il && !di(C).aperta_il, 'Carla: rimbalzata')
    const clic = await deve(a.from('newsletter_clic').select('link').eq('newsletter_id', nl.id), 'clic')
    ok(clic.length === 1 && clic[0].link === 'https://example.com/prenota?x=1', `un link solo salvato, niente disiscrizione né javascript: (${clic.map(c => c.link).join(', ')})`)

    console.log('\n2 · IL RESOCONTO\n')
    const r = await chiama(`/api/newsletter/${nl.id}/statistiche`, 'GET', undefined, H)
    const s = r.j
    ok(r.stato === 200 && s.inviate === 3 && s.consegnate === 3 && s.aperte === 2 && s.cliccate === 1 && s.rimbalzate === 1,
      `numeri: inviate ${s.inviate}, consegnate ${s.consegnate}, aperte ${s.aperte}, cliccate ${s.cliccate}, rimbalzate ${s.rimbalzate}`)
    ok(s.link?.length === 1 && s.link[0].persone === 1, 'per link: 1 persona sul link della prenotazione')
    ok(s.persone?.length === 3 && s.persone.find(p => p.nome === 'ZZ Bruno')?.link?.length === 1, 'con i nomi, e Bruno col suo link')
    ok(!/Estraneo|1\.2\.3\.4|userAgent|ipAddress/.test(r.grezzo), 'nel corpo grezzo niente di altri né indirizzo IP di chi clicca')
    const fuori = await chiama(`/api/newsletter/${nl.id}/statistiche`, 'GET', undefined, { Authorization: `Bearer ${sAltra.access_token}` })
    const inventata = await chiama(`/api/newsletter/${crypto.randomUUID()}/statistiche`, 'GET', undefined, { Authorization: `Bearer ${sAltra.access_token}` })
    ok(fuori.stato === 404 && fuori.grezzo === inventata.grezzo, `un’altra azienda: ${fuori.stato}, la stessa risposta di un id inventato`)
    ok((await chiama(`/api/newsletter/${nl.id}/statistiche`, 'GET')).stato === 401, 'senza login: 401')
    ok((await chiama('/api/newsletter/non-un-id/statistiche', 'GET', undefined, H)).stato === 404, 'id non valido: 404')
    const sStaff = await accesso(mia.id, 'staff', { newsletter: true })
    const st = await chiama(`/api/newsletter/${nl.id}/statistiche`, 'GET', undefined, { Authorization: `Bearer ${sStaff.access_token}` })
    ok(st.stato === 200 && st.j.cliccate === 1 && !st.j.persone && !/ZZ Anna/.test(st.grezzo), `collaboratore senza «Contatti»: i numeri sì, i nomi no (${st.stato})`)
    const sNo = await accesso(mia.id, 'staff', { eventi: true })
    ok((await chiama(`/api/newsletter/${nl.id}/statistiche`, 'GET', undefined, { Authorization: `Bearer ${sNo.access_token}` })).stato === 403, 'collaboratore senza «Newsletter»: 403')

    console.log('\n3 · NEL PANNELLO\n')
    browser = await chromium.launch()
    for (const [larghezza, altezza] of [[1360, 1000], [390, 844]]) {
      const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: larghezza, height: altezza },
        storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sMia) }] }] } })
      const page = await ctx.newPage()
      const errori = []
      page.on('pageerror', e => errori.push(e.message))
      await page.goto(`${BASE}/admin/newsletter/${nl.id}`, { waitUntil: 'networkidle' })
      const box = page.locator('[data-statistiche]')
      await box.getByText('Cosa hanno premuto').waitFor({ timeout: 60000 }).catch(() => {})
      const testo = (await box.innerText().catch(() => '')).replace(/\s+/g, ' ')
      ok(/Hanno cliccato/.test(testo) && /example\.com\/prenota/.test(testo) && /ZZ Bruno/.test(testo), `[${larghezza}px] il resoconto c’è, coi numeri, il link e le persone`)
      await page.locator('[data-filtro="cliccato"]').click()
      const dopo = (await box.innerText()).replace(/\s+/g, ' ')
      ok(/ZZ Bruno/.test(dopo) && !/ZZ Anna/.test(dopo), `[${larghezza}px] «Hanno cliccato» mostra solo Bruno`)
      const largo = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      ok(largo <= 1, `[${larghezza}px] la pagina non esce dallo schermo (${largo}px)`)
      if (FOTO) await box.screenshot({ path: `${FOTO}/newsletter-statistiche-${larghezza}.png` })
      ok(errori.length === 0, `[${larghezza}px] nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
      await ctx.close()
    }
    void estraneo
  }

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'APERTURE E CLIC ARRIVANO ALLA NEWSLETTER GIUSTA, E LI LEGGE SOLO CHI DEVE')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of utenti) { try { await a.auth.admin.deleteUser(id) } catch {} }
  for (const id of aziende) { try { await cancellaAziendaDiProva(id) } catch (e) { console.error('pulizia:', e.message) } }
}
process.exit(problemi ? 1 : 0)
