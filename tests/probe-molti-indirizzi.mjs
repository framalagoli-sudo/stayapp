// La piattaforma non vive su un indirizzo solo.
//
// ⛔ Il 17/09/2026 `https://www.garage22terni.it/admin` rispondeva 404, davanti a
// un cliente. Gli smoke provavano — e provano — un hostname solo:
// `www.oltrenova.com`. Ma lo stesso codice risponde anche su dieci sottodomini e
// sui domini dei clienti, dove il middleware riscrive i percorsi sotto l'entità:
// lì una pagina della piattaforma non esiste, e nessuno se ne accorgeva.
//
// Questa sonda non prova il nostro dominio: prende gli indirizzi VIVI dal
// database — quindi un cliente nuovo entra nel giro da solo — e su ognuno
// verifica quello che un visitatore e un motore di ricerca trovano davvero.
//
// Gira in `deploy.ps1` con le sonde di sicurezza. Nessuna scrittura: solo GET.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test', quiet: true })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const STAYAPP = (process.env.STAYAPP_DOMAIN || 'oltrenova.com').trim()
const PANNELLO = `www.${STAYAPP}`

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Mancano SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in tests/.env.test')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const problemi = []
const segnala = (host, cosa) => problemi.push(`${host}: ${cosa}`)

// Segue i rimandi a mano, così si vede DOVE si finisce e non solo con che stato.
async function vai(url, salti = 0) {
  if (salti > 5) return { stato: 'troppi rimandi', url }
  const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'probe-molti-indirizzi' } })
  const dove = r.headers.get('location')
  if (r.status >= 300 && r.status < 400 && dove) {
    return vai(new URL(dove, url).toString(), salti + 1)
  }
  return { stato: r.status, url, corpo: await r.text() }
}

// Il pannello si disegna nel browser: nell'HTML grezzo il modulo di accesso non
// c'è, e cercarlo lì darebbe un allarme a ogni giro. Quello che invece cambia
// davvero quando la pagina non esiste è il titolo.
const titolo = html => (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '').trim()
const paginaMancante = html => /404|could not be found/i.test(titolo(html))

async function controlla(host, pubblicato, hostDellaStessaEntita) {
  // 1. Il sito risponde.
  const home = await vai(`https://${host}/`)
  if (home.stato !== 200) segnala(host, `la home risponde ${home.stato}`)

  // 2. Il pannello: da qui si deve ARRIVARE al pannello, mai a un 404.
  const admin = await vai(`https://${host}/admin`)
  const finisceSulPannello = new URL(admin.url).hostname === PANNELLO
  if (admin.stato !== 200 || !finisceSulPannello) {
    segnala(host, `/admin finisce su ${admin.url} con stato ${admin.stato} (atteso: il pannello su ${PANNELLO})`)
  } else if (paginaMancante(admin.corpo)) {
    segnala(host, '/admin arriva al pannello ma la pagina non esiste')
  }

  // 3. Le altre pagine della piattaforma non devono dare 404 sul sito di un cliente.
  for (const p of ['/termini', '/cancellazione-dati']) {
    const r = await vai(`https://${host}${p}`)
    if (r.stato !== 200 || paginaMancante(r.corpo)) segnala(host, `${p} risponde ${r.stato}${paginaMancante(r.corpo) ? ' e la pagina non esiste' : ''}`)
  }

  // 4. Il ritorno dopo un pagamento resta sul sito del cliente: sul suo dominio
  // se ce l'ha (il sottodominio cede il passo, «un sito, un indirizzo»), mai da noi.
  const checkout = await vai(`https://${host}/checkout/annullato`)
  const dove = new URL(checkout.url).hostname
  if (checkout.stato !== 200 || paginaMancante(checkout.corpo)) {
    segnala(host, `/checkout/annullato risponde ${checkout.stato}: chi ha pagato troverebbe questo`)
  } else if (!hostDellaStessaEntita.has(dove)) {
    segnala(host, `/checkout/annullato porta su ${dove}, che non è un indirizzo di questo cliente`)
  }

  // 5. Quello che leggono i motori di ricerca.
  const robots = await vai(`https://${host}/robots.txt`)
  if (robots.stato !== 200) segnala(host, `robots.txt risponde ${robots.stato}`)
  else if (!/Sitemap:/i.test(robots.corpo)) segnala(host, 'robots.txt non dichiara nessuna sitemap')

  const sitemap = await vai(`https://${host}/sitemap.xml`)
  if (sitemap.stato !== 200) segnala(host, `sitemap.xml risponde ${sitemap.stato}`)
  // Una sitemap vuota è un difetto solo per un sito pubblicato e visibile ai
  // motori: per un sito spento o tenuto fuori dall'indice è la risposta giusta.
  else if (pubblicato && !/<loc>/.test(sitemap.corpo)) {
    segnala(host, 'la sitemap è vuota: nessun indirizzo da indicizzare')
  }
}

const { data: domini, error } = await sb.from('domini')
  .select('dominio, stato, entity_id').eq('stato', 'attivo')
if (error) {
  console.error('Lettura dei domini fallita:', error.message)
  process.exit(1)
}

// Un sito «pubblicato» è quello con il minisito acceso e visibile ai motori:
// solo da lui si pretende una sitemap piena.
const { data: entita } = await sb.from('entita').select('id, indicizzabile, minisito')
const pubblicati = new Map((entita || []).map(e => [e.id, !!e.minisito?.active && e.indicizzabile !== false]))

const host = [...new Map(domini.filter(d => d.dominio).map(d => [d.dominio, d.entity_id])).entries()]
  .sort(([a], [b]) => a.localeCompare(b))

// Tutti gli indirizzi di una stessa entità: il sottodominio e il dominio del
// cliente sono la stessa casa, quindi passare dall'uno all'altro non è «uscire».
const indirizziPerEntita = new Map()
for (const d of domini) {
  if (!d.dominio) continue
  if (!indirizziPerEntita.has(d.entity_id)) indirizziPerEntita.set(d.entity_id, new Set())
  const s = indirizziPerEntita.get(d.entity_id)
  s.add(d.dominio)
  s.add(d.dominio.startsWith('www.') ? d.dominio.slice(4) : `www.${d.dominio}`)
}

console.log('\nLA PIATTAFORMA RISPONDE BENE DA TUTTI I SUOI INDIRIZZI?\n')
console.log(`  ${host.length} indirizzi vivi, letti dal database\n`)

for (const [h, entityId] of host) {
  const prima = problemi.length
  try {
    await controlla(h, pubblicati.get(entityId) === true, indirizziPerEntita.get(entityId) || new Set([h]))
  } catch (e) {
    segnala(h, `non raggiungibile: ${e.message}`)
  }
  console.log(`  ${problemi.length === prima ? '✓' : '✗'}  ${h}`)
}

console.log('\n' + '─'.repeat(62))
if (problemi.length) {
  console.log(`\n${problemi.length} COSE DA GUARDARE\n`)
  for (const p of problemi) console.log('  · ' + p)
  console.log('')
  process.exit(1)
}
console.log('\nda ogni indirizzo: il sito risponde, il pannello si raggiunge,')
console.log('nessuna pagina della piattaforma dà 404, i motori trovano la sitemap\n')
process.exit(0)
