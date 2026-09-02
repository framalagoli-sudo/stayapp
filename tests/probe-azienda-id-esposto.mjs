// L'`azienda_id` è nell'HTML di ogni sito: cosa ci si fa?
//
// Domanda di Francesco il 29/08 — «decidi tu per la massima sicurezza». La
// risposta non è stata toglierlo: **serve** al blocco blog, che con
// quell'id chiama l'API pubblica degli articoli. Rimuoverlo avrebbe rotto una
// funzione dei clienti.
//
// La risposta è stata **misurare cosa apre**, e tenere la misura viva: se
// domani qualcuno aggiunge una route che accetta `azienda_id` senza chiedere
// le credenziali, questa sonda lo trova. Un dubbio diventa un controllo.
//
// Uso: node probe-azienda-id-esposto.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const L = process.env.TEST_LOCALE || TEST_URL
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

// Aperte per costruzione: servono ai visitatori e mostrano solo cose pubblicate.
const APERTE_DI_PROPOSITO = [
  ['/api/blog/public?azienda_id=', 'articoli del blog'],
  ['/api/shop/public/{AZ}/prodotti', 'catalogo dello shop'],
]

// Tutto il resto deve chiedere le credenziali, anche conoscendo l'azienda.
const DEVONO_CHIUDERE = [
  ['/api/contatti?azienda_id=', 'contatti del CRM'],
  ['/api/offerte?azienda_id=', 'offerte'],
  ['/api/booking/prenotazioni?azienda_id=', 'prenotazioni'],
  ['/api/eventi?azienda_id=', 'eventi'],
  ['/api/users?azienda_id=', 'utenti'],
  ['/api/aziende?id=', 'dati dell\'azienda'],
  ['/api/shop/ordini?azienda_id=', 'ordini'],
  ['/api/requests?azienda_id=', 'richieste degli ospiti'],
  ['/api/preventivi?azienda_id=', 'preventivi'],
  ['/api/form-builder?azienda_id=', 'moduli e risposte'],
]

try {
  // regola-ok: legge soltanto — prova quali route rispondono a chi non ha diritto, e per farlo servono dati veri. Nessuna scrittura.
  const { data: ent } = await admin.from('entita')
    .select('azienda_id, slug, tipo').eq('active', true).not('azienda_id', 'is', null).limit(1).single()
  const AZ = ent.azienda_id
  const pref = { struttura: 's', ristorante: 'r', attivita: 'a' }[ent.tipo]

  console.log('\nL\'AZIENDA_ID È NELL\'HTML: COSA APRE?\n')

  // Prima si conferma che sia davvero leggibile dal sito: se un giorno
  // sparisse, questa sonda starebbe misurando un'ipotesi.
  const html = await (await fetch(`${L}/${pref}/${ent.slug}`)).text()
  ok(html.includes(AZ), `l'id si legge dall'HTML di ${ent.slug} (è il presupposto)`)

  const chiama = async ([path, cosa]) => {
    const url = L + (path.includes('{AZ}') ? path.replace('{AZ}', AZ) : path + AZ)
    const r = await fetch(url)
    return { stato: r.status, corpo: (await r.text()).slice(0, 200), cosa }
  }

  for (const p of APERTE_DI_PROPOSITO) {
    const r = await chiama(p)
    ok(r.stato === 200, `${r.cosa}: aperto, ed è il suo mestiere (HTTP ${r.stato})`)
  }

  console.log('')
  for (const p of DEVONO_CHIUDERE) {
    const r = await chiama(p)
    // 401/403 vanno bene; un 200 con dati dentro no. Un 404 pure va bene.
    const chiuso = r.stato === 401 || r.stato === 403 || r.stato === 404
    ok(chiuso, `${r.cosa}: chiuso (HTTP ${r.stato})${chiuso ? '' : ` ← ${r.corpo.slice(0, 90)}`}`)
  }

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  CONOSCERE L\'AZIENDA APRE SOLO CIÒ CHE È PUBBLICO')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
process.exit(ko ? 1 : 0)
