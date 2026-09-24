// La categoria di un'entità (F3): chi la assegna, cosa accende e spegne, cosa
// NON deve mai toccare, e se il menu del titolare cambia davvero.
//
//  · solo il super_admin assegna (404 a un titolare, anche sulla propria entità);
//  · una funzione che il profilo spegnerebbe ma che ha contenuti resta accesa
//    (qui: il menù scritto del ristorante);
//  · le chiavi di `moduli` che non sono funzioni (wifi, reception…) restano;
//  · finché un'entità dell'azienda è senza categoria l'azienda vede tutto;
//    quando tutte ce l'hanno, vede l'unione dei loro profili;
//  · nel browser, il menu del titolare mostra ciò che la categoria prevede;
//  · togliere la categoria riporta l'azienda a vedere tutto; un profilo in uso
//    non si elimina.
//
// Uso: node probe-categorie.mjs   ($env:TEST_URL per il dev locale)
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const marca = Date.now()
let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

let aziendaId = null, browser = null
const utenti = [], entita = []
async function sessione(ruolo, extra = {}) {
  const email = `zz-cat-${ruolo}-${marca}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  utenti.push(data.user.id)
  await admin.from('profiles').upsert({ id: data.user.id, role: ruolo, full_name: 'Cat', ...extra }, { onConflict: 'id' })
  const { data: s, error: sErr } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  if (sErr) throw new Error(`signIn: ${sErr.message}`)
  return s.session
}
const assegna = (token, id, profilo) => fetch(`${BASE}/api/admin/entita/${id}/profilo`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ profilo }),
})
const leggiAzienda = async () => (await admin.from('aziende').select('funzioni').eq('id', aziendaId).single()).data.funzioni

async function menuDelTitolare(sessioneTitolare, percorso) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`, value: JSON.stringify(sessioneTitolare) }] }] } })
  const p = await ctx.newPage()
  await p.goto(BASE + percorso, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('aside.admin-sidebar nav a', { timeout: 30_000 })
  // Si aspetta che il menu dell'entità sia arrivato, non un tempo fisso: sul
  // server di sviluppo la prima pagina compila per secondi.
  await p.waitForSelector('aside.admin-sidebar nav a:has-text("Sito web")', { timeout: 30_000 }).catch(() => {})
  await p.waitForLoadState('networkidle').catch(() => {})
  await p.waitForTimeout(800)
  const voci = await p.$$eval('aside.admin-sidebar nav a', as => as.map(a => a.textContent.trim()))
  await ctx.close()
  return voci
}

try {
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-CAT-${marca}`, require_2fa: false, moduli: { struttura: true, ristorante: true, attivita: true } }).select('id').single()
  aziendaId = az.id
  const { data: rist } = await admin.from('entita').insert({ azienda_id: aziendaId, tipo: 'ristorante', name: 'ZZ cat ristorante', slug: `zz-cat-r-${marca}`,
    menu: [{ id: 'x', category: 'Primi', items: [] }], moduli: { allergens: true, pwa_active: true } }).select('id').single()
  const { data: strut } = await admin.from('entita').insert({ azienda_id: aziendaId, tipo: 'struttura', name: 'ZZ cat struttura', slug: `zz-cat-s-${marca}`,
    moduli: { wifi: true, reception: true, housekeeping: false } }).select('id').single()
  entita.push(rist.id, strut.id)
  // Un prodotto a catalogo: il negozio è USATO, anche se nessuno dei due profili
  // lo prevede. Deve restare nel menu.
  const { error: prodErr } = await admin.from('prodotti').insert({ azienda_id: aziendaId, nome: 'ZZ cat prodotto', prezzo: 1 })
  if (prodErr) throw new Error(`prodotto di prova: ${prodErr.message}`)
  const titolare = await sessione('admin_azienda', { azienda_id: aziendaId })
  const sup = await sessione('super_admin')

  console.log('\nchi può')
  const r0 = await assegna(titolare.access_token, rist.id, 'studio_professionale')
  ok(r0.status === 404, `il titolare assegna una categoria alla sua entità → ${r0.status} (atteso 404)`)

  console.log('\nuna entità su due')
  const r1 = await assegna(sup.access_token, rist.id, 'studio_professionale')
  const e1 = await r1.json()
  ok(r1.status === 200, `assegnata «Studio professionale» al ristorante (${r1.status})`)
  ok(e1.tenute?.some(t => t.funzione === 'Menù'), `il Menù resta acceso perché ha contenuti (tenute: ${JSON.stringify(e1.tenute)})`)
  const { data: rDopo } = await admin.from('entita').select('moduli, profilo, profilo_versione').eq('id', rist.id).single()
  ok(rDopo.moduli.allergens === true && rDopo.moduli.pwa_active === true, 'le impostazioni dell\'app del QR non sono state toccate')
  ok(rDopo.moduli.menu === true && rDopo.moduli.servizi === true && rDopo.moduli.vetrine === false, `interruttori scritti: menu ${rDopo.moduli.menu}, servizi ${rDopo.moduli.servizi}, vetrine ${rDopo.moduli.vetrine}`)
  ok(rDopo.profilo === 'studio_professionale' && rDopo.profilo_versione >= 1, `categoria e versione salvate (${rDopo.profilo} v${rDopo.profilo_versione})`)
  ok((await leggiAzienda()) === null, 'con la struttura ancora senza categoria, l\'azienda vede tutto (funzioni = null)')

  console.log('\ntutte e due')
  const r2 = await assegna(sup.access_token, strut.id, 'struttura_ricettiva')
  ok(r2.status === 200, `assegnata «Struttura ricettiva» alla struttura (${r2.status})`)
  const { data: sDopo } = await admin.from('entita').select('moduli').eq('id', strut.id).single()
  ok(sDopo.moduli.wifi === true && sDopo.moduli.reception === true && sDopo.moduli.housekeeping === false, 'wifi, reception e housekeeping della struttura intatti')
  const f = await leggiAzienda()
  ok(f && f.contatti && f.preventivi && f.richieste && !f.loyalty, `l'azienda vede l'unione dei due profili (${Object.keys(f || {}).sort().join(', ')})`)
  ok(f?.shop === true && (await r2.json()).tenuteAzienda?.some(t => t.funzione === 'Shop'), "il Negozio resta perché l'azienda ha un prodotto, e l'esito lo dice")

  console.log('\nnel browser, come lo vede il titolare')
  browser = await chromium.launch()
  const voci = await menuDelTitolare(titolare, `/admin/ristoranti/${rist.id}/info`)
  const c = (n) => voci.includes(n)
  ok(c('Sito web') && voci.indexOf('Sito web') <= 1, `«Sito web» è in cima (posizione ${voci.indexOf('Sito web') + 1})`)
  ok(c('Contatti') && c('Preventivi') && c('Richieste'), 'ci sono le funzioni dei due profili (Contatti, Preventivi, Richieste)')
  ok(!c('Fedeltà') && !c('Automazioni') && !c('WhatsApp'), 'non ci sono quelle che nessuno dei due prevede e mai usate (Fedeltà, Automazioni, WhatsApp)')
  ok(c('Negozio') && c('Prodotti'), "Negozio e Prodotti ci sono: l'azienda li ha usati")
  ok(c('Menù') && !c('Vetrine') && !c('Funzioni'), 'Menù sì (ha contenuti), Vetrine no, Funzioni no (è nostra)')
  console.log(`    ${voci.length} voci: ${voci.join(' · ')}`)

  console.log('\nindietro e divieti')
  const { data: profilo } = await admin.from('profili_mestiere').select('id').eq('chiave', 'struttura_ricettiva').single()
  const del = await fetch(`${BASE}/api/admin/profili/${profilo.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${sup.access_token}` } })
  ok(del.status === 409, `un profilo in uso non si elimina (${del.status}, atteso 409)`)
  const r3 = await assegna(sup.access_token, strut.id, null)
  ok(r3.status === 200 && (await leggiAzienda()) === null, 'tolta la categoria alla struttura, l\'azienda torna a vedere tutto')
  const r4 = await assegna(sup.access_token, rist.id, 'inventata_da_me')
  ok(r4.status === 404, `una categoria che non esiste → ${r4.status} (atteso 404)`)
  const r5 = await assegna(sup.access_token, rist.id, 'Non Valida!')
  ok(r5.status === 400, `una chiave non conforme → ${r5.status} (atteso 400)`)
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of entita) await admin.from('entita').delete().eq('id', id)
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  if (aziendaId) { await admin.from('domini').delete().eq('azienda_id', aziendaId); await admin.from('aziende').delete().eq('id', aziendaId) }
  console.log('[probe] pulito')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nCATEGORIE A POSTO')
  process.exit(problemi ? 1 : 0)
}
