// Le offerte di un cliente restano sue.
//
// È la voce di menu da cui si creano le cose che i clienti prenotano: prima
// esisteva la tabella e nessun modo di riempirla. Le domande sono le solite tre,
// a cui si risponde provando e non leggendo il codice:
//   1. un'altra azienda vede, modifica o cancella un'offerta che non è sua?
//   2. si può agganciare la propria offerta al sito di un altro cliente?
//   3. il pannello può scrivere le colonne che decide il sistema?
//
// La terza non è teorica: `posti_occupati` conta i posti già venduti, e chi
// riuscisse ad azzerarlo rivenderebbe posti che qualcuno ha già.
//
// Uso: node probe-offerte.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

async function cliente(etichetta) {
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-OFF-${etichetta}-${Date.now()}`, require_2fa: false }).select().single()
  const { data: ent } = await admin.from('entita').insert({
    azienda_id: az.id, tipo: 'struttura', slug: `zz-off-${etichetta.toLowerCase()}-${Date.now()}`, name: `ZZ ${etichetta}`, active: true,
  }).select().single()
  const email = `probe-off-${etichetta}-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  await admin.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: `Probe ${etichetta}`, azienda_id: az.id }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  return { aziendaId: az.id, entityId: ent.id, userId: u.user.id, token: s.session.access_token }
}

const chiama = (path, token, metodo = 'GET', corpo = null) => fetch(`${TEST_URL}${path}`, {
  method: metodo,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(corpo ? { body: JSON.stringify(corpo) } : {}),
})

let A = null, B = null, offertaA = null
try {
  A = await cliente('A')
  B = await cliente('B')

  console.log('\nLE OFFERTE DI UN CLIENTE RESTANO SUE\n')

  ok((await chiama('/api/offerte', null)).status === 401, 'senza credenziali: nessuna lista')

  const creata = await chiama('/api/offerte', A.token, 'POST', {
    titolo: 'ZZ Cena di prova',
    entity_id: A.entityId, posti_totali: 10, prezzo: 25,
  })
  ok(creata.status === 201, `A crea la sua offerta (HTTP ${creata.status})`)
  offertaA = creata.ok ? (await creata.json()) : null

  const senzaTitolo = await chiama('/api/offerte', A.token, 'POST', { entity_id: A.entityId })
  ok(senzaTitolo.status === 400, `senza titolo non si crea niente (HTTP ${senzaTitolo.status})`)
  // Il «quando» non si chiede: lo dicono le date. Senza date resta aperto.
  ok(offertaA?.modo === 'richiesta', `senza date il quando resta aperto (${offertaA?.modo})`)

  // ⚠️ `entity_id` arriva dal client: senza controllo si pubblica la propria
  // offerta sul sito di un altro cliente, dove compare al pubblico e ne
  // raccoglie le prenotazioni.
  const rubata = await chiama('/api/offerte', A.token, 'POST', {
    titolo: 'ZZ Sul sito di un altro', entity_id: B.entityId,
  })
  ok(rubata.status === 403, `A non può pubblicare sul sito di B (HTTP ${rubata.status})`)

  const listaB = await (await chiama('/api/offerte', B.token)).json()
  ok(Array.isArray(listaB) && !listaB.some(x => x.id === offertaA?.id), 'B non vede l\'offerta di A nella lista')

  if (offertaA) {
    const patch = await chiama(`/api/offerte/${offertaA.id}`, B.token, 'PATCH', { titolo: 'ZZ scippata' })
    ok([403, 404].includes(patch.status), `B non può modificarla (HTTP ${patch.status})`)
    const del = await chiama(`/api/offerte/${offertaA.id}`, B.token, 'DELETE')
    ok([403, 404].includes(del.status), `B non può cancellarla (HTTP ${del.status})`)
    const { data: viva } = await admin.from('offerte').select('id, titolo').eq('id', offertaA.id).maybeSingle()
    ok(!!viva && viva.titolo === 'ZZ Cena di prova', 'ed è ancora lì, col suo titolo')

    // Le colonne che decide il sistema non si scrivono dal pannello.
    await admin.from('offerte').update({ posti_occupati: 4 }).eq('id', offertaA.id)
    await chiama(`/api/offerte/${offertaA.id}`, A.token, 'PATCH', {
      posti_occupati: 0, azienda_id: B.aziendaId, origine: 'evento', titolo: 'ZZ Cena di prova',
    })
    const { data: dopo } = await admin.from('offerte').select('posti_occupati, azienda_id, origine').eq('id', offertaA.id).single()
    ok(dopo.posti_occupati === 4, `i posti già venduti non si azzerano dal pannello (${dopo.posti_occupati})`)
    ok(dopo.azienda_id === A.aziendaId, 'l\'offerta non si sposta a un\'altra azienda')
    // `origine` decide dove l'offerta compare: riscriverla dal pannello vorrebbe
    // dire spostarla in una sezione del sito a cui non appartiene.
    ok(dopo.origine == null, `l'origine non si scrive dal pannello (${dopo.origine})`)

    // Un valore fuori catalogo non entra nel database così com'è.
    await chiama(`/api/offerte/${offertaA.id}`, A.token, 'PATCH', { modo: 'qualsiasi_cosa', impegno: '<script>' })
    const { data: pulita } = await admin.from('offerte').select('modo, impegno').eq('id', offertaA.id).single()
    ok(pulita.modo === 'richiesta' && pulita.impegno === 'chiedi',
       `modo e impegno fuori catalogo tornano al predefinito (${pulita.modo}/${pulita.impegno})`)
  }

  // Il dato deve arrivare fino in fondo: salvarlo e non vederlo è la promessa
  // peggiore che si possa fare a un cliente.
  console.log('\nE ARRIVA FINO AL SITO\n')
  if (offertaA) {
    await chiama(`/api/offerte/${offertaA.id}`, A.token, 'PATCH', { pubblicata: true, attiva: true, descrizione: 'ZZ visibile' })
    const { data: ent } = await admin.from('entita').select('slug').eq('id', A.entityId).single()
    const html = await (await fetch(`${TEST_URL}/s/${ent.slug}?qr=1&tab=esplora`)).text()
    ok(html.includes('ZZ Cena di prova'), 'l\'offerta pubblicata compare nell\'app dell\'ospite')

    await chiama(`/api/offerte/${offertaA.id}`, A.token, 'PATCH', { pubblicata: false })
    const bozza = await (await fetch(`${TEST_URL}/s/${ent.slug}?qr=1&tab=esplora`)).text()
    ok(!bozza.includes('ZZ Cena di prova'), 'e una bozza non si vede')
  }

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  LE OFFERTE RESTANO DI CHI LE HA FATTE, E SI VEDONO DOVE DEVONO')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
finally {
  for (const x of [A, B]) {
    if (!x) continue
    await admin.from('offerte').delete().eq('azienda_id', x.aziendaId)
    await admin.from('entita').delete().eq('id', x.entityId)
    if (x.userId) await admin.auth.admin.deleteUser(x.userId).catch(() => {})
    const { error } = await admin.from('aziende').delete().eq('id', x.aziendaId)
    if (error) console.error('pulizia azienda:', error.message)
  }
  console.log('[probe] aziende e utenti effimeri eliminati')
  process.exit(ko ? 1 : 0)
}
