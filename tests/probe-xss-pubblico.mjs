// Sonda: nessun contenuto scritto da un'azienda diventa codice eseguibile nella
// pagina pubblica di un visitatore (XSS stored).
//
// Nata dal secondo giro dell'agente che prova a entrare (17/10/2026). La classe
// è «codice ostile nell'HTML altrui»: un'azienda mette un payload in un campo di
// un blocco, in un URL o nel corpo di un articolo, e quel codice gira nel browser
// di chi apre il sito. La lettura del codice dice che le difese ci sono
// (`testo-ricco` escapa tutto, `safeUrl`/`siteHref` filtrano gli URL, il blocco
// «Codice incorporato» è in un iframe SENZA `allow-same-origin`, il blog passa da
// `sanitize-html`): questa sonda lo PROVA dal vivo, col caso ostile.
//
// ⚠️ NON si cerca un payload nel corpo grezzo con un grep: i dati di ogni blocco
// viaggiano ANCHE nel pacchetto serializzato per il browser (JSON), e un testo
// reso da React compare escapato (`&lt;script&gt;…`). In tutti e due i casi è
// inerte, ma `alert('…')` e `onerror=` ci stanno come testo e un grep ingenuo
// grida al lupo (è successo alla prima stesura, 17/10). Si misura invece cosa fa
// il browser e cosa c'è nel DOM renderizzato, non nel sorgente.
//
// Tre prove, in ordine di forza:
//   1. IL BROWSER VERO: si aprono le pagine e si ascolta se scatta un `alert`
//      (un dialogo) o un errore di pagina. Ogni payload, se eseguisse, chiama
//      `alert` e scrive un marcatore globale (window.__xss): se il browser resta
//      pulito e il marcatore non c'è, niente è stato eseguito — anche un
//      `</script>` che provasse a rompere la serializzazione.
//   2. IL DOM RENDERIZZATO: nessun `<a href>` né `<iframe src>` comincia con
//      `javascript:` o `data:` (gli URL dei blocchi passano da safeUrl/siteHref,
//      il video solo dall'ID). Il blocco «Codice incorporato» PUÒ eseguire il suo
//      script (è il suo scopo), ma deve restare murato: lo si mette a tentare di
//      toccare la pagina madre e deve fallire (sandbox senza allow-same-origin).
//   3. LA FUNZIONE DEL BLOG col caso ostile: `contenutoArticoloPulito` toglie
//      `<script>`, `onerror`, `href="javascript:"`, `<iframe>`, lo style che
//      coprirebbe la pagina — e tiene il contenuto buono. (L'articolo di un
//      cliente è raggiungibile solo sul suo dominio, non su oltrenova.com/blog:
//      la funzione è lo stesso codice che il server esegue al render.)
//
// A mano. Uso: cd tests && node probe-xss-pubblico.mjs [cartella-foto]
//      $env:TEST_URL='http://localhost:3000' per il locale.
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv.slice(2).find(x => !x.startsWith('--')) || null
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let az = null, browser = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)

// I payload: ognuno, se eseguito, scrive window.__xss e chiama alert (un dialogo).
const S = (m) => `<script>window.__xss='${m}';alert('${m}')</script>`
const IMG = (m) => `<img src=x onerror="window.__xss='${m}';alert('${m}')">`

try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-XSS-${t}`, require_2fa: false, moduli: { attivita: true } }).select().single(), 'azienda')
  const slug = `zz-xss-${t}`
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', name: 'ZZ XSS', slug, active: true, minisito: { active: true } }).select().single(), 'entità')

  // HOME: i blocchi che NON devono MAI eseguire nulla — testo, titolo, CTA, video.
  await deve(a.from('pagine').insert({ entity_tipo: 'attivita', entity_id: ent.id, slug: '__home__', titolo: 'Home', status: 'pubblicata', blocks: [
    { id: 'b-txt', type: 'about', data: {
      title: `ZZ Benvenuti ${S('XSS-TITLE')}`,
      text: `ZZ Testo normale, con dentro ${S('XSS-TEXT')} e ${IMG('XSS-IMG')} e un <b onclick="alert('XSS-ON')">grassetto</b>.`,
    } },
    { id: 'b-cta', type: 'cta_banner', data: { title: 'ZZ Vieni a trovarci', subtitle: 'ZZ Sottotitolo.', button_text: 'ZZ Prenota', button_url: "javascript:window.__xss='XSS-CTA';alert('XSS-CTA')" } },
    { id: 'b-hero', type: 'hero', data: { title: 'ZZ Hero', subtitle: 'ZZ', cta1_text: 'ZZ Scopri', cta1_url: "javascript:alert('XSS-HERO')" } },
    { id: 'b-vid', type: 'video', data: { titolo: 'ZZ Video', url: "javascript:alert('XSS-VIDEO')" } },
  ] }).select('id').single(), 'home')

  // Il blocco «Codice incorporato»: PUÒ eseguire, ma deve restare murato. Il suo
  // script tenta di toccare la pagina madre; se il sandbox è giusto, fallisce.
  await deve(a.from('pagine').insert({ entity_tipo: 'attivita', entity_id: ent.id, slug: 'zz-embed', titolo: 'ZZ Embed', status: 'pubblicata', blocks: [
    { id: 'b-emb', type: 'embed', data: { height: 200, html: `<p>widget</p><script>try{top.__pwned='YES';top.document.title='PWNED';top.localStorage.setItem('x','1')}catch(e){document.body.innerHTML='murato'}</script>` } },
  ] }).select('id').single(), 'pagina embed')

  const home = `${BASE}/a/${slug}`

  // ── 1. IL BROWSER VERO + 2. IL DOM RENDERIZZATO ──────────────────────────────
  browser = await chromium.launch()
  const apri = async (url) => {
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    const dialoghi = [], errori = []
    page.on('dialog', d => { dialoghi.push(d.message()); d.dismiss().catch(() => {}) })
    page.on('pageerror', e => errori.push(e.message))
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => errori.push('goto: ' + e.message))
    await page.waitForTimeout(1500)
    return { ctx, page, dialoghi, errori }
  }

  console.log(`\nCOL BROWSER — home\n`)
  {
    const { ctx, page, dialoghi, errori } = await apri(home)
    const xss = await page.evaluate(() => window.__xss || null)
    esito(dialoghi.length === 0, 'nessun alert è scattato', dialoghi.join(' | '))
    esito(xss === null, 'nessun payload ha eseguito (window.__xss non c’è)', String(xss))
    esito(errori.length === 0, 'nessun errore di pagina', errori.join(' | '))
    // Il DOM renderizzato: nessun link né iframe punta a javascript:/data:.
    const urlPericolosi = await page.evaluate(() => {
      const bad = []
      for (const a of document.querySelectorAll('a[href]')) if (/^\s*(javascript|data):/i.test(a.getAttribute('href') || '')) bad.push('a ' + a.getAttribute('href'))
      for (const f of document.querySelectorAll('iframe[src]')) if (/^\s*(javascript|data):/i.test(f.getAttribute('src') || '')) bad.push('iframe ' + f.getAttribute('src'))
      return bad
    })
    esito(urlPericolosi.length === 0, 'nessun <a>/<iframe> renderizzato punta a javascript:/data:', urlPericolosi.join(' | '))
    const hrefCta = await page.locator('a:has-text("ZZ Prenota")').first().getAttribute('href').catch(() => null)
    esito(hrefCta === '#' || hrefCta === null, 'il pulsante CTA con url javascript: è neutralizzato a «#»', String(hrefCta))
    esito(await page.locator('iframe').count() === 0, 'il video con url ostile non ha prodotto nessun iframe')
    // Clic sui pulsanti CTA/hero: un href javascript: non deve eseguire.
    for (const sel of ['a:has-text("ZZ Prenota")', 'a:has-text("ZZ Scopri")']) {
      await page.locator(sel).first().click({ timeout: 3000 }).catch(() => {})
    }
    await page.waitForTimeout(400)
    esito(dialoghi.length === 0 && await page.evaluate(() => window.__xss || null) === null, 'cliccando i pulsanti ostili non esegue nulla')
    if (FOTO) await page.screenshot({ path: `${FOTO}/xss-home.png` }).catch(() => {})
    await ctx.close()
  }

  console.log(`\nLA FUNZIONE DEL BLOG, COL CASO OSTILE\n`)
  {
    const { contenutoArticoloPulito } = await import('../client-next/lib/articolo-pubblico.js')
    const sporco = `<p>ZZ Corpo dell'articolo ${S('XSS-BLOG')}</p>${IMG('XSS-BLOG-IMG')}`
      + `<a href="javascript:alert('XSS-A')">link</a>`
      + `<iframe src="https://evil.example/x"></iframe>`
      + `<p style="position:fixed;top:0;left:0;width:9999px;height:9999px;background:red">copri</p>`
      + `<a href="https://buono.example" onmouseover="alert(1)">ZZ link buono</a>`
      + `<p style="color:#123456">ZZ colore buono</p>`
    const pulito = contenutoArticoloPulito(sporco)
    esito(!/<script/i.test(pulito), 'lo <script> nel corpo è tolto', pulito.match(/<script[^>]*>/i)?.[0])
    esito(!/onerror\s*=/i.test(pulito) && !/onmouseover\s*=/i.test(pulito), 'nessun gestore di eventi (onerror, onmouseover) sopravvive')
    esito(!/href\s*=\s*["']?\s*javascript:/i.test(pulito), 'il link javascript: resta senza href pericoloso')
    esito(!/<iframe/i.test(pulito), 'nessun <iframe> (non è fra i tag ammessi)')
    esito(!/position\s*:\s*fixed/i.test(pulito), 'lo style «position:fixed» che coprirebbe la pagina è tolto')
    esito(pulito.includes('ZZ Corpo dell') && pulito.includes('ZZ link buono') && pulito.includes('color:#123456'), 'il contenuto buono (link vero, colore valido) resta')
  }

  console.log(`\nCOL BROWSER — «Codice incorporato» (deve restare murato)\n`)
  {
    const { ctx, page, errori } = await apri(`${BASE}/a/${slug}/p/zz-embed`)
    const frame = page.locator('iframe[sandbox]')
    const sandbox = await frame.getAttribute('sandbox').catch(() => null)
    esito(sandbox !== null && /allow-scripts/.test(sandbox), 'l’embed è in un iframe con sandbox', String(sandbox))
    esito(sandbox !== null && !/allow-same-origin/.test(sandbox), 'il sandbox NON ha allow-same-origin: lo script è isolato dalla nostra origine', String(sandbox))
    const pwned = await page.evaluate(() => ({ p: window.__pwned || null, titolo: document.title }))
    esito(pwned.p === null, 'lo script dell’embed non ha scritto nella pagina madre (top.__pwned assente)', String(pwned.p))
    esito(pwned.titolo !== 'PWNED', 'non ha cambiato il titolo della pagina madre', pwned.titolo)
    const letto = await page.evaluate(() => { try { return localStorage.getItem('x') } catch { return null } })
    esito(letto === null, 'non ha scritto nel localStorage della nostra origine')
    esito(errori.length === 0, 'nessun errore di pagina', errori.join(' | '))
    if (FOTO) await page.screenshot({ path: `${FOTO}/xss-embed.png` }).catch(() => {})
    await ctx.close()
  }
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
