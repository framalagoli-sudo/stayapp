// A3 — si può scrivere su un record altrui infilando un campo nel corpo?
//
// La sonda di autorizzazione (probe-security-sweep) è cieca su questo: la
// richiesta è legittima — sto creando un MIO evento — ma un campo punta
// all'entità di un'altra azienda. Se l'API pubblica non ricontrolla, il
// contenuto compare sul sito di quell'azienda.
//
// Uso: node probe-mass-assignment.mjs [--verbose]

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

let problemi = 0
const esito = (ok, testo) => { console.log(`  ${ok ? '✓' : '✗'} ${testo}`); if (!ok) problemi++ }

async function creaAzienda(tag) {
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-MA-${tag}-${Date.now()}`, require_2fa: false }).select().single()
  const email = `probe-ma-${tag}-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  await admin.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', azienda_id: az.id, full_name: `Probe ${tag}` }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const { data: ent } = await admin.from('properties')
    .insert({ azienda_id: az.id, slug: `zz-ma-${tag}-${Date.now()}`, name: `Struttura ${tag}`, active: true }).select().single()
  return { aziendaId: az.id, userId: u.user.id, token: s.session.access_token, entita: ent }
}

let A = null, B = null

try {
  A = await creaAzienda('A')   // l'attaccante
  B = await creaAzienda('B')   // la vittima
  console.log(`\nazienda A (attaccante) e azienda B (vittima) create`)
  console.log(`entità della vittima: ${B.entita.slug}\n`)

  const creaEvento = (token, entityId, titolo) => fetch(`${BASE}/api/eventi`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: titolo, description: 'evento di prova',
      date_start: new Date(Date.now() + 7 * 864e5).toISOString(),
      seats_total: 10, price: 0, active: true, published: true,
      entity_tipo: 'struttura', entity_id: entityId,
    }),
  })
  const creaRisorsa = (token, entityId, nome) => fetch(`${BASE}/api/booking/risorse`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome, modalita: 'slot', durata_minuti: 60, attiva: true, visibile_minisito: true,
      entity_tipo: 'struttura', entity_id: entityId,
    }),
  })

  // ── 1. Evento di A agganciato all'entità di B: dev'essere respinto ──────────
  console.log('[1] l’azienda A crea un evento puntato all’entità dell’azienda B')
  const marcatore = `ZZ-INTRUSO-${Date.now()}`
  const r = await creaEvento(A.token, B.entita.id, marcatore)
  const evento = await r.json()
  esito(r.status === 404, `la creazione su entità altrui è respinta (${r.status})`)

  // Anche se passasse, non deve comparire sul sito della vittima.
  const g = await fetch(`${BASE}/api/guest/eventi?entity_tipo=struttura&entity_id=${B.entita.id}`)
  const visibile = (await g.text()).includes(marcatore)
  esito(!visibile, `l’evento intruso non compare sul sito della vittima${visibile ? ' — COMPARE!' : ''}`)
  if (evento?.id) await admin.from('eventi').delete().eq('id', evento.id)

  // ── 2. Non-regressione: sulla PROPRIA entità deve funzionare ────────────────
  console.log('\n[2] l’azienda A crea un evento sulla PROPRIA entità (non deve essersi rotto nulla)')
  const legittimo = `ZZ-LEGITTIMO-${Date.now()}`
  const r2 = await creaEvento(A.token, A.entita.id, legittimo)
  const ev2 = await r2.json()
  esito(r2.status < 300, `la creazione legittima funziona (${r2.status})`)
  if (ev2?.id) {
    const g2 = await fetch(`${BASE}/api/guest/eventi?entity_tipo=struttura&entity_id=${A.entita.id}`)
    const vis2 = (await g2.text()).includes(legittimo)
    esito(vis2, `l’evento legittimo compare sul proprio sito${vis2 ? '' : ' — NON COMPARE, funzione rotta!'}`)
    await admin.from('eventi').delete().eq('id', ev2.id)
  }

  // ── 3. Stessa coppia di prove per le risorse di booking ────────────────────
  console.log('\n[3] stesse due prove con una risorsa di booking')
  const r3 = await creaRisorsa(A.token, B.entita.id, `ZZ-RIS-INTRUSA-${Date.now()}`)
  const ris3 = await r3.json()
  esito(r3.status === 404, `risorsa su entità altrui respinta (${r3.status})`)
  if (ris3?.id) await admin.from('risorse').delete().eq('id', ris3.id)

  const r4 = await creaRisorsa(A.token, A.entita.id, `ZZ-RIS-PROPRIA-${Date.now()}`)
  const ris4 = await r4.json()
  esito(r4.status < 300, `risorsa sulla propria entità accettata (${r4.status})`)
  if (ris4?.id) await admin.from('risorse').delete().eq('id', ris4.id)

  // ── 4. Spostare un record esistente su un'entità altrui (PATCH) ─────────────
  console.log('\n[4] l’azienda A sposta un proprio evento sull’entità della vittima')
  const r5 = await creaEvento(A.token, A.entita.id, `ZZ-SPOSTA-${Date.now()}`)
  const ev5 = await r5.json()
  if (ev5?.id) {
    const p = await fetch(`${BASE}/api/eventi/${ev5.id}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${A.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_tipo: 'struttura', entity_id: B.entita.id }),
    })
    esito(p.status === 404, `lo spostamento su entità altrui è respinto (${p.status})`)
    const { data: dopo } = await admin.from('eventi').select('entity_id').eq('id', ev5.id).maybeSingle()
    esito(dopo?.entity_id !== B.entita.id, `l’evento non è finito sull’entità altrui`)
    await admin.from('eventi').delete().eq('id', ev5.id)
  }

  // ── 5. entity_tipo interpolato grezzo nel filtro PostgREST ──────────────────
  console.log('\n[5] entity_tipo finisce grezzo dentro un filtro .or() — si può alterare la query?')
  const ostile = encodeURIComponent('struttura),and(id.not.is.null')
  const g3 = await fetch(`${BASE}/api/guest/eventi?entity_tipo=${ostile}&entity_id=${B.entita.id}`)
  const testo3 = await g3.text()
  // Una query alterata restituisce un errore PostgREST o una lista più lunga del dovuto.
  const rottura = g3.status >= 500 || /PGRST|syntax|unexpected|failed to parse/i.test(testo3)
  esito(!rottura, `il filtro regge a un entity_tipo ostile (${g3.status})${rottura ? ' — QUERY ALTERATA' : ''}`)
  if (rottura) console.log(`     risposta: ${testo3.slice(0, 200)}`)

  // ── 6. Escalation di ruolo: diventare super_admin da soli ──────────────────
  console.log('\n[6] l’admin dell’azienda A prova a promuoversi e a invadere l’azienda B')

  const p6 = await fetch(`${BASE}/api/users/${A.userId}`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${A.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'super_admin' }),
  })
  const { data: ioDopo } = await admin.from('profiles').select('role').eq('id', A.userId).maybeSingle()
  esito(ioDopo?.role === 'admin_azienda', `non si è promosso a super_admin (ruolo: ${ioDopo?.role}, HTTP ${p6.status})`)

  // Spostare sé stessi nell'azienda della vittima ne aprirebbe tutti i dati.
  const p7 = await fetch(`${BASE}/api/users/${A.userId}`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${A.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ azienda_id: B.aziendaId }),
  })
  const { data: azDopo } = await admin.from('profiles').select('azienda_id').eq('id', A.userId).maybeSingle()
  esito(azDopo?.azienda_id === A.aziendaId, `non si è spostato nell’azienda della vittima (HTTP ${p7.status})`)

  // Invitare un collaboratore chiedendo per lui il ruolo di super_admin.
  const invito = `probe-inv-${Date.now()}@playwright.internal`
  const p8 = await fetch(`${BASE}/api/users/invite`, {
    method: 'POST', headers: { Authorization: `Bearer ${A.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: invito, full_name: 'Invitato', role: 'super_admin', azienda_id: B.aziendaId }),
  })
  const inv = await p8.json().catch(() => ({}))
  if (inv?.id) {
    const { data: pInv } = await admin.from('profiles').select('role, azienda_id').eq('id', inv.id).maybeSingle()
    esito(pInv?.role === 'staff', `l’invitato nasce staff, non super_admin (${pInv?.role})`)
    esito(pInv?.azienda_id === A.aziendaId, `l’invitato finisce nell’azienda di chi invita, non in quella scelta`)
    try { await admin.auth.admin.deleteUser(inv.id) } catch {}
  } else {
    esito(true, `invito non riuscito (${p8.status}) — nessuna escalation possibile`)
  }

  console.log('\n' + '─'.repeat(62))
  console.log(problemi ? `${problemi} PROBLEMI DA GUARDARE` : 'NESSUN PROBLEMA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  for (const x of [A, B]) {
    if (!x) continue
    await admin.from('eventi').delete().eq('azienda_id', x.aziendaId)
    await admin.from('risorse').delete().eq('azienda_id', x.aziendaId)
    if (x.entita) await admin.from('properties').delete().eq('id', x.entita.id)
    if (x.userId) { try { await admin.auth.admin.deleteUser(x.userId) } catch {} }
    const { error } = await admin.from('aziende').delete().eq('id', x.aziendaId)
    if (error) console.error('pulizia azienda:', error.message)
  }
  console.log('[probe] aziende e utenti effimeri eliminati')
  process.exit(problemi ? 1 : 0)
}
