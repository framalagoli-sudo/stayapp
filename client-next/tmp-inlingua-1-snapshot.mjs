// Prima di toccare: la versione di adesso, ripristinabile dal pannello.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('./.env.local', 'utf8')
const v = k => (env.match(new RegExp('^\\uFEFF?' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const db = createClient(v('NEXT_PUBLIC_SUPABASE_URL'), v('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

const ENT = '84368702-c9ea-41eb-8932-28cdbfd77399'
const COLS = ['name', 'settore', 'description', 'address', 'phone', 'email', 'schedule', 'theme', 'logo_url',
  'cover_url', 'gallery', 'services', 'minisito', 'privacy_data', 'chatbot', 'moduli']

const { data: e } = await db.from('entita').select(['azienda_id', ...COLS].join(',')).eq('id', ENT).single()
const entity_data = {}
for (const c of COLS) entity_data[c] = e[c]
const { data: pagine } = await db.from('pagine').select('*').eq('entity_tipo', 'attivita').eq('entity_id', ENT)

const { data, error } = await db.from('site_snapshots').insert({
  entity_tipo: 'attivita', entity_id: ENT, azienda_id: e.azienda_id,
  label: 'Prima del restyling da brief (22/09/2026)', kind: 'manual',
  created_by: 'milo',
  entity_data, pagine_data: pagine || [],
}).select('id, label, created_at').single()

console.log(error ? '✗ ' + error.message : '✓ versione salvata: ' + data.id)
console.log('   pagine dentro:', (pagine || []).length)
