// Quali colonne escono da una route pubblica, davvero.
//
// Un `select('*')` su una route senza login non è un buco oggi: lo diventa il
// giorno in cui qualcuno aggiunge una colonna a quella tabella, perché viene
// pubblicata da sola e in silenzio. È già successo col catalogo dello shop
// (chiuso il 23/08) e con la password del WiFi (chiusa il 25/08).
//
// Questa sonda non legge il codice: chiama le route pubbliche con dati veri e
// stampa le chiavi che tornano, confrontandole con quelle attese. Una chiave
// nuova e non dichiarata è una segnalazione.
//
// Uso: node probe-colonne-pubbliche.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
let problemi = 0

// Colonne che possono uscire senza login. Tutto ciò che non è qui dentro va
// guardato: o è innocuo e si aggiunge, o non deve uscire.
const AMMESSE = {
  'landing-seo': ['id','meta','llms_txt','updated_at','created_at','faq','schema_extra','ai_bots_allowed','jsonld'],
  'pagina':      ['id','slug','titolo','title','blocks','status','seo','entity_tipo','entity_id',
                  'header_cfg','footer_cfg','lang','updated_at','created_at','azienda_id','og_image',
                  'seo_title','seo_description','nome','published_at','tema','traduzioni',
                  'parent_id','nel_menu','ordine','og_image_url','hide_header','hide_footer'],
  'evento':      ['id','titolo','descrizione','data_inizio','data_fine','luogo','prezzo','posti',
                  'posti_totali','posti_disponibili','cover_url','slug','entity_tipo','entity_id',
                  'azienda_id','active','published','created_at','updated_at','max_partecipanti',
                  'title','description','date_start','date_end','location','price','seats_total',
                  'seats_booked','packages'],
}
const SEGRETE = /password|secret|token|api_key|chiave|private|_key$/i

async function esamina(nome, url) {
  const r = await fetch(url)
  if (!r.ok) { console.log(`  · ${nome}: HTTP ${r.status} — non verificabile ora`); return }
  const j = await r.json().catch(() => null)
  if (!j) { console.log(`  · ${nome}: risposta non JSON`); return }
  const oggetto = Array.isArray(j) ? (j[0] || {}) : (j.pagina || j.evento || j)
  const chiavi = Object.keys(oggetto)
  const attese = AMMESSE[nome] || []
  const nuove = chiavi.filter(k => !attese.includes(k))
  const segrete = chiavi.filter(k => SEGRETE.test(k))
  if (segrete.length) { console.log(`  ✗ ${nome}: ESCE UN CAMPO SEGRETO → ${segrete.join(', ')}`); problemi++ }
  else if (nuove.length) { console.log(`  ⚠ ${nome}: colonne non dichiarate → ${nuove.join(', ')}`); problemi++ }
  else console.log(`  ✓ ${nome}: ${chiavi.length} colonne, tutte previste`)
}

console.log('\nCOSA ESCE DALLE ROUTE PUBBLICHE (nessun login)\n')
await esamina('landing-seo', `${BASE}/api/landing-seo`)

const { data: pag } = await a.from('pagine').select('entity_tipo, entity_id, slug').eq('status','pubblicata').limit(1).maybeSingle()
if (pag) await esamina('pagina', `${BASE}/api/guest/pagina/${pag.entity_tipo}/${pag.entity_id}/${pag.slug}`)
else console.log('  · pagina: nessuna pagina pubblicata da provare')

const { data: ev } = await a.from('eventi').select('id').limit(1).maybeSingle()
if (ev) await esamina('evento', `${BASE}/api/guest/eventi/${ev.id}`)
else console.log('  · evento: nessun evento da provare')

console.log('\n' + '─'.repeat(58))
console.log(problemi ? `${problemi} DA GUARDARE` : 'nessuna colonna inattesa esce senza login')
process.exit(problemi ? 1 : 0)
