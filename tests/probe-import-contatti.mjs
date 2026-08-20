// Prova l'import dal vivo con un file come quelli veri (export Google Contacts),
// su un'azienda effimera: anteprima, conferma, riconoscimento dei già presenti,
// e la regola che conta — nessun contatto importato risulta autorizzato a WhatsApp.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const CSV = `Name,Given Name,Family Name,E-mail 1 - Value,Phone 1 - Value,Notes
Mario Rossi,Mario,Rossi,mario.test@example.it,340 1234567,cliente 2023
Anna Bianchi,Anna,Bianchi,,+39 333 9876543,
"Autofficina ""Verdi, L."" snc",,,verdi.test@example.it,02 998877,fornitore
riga vuota,,,,,
doppione,Mario,Rossi,altra.test@example.it,3401234567,`

let userId = null, aziendaId = null
try {
  const email = `probe-imp-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `TEST-IMPORT-${Date.now()}` }).select().single()
  aziendaId = az.id
  const { data: c } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = c.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'super_admin', full_name: 'Probe import' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const auth = { Authorization: `Bearer ${s.session.access_token}`, 'Content-Type': 'application/json' }
  const chiama = body => fetch(`${TEST_URL}/api/contatti/import`, { method: 'POST', headers: auth, body: JSON.stringify({ azienda_id: aziendaId, csv: CSV, lista: 'clienti-2026', ...body }) }).then(r => r.json())

  const ant = await chiama({})
  console.log('[1] ANTEPRIMA (niente viene scritto)')
  console.log('    nuovi:', ant.nuovi, '| già presenti:', ant.gia_presenti, '| scartati:', ant.scartati)
  console.log('    colonne riconosciute:', (ant.colonne_riconosciute || []).join(', '))
  ;(ant.dettaglio_scartati || []).forEach(x => console.log(`    scartata riga ${x.riga}: ${x.motivo}`))
  const { count: prima } = await admin.from('contatti').select('id', { count: 'exact', head: true }).eq('azienda_id', aziendaId)
  console.log('    contatti nel database dopo l’anteprima:', prima, prima === 0 ? '(corretto: nessuna scrittura)' : '(ERRORE: ha scritto!)')

  const conf = await chiama({ conferma: true })
  console.log('\n[2] CONFERMA →', 'creati:', conf.creati, '| aggiornati:', conf.aggiornati)

  const { data: dentro } = await admin.from('contatti').select('nome, email, telefono, tags, whatsapp_optin, fonte').eq('azienda_id', aziendaId).order('nome')
  console.log('\n[3] COSA È ENTRATO')
  dentro.forEach(x => console.log(`    ${x.nome} | ${x.email || '—'} | ${x.telefono || '—'} | liste: ${(x.tags||[]).join(',')} | whatsapp: ${x.whatsapp_optin}`))

  const autorizzati = dentro.filter(x => x.whatsapp_optin).length
  console.log(`\n[4] autorizzati a WhatsApp: ${autorizzati} su ${dentro.length}`, autorizzati === 0 ? '(corretto: un file non è un consenso)' : '(ERRORE GRAVE)')

  const ri = await chiama({ conferma: true })
  console.log(`\n[5] STESSO FILE UNA SECONDA VOLTA → creati: ${ri.creati}, aggiornati: ${ri.aggiornati}`, ri.creati === 0 ? '(corretto: nessun doppione)' : '(ERRORE: ha duplicato)')
} catch (e) { console.error('ERRORE:', e.message) }
finally {
  if (aziendaId) { await admin.from('contatti').delete().eq('azienda_id', aziendaId); const { error } = await admin.from('aziende').delete().eq('id', aziendaId); if (error) console.error('cleanup azienda:', error.message) }
  if (userId) { const { error } = await admin.auth.admin.deleteUser(userId); if (error) console.error('cleanup utente:', error.message) }
  console.log('\n[probe] azienda e utente effimeri eliminati')
}
