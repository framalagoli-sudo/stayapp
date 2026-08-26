// Un interesse a un'offerta è un contatto, non una prenotazione.
//
// Prima finiva in due posti insieme: una riga in `requests` (che compariva fra
// le prenotazioni) e un contatto nel CRM. Chi lavorava doveva chiudere la stessa
// cosa due volte — e la riga nasceva solo per le strutture, quindi la stessa
// offerta su un ristorante non compariva da nessuna parte.
//
// Uso: TEST_URL=http://localhost:3488 node probe-offerta-nel-crm.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const L = process.env.TEST_URL || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
let az, ent, ko = 0
const ok = (c,t) => { console.log(`  ${c?'✓':'✗'} ${t}`); if(!c) ko++ }
try {
  const { data:a } = await admin.from('aziende').insert({ ragione_sociale:`ZZ-OFF-${Date.now()}`, require_2fa:false }).select().single()
  az = a.id
  const { data:e } = await admin.from('entita').insert({
    azienda_id: az, tipo: 'struttura', slug: `zz-off-${Date.now()}`, name: 'ZZ Offerta', active: true,
  }).select().single()
  ent = e.id

  console.log('\nQUALCUNO SI INTERESSA A UN\'OFFERTA\n')
  const email = `zz-off-${Date.now()}@playwright.internal`
  const r = await fetch(`${L}/api/guest/contact`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ entity_tipo:'struttura', entity_id: ent, source:'offerta',
      source_name:'Cena di San Valentino', name:'Mario Rossi', email, message:'Siamo in due' }),
  })
  ok(r.ok, `la richiesta è accettata (HTTP ${r.status})`)

  const { data: contatto } = await admin.from('contatti').select('*').eq('azienda_id', az).maybeSingle()
  ok(!!contatto, 'è nato un contatto nel CRM')
  ok(contatto?.tags?.includes('offerta'), `ha il tag «offerta» (${JSON.stringify(contatto?.tags)})`)
  ok(/Cena di San Valentino/.test(contatto?.note || ''),
     `la nota dice a quale offerta è interessato`)
  ok(/Siamo in due/.test(contatto?.note || ''), 'e conserva il suo messaggio')

  const { count } = await admin.from('requests').select('*', { count:'exact', head:true }).eq('property_id', ent)
  ok(count === 0, `NON è nata anche una prenotazione (${count} righe in requests)`)

  console.log('\n' + '-'.repeat(58))
  console.log(ko ? `${ko} PROBLEMI` : "L'OFFERTA VA NEL CRM, E SOLO LÌ")
} catch (er) { console.error('ERRORE:', er.message); ko++ }
finally {
  if (az) {
    await admin.from('contatti').delete().eq('azienda_id', az)
    if (ent) { await admin.from('requests').delete().eq('property_id', ent); await admin.from('entita').delete().eq('id', ent) }
    const { error } = await admin.from('aziende').delete().eq('id', az)
    if (error) console.error('pulizia:', error.message)
  }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
