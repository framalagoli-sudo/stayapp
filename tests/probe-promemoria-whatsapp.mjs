// Il promemoria può uscire anche su WhatsApp: la coda si sdoppia, e il consenso
// non si dà per scontato.
//
// ⚠️ Qui NON si prova un invio vero: nessuna azienda ha ancora collegato un
// numero, e con account e template di Meta a zero l'unica cosa che si potrebbe
// misurare è il fallimento. Si prova quello che è nostro e deterministico:
//
//   1. uno step «email e WhatsApp» lascia DUE righe in coda, non una;
//   2. senza numero la riga WhatsApp non nasce nemmeno — meglio niente che una
//      coda destinata a fallire a ogni giro del cron;
//   3. il consenso WhatsApp si salva solo se è stato dato, con la PROVA
//      (quando, da dove); chi non lo spunta non finisce da nessuna parte;
//   4. la spunta non compare finché un avviso su WhatsApp non partirebbe
//      davvero: un consenso che non serve a niente non si chiede.
//
// Uso: cd tests && node probe-promemoria-whatsapp.mjs
//      TEST_LOCALE=http://localhost:3000 node probe-promemoria-whatsapp.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const aziende = [], risorse = [], automazioni = [], contatti = []
const orario = { lun: [{ start: '08:00', end: '20:00' }], mar: [{ start: '08:00', end: '20:00' }], mer: [{ start: '08:00', end: '20:00' }], gio: [{ start: '08:00', end: '20:00' }], ven: [{ start: '08:00', end: '20:00' }], sab: [{ start: '08:00', end: '20:00' }], dom: [{ start: '08:00', end: '20:00' }] }

async function prenota(risorsaId, giorno, ora, extra = {}) {
  const r = await fetch(`${L}/api/booking/public/prenota`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      risorsa_id: risorsaId, data: giorno, ora_inizio: ora,
      cliente_nome: 'ZZ Cliente', n_persone: 1, privacy_accettata: true, ...extra,
    }),
  })
  return { status: r.status, body: await r.json() }
}

try {
  const { data: ent } = await admin.from('entita').select('id, tipo, azienda_id').limit(1).maybeSingle()

  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-WA-${Date.now()}`, require_2fa: false }).select().single()
  aziende.push(az.id)

  const { data: ris, error: errRis } = await admin.from('risorse').insert({
    azienda_id: az.id, entity_tipo: ent.tipo, entity_id: ent.id,
    nome: 'ZZ Sala prove', modalita: 'slot', durata_minuti: 60, quantita: 1,
    prezzo: 0, attiva: true, visibile_minisito: true, disponibilita: orario,
  }).select().single()
  if (errRis) throw new Error(`risorsa non creata: ${errRis.message}`)
  risorse.push(ris.id)

  // Lo step esce su tutt'e due i canali.
  const { data: auto, error: errAuto } = await admin.from('automazioni').insert({
    azienda_id: az.id, entity_tipo: ent.tipo, entity_id: ent.id,
    nome: 'ZZ Promemoria due canali', trigger_evento: 'pre_visita', attiva: true,
    steps: [{
      delay_ore: 24, canale: 'entrambi', wa_template: 'promemoria_appuntamento',
      subject: 'Ci vediamo domani, {{nome}}', heading: 'A domani!',
      text: 'Ti aspettiamo il {{data}} alle {{ora}}.', cta_text: '', cta_url: '',
    }],
  }).select().single()
  if (errAuto) throw new Error(`automazione non creata: ${errAuto.message}`)
  automazioni.push(auto.id)

  const fra = new Date(); fra.setDate(fra.getDate() + 3)
  const giorno = fra.toISOString().slice(0, 10)

  console.log('\n1 · UNO STEP SU DUE CANALI LASCIA DUE RIGHE\n')
  const email1 = `zz-wa-${Date.now()}@playwright.internal`
  const p1 = await prenota(ris.id, giorno, '10:00', {
    cliente_email: email1, cliente_telefono: '+393401234567', whatsapp_optin: true,
  })
  ok(p1.status === 201, `la prenotazione riesce (HTTP ${p1.status})${p1.status !== 201 ? ' — ' + (p1.body.error || '') : ''}`)
  await new Promise(r => setTimeout(r, 2500))

  const { data: coda } = await admin.from('automazioni_log')
    .select('canale, contact_email, contact_telefono, scheduled_at').eq('automazione_id', auto.id)
  const canali = (coda || []).map(c => c.canale).sort()
  ok(canali.length === 2, `due righe in coda (${canali.length}: ${canali.join(', ') || 'nessuna'})`)
  ok(canali.join(',') === 'email,whatsapp', 'una per canale, non due uguali')
  const rigaWa = (coda || []).find(c => c.canale === 'whatsapp')
  ok(rigaWa?.contact_telefono === '+393401234567', `la riga WhatsApp porta il numero (${rigaWa?.contact_telefono || 'nessuno'})`)
  // ⛔ Il canale non cambia il momento: resta 24 ore PRIMA della visita.
  if (rigaWa) {
    const anticipo = Math.round((new Date(`${giorno}T10:00:00`) - new Date(rigaWa.scheduled_at)) / 3_600_000)
    ok(anticipo === 24, `programmata ${anticipo} ore prima della visita (atteso 24)`)
  }

  console.log('\n2 · IL CONSENSO SI SALVA CON LA PROVA\n')
  const { data: c1 } = await admin.from('contatti')
    .select('id, whatsapp_optin, whatsapp_optin_il, whatsapp_optin_fonte, telefono')
    .eq('azienda_id', az.id).eq('email', email1).maybeSingle()
  if (c1) contatti.push(c1.id)
  ok(c1?.whatsapp_optin === true, 'il consenso è registrato')
  ok(!!c1?.whatsapp_optin_il, `si sa QUANDO è stato dato (${c1?.whatsapp_optin_il || 'mai'})`)
  ok(!!c1?.whatsapp_optin_fonte, `si sa DA DOVE (${c1?.whatsapp_optin_fonte || 'ignoto'})`)
  ok(c1?.telefono === '+393401234567', 'col numero a cui scrivere')

  console.log('\n3 · CHI NON LO DÀ NON FINISCE DA NESSUNA PARTE\n')
  const email2 = `zz-nowa-${Date.now()}@playwright.internal`
  const p2 = await prenota(ris.id, giorno, '12:00', {
    cliente_email: email2, cliente_telefono: '+393409998877',
  })
  ok(p2.status === 201, `la prenotazione riesce lo stesso (HTTP ${p2.status})`)
  await new Promise(r => setTimeout(r, 2000))
  const { data: c2 } = await admin.from('contatti').select('id').eq('azienda_id', az.id).eq('email', email2).maybeSingle()
  if (c2) contatti.push(c2.id)
  // 🔒 Prenotare non è iscriversi a niente: senza spunta il contatto non nasce.
  ok(!c2, 'nessun contatto creato senza consenso esplicito')

  console.log('\n4 · SENZA NUMERO LA RIGA WHATSAPP NON NASCE\n')
  const email3 = `zz-tel0-${Date.now()}@playwright.internal`
  const p3 = await prenota(ris.id, giorno, '14:00', { cliente_email: email3, whatsapp_optin: true })
  ok(p3.status === 201, `la prenotazione riesce (HTTP ${p3.status})`)
  await new Promise(r => setTimeout(r, 2500))
  const { data: coda3 } = await admin.from('automazioni_log')
    .select('canale').eq('automazione_id', auto.id).eq('contact_email', email3)
  ok(coda3?.length === 1 && coda3[0].canale === 'email',
     `solo la riga email (${(coda3 || []).map(c => c.canale).join(', ') || 'nessuna'})`)
  const { data: c3 } = await admin.from('contatti').select('id').eq('azienda_id', az.id).eq('email', email3).maybeSingle()
  if (c3) contatti.push(c3.id)
  ok(!c3, 'e nessun consenso salvato: senza numero non vuol dire niente')

  console.log('\n5 · LA SPUNTA NON SI CHIEDE SE NON SERVE\n')
  const r5 = await fetch(`${L}/api/guest/canali/${ent.tipo}/${ent.id}`)
  const b5 = await r5.json()
  // Nessuna azienda ha un numero collegato: la risposta onesta è «no».
  ok(r5.status === 200, `la route risponde (HTTP ${r5.status})`)
  ok(b5?.whatsapp === false, `dice di non chiedere il consenso (whatsapp: ${b5?.whatsapp})`)
  // ⚠️ E non deve raccontare altro: è pubblica.
  ok(Object.keys(b5 || {}).join(',') === 'whatsapp', `e dice SOLO quello (${Object.keys(b5 || {}).join(', ')})`)

  const r5b = await fetch(`${L}/api/guest/canali/inventato/${ent.id}`)
  ok((await r5b.json())?.whatsapp === false, 'un tipo che non esiste non fa uscire niente')

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'LA CODA SI SDOPPIA E IL CONSENSO È UNA PROVA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  for (const id of contatti) await admin.from('contatti').delete().eq('id', id)
  for (const id of automazioni) {
    await admin.from('automazioni_log').delete().eq('automazione_id', id)
    await admin.from('automazioni').delete().eq('id', id)
  }
  for (const id of risorse) {
    await admin.from('prenotazioni').delete().eq('risorsa_id', id)
    await admin.from('risorse').delete().eq('id', id)
  }
  for (const id of aziende) { const { error } = await admin.from('aziende').delete().eq('id', id); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
