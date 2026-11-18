// Il pannello si legge? Ogni voce di menu, col computer in tema chiaro e scuro.
//
// 18/11/2026, inlingua: «quando inserisco la categoria del blog non vedo
// nulla»; Automax aveva segnalato qualcosa di simile. Causa: il foglio globale
// di partenza di Next rendeva il testo predefinito #ededed col sistema in tema
// scuro, e il pannello è disegnato solo chiaro. Bianco su bianco dove una
// pagina non dichiarava il colore. Le sonde non lo vedevano perché il browser
// delle prove è sempre in tema chiaro.
//
// Non legge il codice: apre ogni pagina che il menu offre al titolare, in tutti
// e due i temi, e per ogni testo e ogni campo misura il contrasto col fondo su
// cui sta DAVVERO (risalendo i genitori, sommando le trasparenze). Prima prova
// sé stessa: inietta un testo bianco su bianco e si ferma se non lo trova.
//
// Azienda ZZ, si pulisce da sola. Nessuna email parte.
// Uso: cd tests && node probe-colori-pannello.mjs [cartella-foto] [--solo-scuro]
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const foto = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null
const TEMI = process.argv.includes('--solo-scuro') ? ['dark'] : ['light', 'dark']
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }

// Eseguita nel browser. Sotto 2 un testo non si legge (bianco su bianco è 1).
const MISURA = () => {
  const rgba = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
  const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const sopra = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]))
  // Il fondo vero: dall'elemento in su si raccolgono i fondi, poi si
  // compongono dal più esterno. Una foto o una sfumatura = non misurabile.
  const fondo = el => {
    const strati = []
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null
      const c = rgba(cs.backgroundColor); if (c && c[3] > 0) { strati.push(c); if (c[3] >= 1) break }
    }
    let base = [255, 255, 255]
    for (const s of strati.reverse()) base = sopra(s, base)
    return base
  }
  const contrasto = (fg, bg) => { const c = sopra(fg, bg); const l1 = lum(c), l2 = lum(bg); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
  const descr = el => { const p = []; for (let n = el; n && n !== document.body && p.length < 3; n = n.parentElement) { let s = n.tagName.toLowerCase(); for (const at of n.attributes) if (at.name.startsWith('data-')) { s += `[${at.name}]`; break } p.unshift(s) } return p.join(' > ') }
  const visibile = el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false } return true }
  const male = []
  const prova = (el, colore, testo, cosa) => {
    const fg = rgba(colore), bg = fondo(el); if (!fg || !bg || fg[3] === 0) return
    const k = contrasto(fg, bg)
    if (k < 2) male.push({ k: Math.round(k * 100) / 100, cosa, testo: testo.slice(0, 50), dove: descr(el), colore, fondo: `rgb(${bg.map(Math.round).join(',')})` })
  }
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH'].includes(el.tagName) || el.closest('svg')) continue
    if (!visibile(el)) continue
    const cs = getComputedStyle(el)
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
      if (['checkbox', 'radio', 'range', 'color', 'file', 'hidden', 'submit', 'button'].includes(el.type)) continue
      prova(el, cs.color, el.value || '(campo)', 'testo del campo')
      if (el.placeholder && !el.value) prova(el, getComputedStyle(el, '::placeholder').color, el.placeholder, 'suggerimento del campo')
      continue
    }
    const proprio = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim()
    if (proprio) prova(el, cs.color, proprio, el.disabled ? 'testo (disattivato)' : 'testo')
  }
  // Uno stesso difetto ripetuto in una lista conta una volta.
  const visti = new Set()
  return male.filter(x => { const c = x.dove + x.colore + x.cosa; if (visti.has(c)) return false; visti.add(c); return true })
}

let az = null, utente = null, browser = null, problemi = 0
try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-COLORI-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale', slug: `zz-colori-${t}`, active: true }).select().single(), 'entità')
  await deve(a.from('eventi').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, title: 'ZZ Serata', slug: `zz-colori-${t}`, date_start: new Date(Date.now() + 9 * 864e5).toISOString(), price: 20, prezzo_modo: 'cifra', seats_total: 30, published: true, active: true, notify_owner_on_booking: false, send_guest_confirmation: false }).select().single(), 'evento')
  await deve(a.from('contatti').insert({ azienda_id: az.id, nome: 'ZZ Mario Rossi', email: `zz-colori-${t}@playwright.internal`, pipeline_stage: null }).select().single(), 'contatto')
  await deve(a.from('blog_categories').insert({ azienda_id: az.id, name: 'ZZ Notizie', slug: `zz-notizie-${t}` }).select().single(), 'categoria').catch(() => null)

  const email = `zz-colori-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  browser = await chromium.launch()

  for (const tema of TEMI) {
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1280, height: 900 }, colorScheme: tema,
      storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
    const page = await ctx.newPage()
    await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelectorAll('a[href^="/admin"]').length > 15, null, { timeout: 45000 }).catch(() => {})
    // La sonda prova sé stessa.
    await page.evaluate(() => { const d = document.createElement('p'); d.setAttribute('data-finto', ''); d.style.cssText = 'color:#fff;background:#fff'; d.textContent = 'Testo finto bianco su bianco'; document.body.appendChild(d) })
    if (!(await page.evaluate(MISURA)).some(x => x.dove.includes('data-finto'))) throw new Error('la sonda non vede il testo finto bianco su bianco: la misura è sbagliata')
    const PAGINE = [...new Set([...(await page.evaluate(() => [...document.querySelectorAll('a[href^="/admin"]')].map(x => x.getAttribute('href').split('?')[0]))),
      '/admin/blog/categories', '/admin/blog/new', '/admin/eventi/new', '/admin/newsletter/new'])].filter(h => !/login|logout/.test(h))
    console.log(`\nTEMA ${tema === 'dark' ? 'SCURO' : 'CHIARO'} del computer — ${PAGINE.length} pagine (la sonda vede il testo finto)\n`)
    for (const percorso of PAGINE) {
      await page.goto(BASE + percorso, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(3500)
      const m = await page.evaluate(MISURA)
      const nome = percorso.replace(ent.id, '<entità>')
      if (m.length) { problemi++; console.log(`  ✗ ${nome}`); for (const x of m.slice(0, 6)) console.log(`      ${x.k}:1 ${x.cosa} «${x.testo}» ${x.colore} su ${x.fondo}  ${x.dove}`); if (m.length > 6) console.log(`      … e altri ${m.length - 6}`) }
      else console.log(`  ✓ ${nome}`)
      if (foto && m.length) await page.screenshot({ path: `${foto}/colori-${tema}-${nome.replace(/[^a-z0-9]+/gi, '-')}.png`, fullPage: true })
    }
    await ctx.close()
  }
  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PAGINE CON TESTI CHE NON SI LEGGONO` : 'OGNI PAGINA SI LEGGE, IN TUTTI E DUE I TEMI')
} catch (e) {
  console.error('ERRORE:', e.message.split('\n')[0]); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
