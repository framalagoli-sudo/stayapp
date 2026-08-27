// Affittare a giornate: case, auto, camere.
//
// Il booking sapeva fare slot orari e coperti, non «da martedì a sabato» — che è
// il modo in cui prenota chiunque affitti qualcosa. Le domande a cui si risponde
// provando, non leggendo:
//   1. il totale è giusto? (l'ultimo giorno è l'uscita, non una notte)
//   2. due clienti possono prendersi la stessa casa nello stesso periodo?
//   3. le regole (minimo notti, chiusure) reggono a una richiesta costruita a mano?
//
// Uso: node probe-booking-giornaliero.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL='https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
let ko = 0
const ok = (c,t) => { console.log(`  ${c?'✓':'✗'} ${t}`); if(!c) ko++ }
const g = n => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10) }

let az=null, ent=null, ris=null, u=null
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale:`ZZ-GG-${Date.now()}`, require_2fa:false }).select().single(); az=a.id
  const { data: e } = await admin.from('entita').insert({ azienda_id:az, tipo:'attivita', slug:`zz-gg-${Date.now()}`, name:'ZZ Noleggio', active:true }).select().single(); ent=e.id
  const email=`probe-gg-${Date.now()}@playwright.internal`, password=randomBytes(24).toString('base64url')
  const { data:us } = await admin.auth.admin.createUser({ email, password, email_confirm:true }); u=us.user.id
  await admin.from('profiles').upsert({ id:u, role:'admin_azienda', azienda_id:az, full_name:'P' }, { onConflict:'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{persistSession:false} })
  const { data:s } = await anon.auth.signInWithPassword({ email, password })

  const creata = await fetch(`${TEST_URL}/api/booking/risorse`, { method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.session.access_token}`},
    body: JSON.stringify({ nome:'ZZ Casa al mare', modalita:'giornaliero', entity_tipo:'attivita', entity_id:ent,
      quantita:1, prezzo:100, attiva:true, conferma_auto:true,
      disponibilita:{ minimo_notti:2 }, blocchi:[{ data_inizio:g(40), data_fine:g(45) }] }) })
  console.log('\nAFFITTARE A GIORNATE\n')
  ok(creata.status===201, `risorsa a giornate creata (HTTP ${creata.status})`)
  if (!creata.ok) throw new Error((await creata.text()).slice(0,150))
  ris = (await creata.json()).id

  const disp = async (d,f) => (await fetch(`${TEST_URL}/api/booking/public/disponibilita/${ris}?data=${d}${f?`&data_fine=${f}`:''}`)).json()
  const prenota = (d,f,nome='ZZ Cliente') => fetch(`${TEST_URL}/api/booking/public/prenota`, { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ risorsa_id:ris, data:d, data_fine:f, cliente_nome:nome, cliente_email:`zz${Date.now()}@example.com`, n_persone:2 }) })

  const q = await disp(g(10), g(14))
  ok(q.notti === 4, `dal ${g(10)} al ${g(14)} sono 4 notti (dice ${q.notti})`)
  ok(q.totale === 400, `totale 400 € a 100 €/notte (dice ${q.totale})`)
  ok(q.disponibile === true, 'il periodo risulta libero')

  const corta = await disp(g(10), g(11))
  ok(corta.disponibile === false && /minimo/i.test(corta.motivo||''), `una notte sola viene rifiutata: «${corta.motivo}»`)

  const chiusa = await disp(g(41), g(44))
  ok(chiusa.disponibile === false && /chiusi/i.test(chiusa.motivo||''), `nel periodo di chiusura: «${chiusa.motivo}»`)

  console.log('\n  la stessa casa, due clienti:\n')
  const primo = await prenota(g(10), g(14), 'ZZ Primo')
  ok(primo.status === 201, `il primo prenota (HTTP ${primo.status})`)
  const secondo = await prenota(g(12), g(16), 'ZZ Secondo')
  ok(secondo.status === 409, `il secondo, che si accavalla, viene respinto (HTTP ${secondo.status})`)
  const dopo = await prenota(g(14), g(17), 'ZZ Terzo')
  ok(dopo.status === 201, `chi arriva il giorno dell'uscita entra (HTTP ${dopo.status})`)

  const { data: righe } = await admin.from('prenotazioni').select('data, data_fine, importo_totale, n_persone').eq('risorsa_id', ris).order('data')
  ok(righe.length === 2, `in archivio ci sono 2 prenotazioni (${righe.length})`)
  ok(righe[0]?.importo_totale === 400, `il totale salvato è 400 e non dipende dalle persone (${righe[0]?.importo_totale})`)
  ok(righe.every(r => r.data_fine), 'ognuna ha la sua data di fine')

  const senzaFine = await prenota(g(20), null)
  ok(senzaFine.status === 400, `senza data di fine non si prenota (HTTP ${senzaFine.status})`)

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  LE GIORNATE SI CONTANO GIUSTE E NON SI AFFITTA DUE VOLTE')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
finally {
  if (ris) { await admin.from('prenotazioni').delete().eq('risorsa_id', ris); await admin.from('risorse').delete().eq('id', ris) }
  if (u) await admin.auth.admin.deleteUser(u)
  if (ent) await admin.from('entita').delete().eq('id', ent)
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(ko?1:0)
}
