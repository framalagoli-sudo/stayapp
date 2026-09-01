// Cosa vede Facebook quando qualcuno condivide — o ci manda un'inserzione.
//
// ⛔ Nato da un guasto vero: una campagna traffico verso la pagina di un evento
// di Garage 22 mostrava titolo «OltreNova», descrizione «La piattaforma per il
// tuo business di servizi» e il NOSTRO logo. La pagina evento non aveva
// metadata propri, quindi ereditava quelli della piattaforma: il cliente pagava
// per pubblicizzare noi.
//
// ⚠️ Non basta guardare le pagine che ci vengono in mente: si prova ogni tipo di
// indirizzo pubblico, perché il difetto stava proprio in quello a cui nessuno
// aveva pensato. E si chiede col «faccia» di Facebook, non con un browser: chi
// legge i link non esegue JavaScript, quindi vale solo quello che c'è nell'HTML.
//
// Uso: cd tests && node probe-anteprima-social.mjs
//      TEST_LOCALE=http://localhost:3000 node probe-anteprima-social.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const FB = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const meta = (html, prop) =>
  html.match(new RegExp(`<meta property="og:${prop}" content="([^"]*)"`))?.[1] || ''
const titolo = html => html.match(/<title>([^<]*)<\/title>/)?.[1] || ''

// I nostri, che su una pagina di un cliente non devono comparire mai.
const NOSTRI = ['OltreNova', 'La piattaforma per il tuo business di servizi', '/og-image.png']

async function guarda(etichetta, url, nomeAtteso) {
  const r = await fetch(url, { headers: { 'User-Agent': FB } })
  const html = await r.text()
  const t = titolo(html), og = meta(html, 'title'), site = meta(html, 'site_name'), img = meta(html, 'image')
  console.log(`\n${etichetta}\n  ${url}`)
  ok(r.status === 200, `risponde (HTTP ${r.status})`)

  // ⛔ Il controllo che conta: nel nostro nome, nella nostra descrizione o nella
  // nostra immagine non ci si deve inciampare sulla pagina di un cliente.
  const intruso = NOSTRI.find(n => t.includes(n) || og.includes(n) || meta(html, 'description').includes(n) || img.includes(n))
  ok(!intruso, intruso ? `⛔ compare «${intruso}» al posto del cliente` : 'niente di nostro nell\'anteprima')

  ok(!!og, `ha un titolo suo${og ? `: «${og}»` : ''}`)
  ok(site === nomeAtteso, `og:site_name è «${site || 'assente'}»${site === nomeAtteso ? '' : ` (atteso «${nomeAtteso}»)`}`)
  // Senza site_name Facebook scrive il dominio in maiuscolo: su un link
  // oltrenova.com diventa «OLTRENOVA.COM» sopra il contenuto di un altro.
  // ⚠️ Avviso, non errore: se il cliente non ha caricato né copertina né logo
  // non c'è niente da mettere, e non è il codice a doverlo risolvere. Contarlo
  // come guasto farebbe suonare la sonda a ogni giro — e un allarme che suona
  // sempre viene ignorato anche quando ha ragione.
  if (img) ok(true, "ha un'immagine")
  else console.log('  ⓘ nessuna immagine: su Facebook resta un rettangolo grigio.'
    + ' Va caricata una copertina (o almeno un logo) su questa entità.')
  return { img }
}

try {
  const { data: ent } = await admin.from('entita')
    .select('id, name, slug, tipo').eq('active', true).not('slug', 'is', null).limit(30)
  const PREF = { struttura: 's', ristorante: 'r', attivita: 'a' }

  const { data: eventi } = await admin.from('eventi')
    .select('id, title, entity_id').eq('published', true).eq('active', true).limit(3)

  console.log('LA PAGINA DI UN EVENTO — quella che si spinge sui social')
  for (const ev of eventi || []) {
    const suo = (ent || []).find(e => e.id === ev.entity_id)
    const { img } = await guarda(`«${ev.title}»`, `${L}/eventi/${ev.id}`, suo?.name)
    // Non è un errore, ma vale la pena saperlo prima di pagare un'inserzione.
    if (img && /logo/.test(img)) console.log('  ⓘ senza locandina: nell\'anteprima finisce il logo')
  }

  console.log('\n\nI SITI DEI CLIENTI')
  for (const e of (ent || []).filter(x => !/^zz|prova/i.test(x.name)).slice(0, 4)) {
    await guarda(`${e.name} (${e.tipo})`, `${L}/${PREF[e.tipo]}/${e.slug}`, e.name)
  }

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'OGNI PAGINA SI PRESENTA COL NOME DEL SUO CLIENTE')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
}
process.exit(problemi ? 1 : 0)
