#!/usr/bin/env node
// check-schema.js — Valida che le colonne usate dal codice esistano nel DB
// Eseguito automaticamente da GitHub Actions ad ogni push su main

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Colonne che il server legge nelle query guest/admin per ogni tabella
const EXPECTED = {
  properties: [
    'id','azienda_id','slug','name','description','address','phone','whatsapp',
    'wifi_name','wifi_password','checkin_time','checkout_time','rules',
    'amenities','logo_url','cover_url','plan','modules','theme','services',
    'gallery','restaurant','activities','excursions','minisito','privacy_data','chatbot',
    'active','updated_at','created_at',
  ],
  ristoranti: [
    'id','azienda_id','slug','name','description','address','phone','email',
    'schedule','logo_url','cover_url','theme','gallery','menu',
    'modules','minisito','privacy_data','chatbot','active','updated_at','created_at',
  ],
  attivita: [
    'id','azienda_id','slug','name','tipo','description','address','phone','email',
    'schedule','logo_url','cover_url','theme','gallery','services',
    'minisito','privacy_data','chatbot','pwa','active','updated_at','created_at',
  ],
  contatti: [
    'id','azienda_id','nome','email','telefono','fonte',
    'iscritto_newsletter','unsubscribe_token','confirmation_token',
    'tags','note','pipeline_stage','created_at','updated_at',
  ],
  piano_editoriale: [
    'id','azienda_id','titolo','testo','immagine_url','canali',
    'data_pianificata','stato','note_interne',
    'tipo_contenuto','ref_id','ref_tipo','design_url',
    'labels','pillar',
    'created_by','created_by_name','updated_by','updated_by_name',
    'richiede_approvazione','campagna_id',
    'created_at','updated_at',
  ],
  pe_campagne: [
    'id','azienda_id','nome','colore','data_inizio','data_fine',
    'descrizione','created_at','updated_at',
  ],
  pe_commenti: [
    'id','post_id','azienda_id','author_id','author_name','testo','created_at',
  ],
  prenotazioni: [
    'id','risorsa_id','nome','email','telefono','data','slot_inizio','slot_fine',
    'coperti','note','stato','cancellation_token',
    'pagamento_stato','pagamento_id',
    'recensione_token','recensione_inviata',
    'created_at','updated_at',
  ],
  profiles: [
    'id','role','full_name','azienda_id','property_id','group_id','permissions',
  ],
}

async function getColumns(table) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', table)
  if (error) throw new Error(`Errore query information_schema per ${table}: ${error.message}`)
  return new Set(data.map(r => r.column_name))
}

async function main() {
  console.log('🔍 Check schema DB...\n')
  let failures = 0

  for (const [table, cols] of Object.entries(EXPECTED)) {
    let existing
    try {
      existing = await getColumns(table)
    } catch (e) {
      console.error(`❌ ${table}: ${e.message}`)
      failures++
      continue
    }

    const missing = cols.filter(c => !existing.has(c))
    if (missing.length) {
      console.error(`❌ ${table}: colonne mancanti → ${missing.join(', ')}`)
      failures++
    } else {
      console.log(`✅ ${table}`)
    }
  }

  console.log('')
  if (failures > 0) {
    console.error(`\n⛔ ${failures} tabella/e con colonne mancanti. Esegui le migration necessarie su Supabase.\n`)
    process.exit(1)
  } else {
    console.log('✅ Schema OK — tutte le colonne attese esistono nel DB.\n')
  }
}

main().catch(e => {
  console.error('Errore fatale:', e.message)
  process.exit(1)
})
