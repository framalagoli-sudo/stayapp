// La RLS regge se qualcuno bussa direttamente al database?
//
// Le route API usano la chiave di servizio e scavalcano la RLS: la sicurezza
// multi-tenant dipende dai controlli applicativi. Ma la chiave pubblica (`anon`)
// è dentro il bundle di ogni pagina — chiunque la può leggere e interrogare
// Supabase da fuori, saltando le nostre route. Lì l'unica difesa è il database,
// e per questo va misurata invece che data per fatta.
//
// Due domande, non una:
//   1. quali TABELLE può leggere un estraneo
//   2. quali COLONNE gli vengono consegnate delle tabelle che può leggere
// La seconda è quella che il 25/08/2026 ha rivelato la password del WiFi di un
// cliente vero: la RLS filtra le righe, non le colonne, quindi una tabella
// leggibile a ragione consegnava l'intera riga. Chiusa dalla migration 082.
//
// Uso: node probe-rls-secondo-muro.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
// Esattamente ciò che può fare un estraneo: la chiave pubblica, nessuna sessione.
const estraneo = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Tabelle che le pagine pubbliche devono poter leggere.
const PUBBLICHE = new Set(['entita', 'pagine', 'articoli', 'eventi', 'landing_seo', 'blog_categories',
  'vetrine', 'vetrina_elementi', 'collegamenti', 'aziende', 'prodotti', 'risorse',
  'risorse_promozioni', 'platform_config'])

const TABELLE = ['entita', 'profiles', 'aziende', 'contatti', 'requests', 'prenotazioni', 'preventivi',
  'recensioni', 'survey_risposte', 'form_builder', 'form_submissions', 'articoli', 'eventi',
  'event_bookings', 'newsletters', 'automazioni', 'automazioni_log', 'piano_editoriale', 'pe_campagne',
  'loyalty_programs', 'loyalty_points', 'gift_cards', 'prodotti', 'ordini', 'pagine', 'vetrine',
  'vetrina_elementi', 'domini', 'whatsapp_account', 'whatsapp_campagna', 'whatsapp_messaggio',
  'messages', 'page_views', 'demo_requests', 'site_snapshots', 'landing_seo', 'audit_log',
  'rate_limits', 'cron_battiti', 'platform_config', 'risorse', 'collegamenti', 'blog_categories',
  'idee_editoriali', 'hashtag_sets', 'risorse_promozioni', 'blog_automazioni']

// Colonne che non devono uscire dal database senza una sessione, mai.
const RISERVATE = ['wifi_password', 'wifi_name', 'privacy_data']

let problemi = 0
let chiuse = 0
const perdite = []

console.log('\nUN ESTRANEO CON LA CHIAVE PUBBLICA COSA RIESCE A LEGGERE?\n')

for (const t of TABELLE) {
  const { data, error } = await estraneo.from(t).select('*').limit(2)
  const { count } = await admin.from(t).select('*', { count: 'exact', head: true })
  if (error) { chiuse++; continue }                      // il database rifiuta: bene
  if (!data || data.length === 0) {
    // Nessuna riga: o la tabella è vuota, o la RLS filtra tutto. Distinguere conta.
    if (count > 0) chiuse++
    continue
  }
  if (PUBBLICHE.has(t)) { console.log(`  ·  ${t}: leggibile — atteso (serve alle pagine pubbliche)`); continue }
  perdite.push({ t, righe: count, chiavi: Object.keys(data[0]).slice(0, 8) })
  problemi++
}

console.log(`\n  ${chiuse} tabelle chiuse a un estraneo`)
if (perdite.length) {
  console.log('\n  TABELLE LEGGIBILI DA CHIUNQUE, E NON DOVREBBERO:')
  for (const p of perdite) console.log(`     ${p.t}  (${p.righe} righe)  colonne: ${p.chiavi.join(', ')}`)
} else {
  console.log('  ✓ nessuna tabella privata è leggibile senza sessione')
}

// ── le colonne, che è la domanda che era sfuggita ─────────────────────────────
console.log('\n  COLONNE RISERVATE — un estraneo può chiederle?')
for (const campo of RISERVATE) {
  const { data, error } = await estraneo.from('entita').select(`slug, ${campo}`).limit(30)
  if (error) { console.log(`     ✓ ${campo.padEnd(14)} rifiutata dal database`); continue }
  const conValore = (data || []).filter(r =>
    r[campo] && String(r[campo]).trim() && JSON.stringify(r[campo]) !== '{}')
  if (conValore.length) {
    console.log(`     ✗ ${campo.padEnd(14)} LEGGIBILE su ${conValore.length} entità (es. ${conValore[0].slug})`)
    problemi++
  } else {
    console.log(`     · ${campo.padEnd(14)} concessa ma vuota su tutte`)
  }
}

console.log('\n' + '-'.repeat(62))
console.log(problemi ? `${problemi} PROBLEMI` : 'IL SECONDO MURO REGGE, COLONNE COMPRESE')
process.exit(problemi ? 1 : 0)
