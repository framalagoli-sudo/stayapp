// Il backup salva davvero TUTTO quello che i clienti si arrabbierebbero a perdere?
//
// Il 24/08/2026 la risposta era no: girava ogni notte e lasciava fuori 1404
// righe su 2908 — comprese le `pagine`, cioè il **contenuto dei siti**, e i
// `domini`. Nessuno se n'era accorto perché un backup incompleto ha lo stesso
// aspetto di uno completo: il file c'è, pesa, sembra a posto.
//
// La lista delle tabelle da salvare si aggiorna a mano, quindi resta indietro a
// ogni modulo nuovo. Questa sonda confronta ciò che il prodotto usa con ciò che
// il backup porta via, e segnala la differenza.
//
// Uso: node probe-backup-copertura.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'

config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })

// Le tabelle salvate si leggono dal codice, non si riscrivono qui: altrimenti
// le due liste divergono e la sonda mente.
const sorgente = readFileSync('../client-next/lib/backup.js', 'utf8')
const blocco = sorgente.match(/const TABLES = \[([\s\S]*?)\]/)
const salvate = new Set([...(blocco?.[1] || '').matchAll(/'([a-z_]+)'/g)].map(m => m[1]))

// Tutte le tabelle che il prodotto usa. Da tenere aggiornata quando se ne
// aggiunge una — ed è proprio il punto: se ci si dimentica qui, la sonda non
// può accorgersene. Per questo elenca anche cosa NON riconosce.
const DEL_PRODOTTO = [
  'aziende', 'profiles', 'properties', 'ristoranti', 'attivita', 'collegamenti',
  'pagine', 'site_snapshots', 'landing_seo', 'domini',
  'contatti', 'requests', 'messages', 'demo_requests',
  'eventi', 'event_bookings', 'risorse', 'risorse_promozioni', 'prenotazioni',
  'articoli', 'blog_categories', 'newsletters',
  'vetrine', 'vetrina_elementi', 'form_builder', 'form_submissions',
  'preventivi', 'recensioni', 'prodotti', 'ordini',
  'gift_cards', 'loyalty_programs', 'loyalty_points',
  'survey_risposte', 'automazioni', 'automazioni_log',
  'piano_editoriale', 'pe_campagne', 'pe_commenti', 'hashtag_sets', 'blog_automazioni',
  'whatsapp_account', 'whatsapp_template', 'whatsapp_campagna', 'whatsapp_messaggio',
  'entity_translations', 'webhooks', 'platform_config', 'audit_log', 'page_views',
]
// Effimere: non ha senso salvarle.
const ESCLUSE = new Set(['rate_limits', 'cron_battiti'])

console.log(`\nTabelle nella lista del backup: ${salvate.size}\n`)

let scoperte = 0, righeScoperte = 0, vuoteScoperte = 0
for (const t of DEL_PRODOTTO) {
  if (ESCLUSE.has(t)) continue
  const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true })
  if (error) continue // tabella inesistente: non è un problema di copertura
  if (salvate.has(t)) continue
  scoperte++
  if (count > 0) { righeScoperte += count; console.log(`  ⛔ ${t.padEnd(24)} ${String(count).padStart(5)} righe — NON nel backup`) }
  else { vuoteScoperte++; console.log(`  ·  ${t.padEnd(24)} ${'vuota'.padStart(5)} — non nel backup (nessun dato, per ora)`) }
}

console.log('\n' + '═'.repeat(60))
if (righeScoperte > 0) {
  console.log(`⛔ ${righeScoperte} righe di dati veri NON finiscono nel backup.`)
  console.log('   Aggiungere le tabelle a TABLES in client-next/lib/backup.js')
} else if (vuoteScoperte > 0) {
  console.log(`Nessun dato a rischio. ${vuoteScoperte} tabelle scoperte ma vuote: da aggiungere prima che qualcuno le usi.`)
} else {
  console.log('✓ Tutto ciò che il prodotto usa finisce nel backup.')
}
process.exit(righeScoperte > 0 ? 1 : 0)
