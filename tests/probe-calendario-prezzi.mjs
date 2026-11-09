// Il calendario dei prezzi delle risorse a giornate (migration 144).
//
// Ogni giorno può avere il suo prezzo e le sue regole, come nei gestionali
// alberghieri. Le domande a cui si risponde provando:
//   1. il totale è la somma giorno per giorno, e lo dicono uguale il sito, la
//      prenotazione dal sito e quella presa dal titolare?
//   2. le restrizioni (niente ritiro, niente riconsegna, chiuso, minimo per
//      giorno d'inizio) reggono anche a una richiesta costruita a mano?
//   3. il calendario del sito mostra prezzi e restrizioni, e solo quelli?
//   4. un'altra azienda non legge né scrive il calendario, e i valori ostili
//      vengono rifiutati?
//   5. «riporta al prezzo base» e «copia sul prossimo anno» fanno quello che dicono?
//
// Crea due aziende «ZZ», un furgone che conta il giorno di riconsegna (sabato +
// domenica = 2 giorni), e pulisce tutto con `cancellaAziendaDiProva`.
// Uso: node probe-calendario-prezzi.mjs   ($env:TEST_URL='http://localhost:3000' per il locale)

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { admin, cancellaAziendaDiProva } from './probe-auth.mjs'

const { SUPABASE_URL, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

// Giorni puri, a mezzogiorno UTC per stare lontani dai bordi.
const piu = (g, n) => { const d = new Date(`${g}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const dow = g => new Date(`${g}T12:00:00Z`).getUTCDay()
// Il primo venerdì fra almeno 40 giorni: lontano da prenotazioni vere e dal «oggi».
let VEN = piu(new Date().toISOString().slice(0, 10), 40)
while (dow(VEN) !== 5) VEN = piu(VEN, 1)
const SAB = piu(VEN, 1), DOM = piu(VEN, 2), LUN = piu(VEN, 3), MER = piu(VEN, 5)

async function aziendaConTitolare(nome) {
  const { data: a, error } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${Date.now()}`, require_2fa: false }).select().single()
  if (error) throw error
  const { data: e } = await admin.from('entita').insert({ azienda_id: a.id, tipo: 'attivita', slug: `zz-${nome.toLowerCase()}-${Date.now()}`, name: `ZZ ${nome}`, active: true }).select().single()
  const email = `probe-cal-${nome.toLowerCase()}-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: us } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  await admin.from('profiles').upsert({ id: us.user.id, role: 'admin_azienda', azienda_id: a.id, full_name: 'P' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  return { az: a.id, ent: e.id, uid: us.user.id, token: s.session.access_token }
}

const conToken = token => (path, opts = {}) => fetch(`${TEST_URL}${path}`, {
  ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
})

let A = null, B = null
try {
  A = await aziendaConTitolare('CalA')
  B = await aziendaConTitolare('CalB')
  const fa = conToken(A.token), fb = conToken(B.token)

  console.log('\nCALENDARIO DEI PREZZI\n')
  const creata = await fa('/api/booking/risorse', { method: 'POST', body: JSON.stringify({
    nome: 'ZZ Furgone', modalita: 'giornaliero', entity_tipo: 'attivita', entity_id: A.ent,
    quantita: 1, prezzo: 100, attiva: true, conferma_auto: true, visibile_minisito: true,
    disponibilita: { conta_giorno_uscita: true, minimo_notti: 1 },
  }) })
  ok(creata.status === 201, `furgone creato (HTTP ${creata.status})`)
  if (!creata.ok) throw new Error((await creata.text()).slice(0, 200))
  const R = (await creata.json()).id
  const tariffe = (corpo, f = fa) => f(`/api/booking/risorse/${R}/tariffe`, { method: 'POST', body: JSON.stringify(corpo) })
  const conto = (dal, al) => fetch(`${TEST_URL}/api/booking/public/disponibilita/${R}?data=${dal}&data_fine=${al}`).then(r => r.json())

  // ── 1. senza calendario: come prima ──
  let c = await conto(VEN, LUN)
  ok(c.disponibile && c.totale === 400, `senza calendario ven→lun = 4 × 100 = 400 (${c.totale})`)

  // ── 2. il weekend costa di più ──
  let r = await tariffe({ azione: 'imposta', dal: VEN, al: piu(VEN, 13), giorni: [6, 0], valori: { prezzo: 150 } })
  let j = await r.json()
  ok(r.ok && j.giorni === 4, `prezzo del weekend su due settimane: 4 giorni (${j.giorni ?? j.error})`)
  c = await conto(VEN, LUN)
  ok(c.totale === 500 && c.giorni?.length === 4, `ven→lun = 100+150+150+100 = 500 (${c.totale}), 4 giorni nel dettaglio`)

  // ── 3. weekend intero: niente riconsegna il sabato, niente ritiro la domenica ──
  await tariffe({ azione: 'imposta', dal: SAB, al: SAB, valori: { chiuso_partenza: true } })
  await tariffe({ azione: 'imposta', dal: DOM, al: DOM, valori: { chiuso_arrivo: true } })
  c = await conto(VEN, SAB)
  ok(!c.disponibile && /riconsegnare/.test(c.motivo || ''), `ven→sab rifiutato: «${c.motivo}»`)
  c = await conto(DOM, LUN)
  ok(!c.disponibile && /ritirare/.test(c.motivo || ''), `dom→lun rifiutato: «${c.motivo}»`)
  c = await conto(SAB, DOM)
  ok(c.disponibile && c.totale === 300, `sab→dom (ritiro sabato, riconsegna domenica) = 300 (${c.totale})`)
  // Il prezzo resta: le restrizioni si aggiungono senza cancellarlo.
  const { data: rigaSab } = await admin.from('risorse_tariffe').select('prezzo, chiuso_partenza').eq('risorsa_id', R).eq('data', SAB).single()
  ok(Number(rigaSab.prezzo) === 150 && rigaSab.chiuso_partenza, 'aggiungere una restrizione non toglie il prezzo già scritto')

  // ── 4. minimo per giorno d'inizio, e un giorno chiuso ──
  await tariffe({ azione: 'imposta', dal: LUN, al: LUN, valori: { minimo_notti: 6 } })   // 7 giorni
  c = await conto(LUN, MER)
  ok(!c.disponibile && /7 giorni/.test(c.motivo || ''), `chi ritira il lunedì prende almeno 7 giorni: «${c.motivo}»`)
  await tariffe({ azione: 'imposta', dal: MER, al: MER, valori: { non_vendibile: true } })
  c = await conto(piu(LUN, 1), piu(MER, 1))
  ok(!c.disponibile && /non è disponibile/.test(c.motivo || ''), `un periodo che attraversa un giorno chiuso è rifiutato: «${c.motivo}»`)

  // ── 5. il calendario del sito: prezzi e restrizioni, nient'altro ──
  const mese = SAB.slice(0, 7)
  const mr = await fetch(`${TEST_URL}/api/booking/public/disponibilita/${R}?mese=${mese}`)
  const grezzo = await mr.text()
  const m = JSON.parse(grezzo)
  ok(m.prezzi?.[SAB] === 150, `il calendario del mese mostra il prezzo del sabato (${m.prezzi?.[SAB]})`)
  ok(m.no_fine?.includes(SAB) && m.no_inizio?.includes(DOM), 'il calendario sa dove non si ritira e non si riconsegna')
  if (MER.slice(0, 7) === mese) ok(m.occupati?.includes(MER), 'il giorno chiuso compare fra i non disponibili')
  ok(!/risorsa_id"\s*:\s*"[^"]+",\s*"data"|"id"\s*:|created_at|updated_at/.test(grezzo.replace(`"risorsa_id":"${R}"`, '')),
    'il corpo grezzo del mese non contiene id di righe né date tecniche')

  // ── 6. la prenotazione paga il conto del calendario, dal sito e dal titolare ──
  const pren = await fetch(`${TEST_URL}/api/booking/public/prenota`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ risorsa_id: R, data: VEN, data_fine: DOM, cliente_nome: 'ZZ Cliente', cliente_email: `delivered+zzcal${Date.now()}@resend.dev`, n_persone: 1, privacy_accettata: true }) })
  ok(pren.status === 201, `prenotazione dal sito ven→dom (HTTP ${pren.status})`)
  const { data: righe } = await admin.from('prenotazioni').select('importo_totale, dettaglio_prezzo').eq('risorsa_id', R)
  ok(Number(righe?.[0]?.importo_totale) === 400, `importo salvato = 100+150+150 = 400 (${righe?.[0]?.importo_totale})`)
  ok(righe?.[0]?.dettaglio_prezzo?.giorni?.length === 3, 'sulla prenotazione resta la fotografia dei 3 giorni col loro prezzo')
  const tel = await fa('/api/booking/prenotazioni', { method: 'POST', body: JSON.stringify({
    risorsa_id: R, data: piu(VEN, 7), data_fine: piu(DOM, 7), cliente_nome: 'ZZ Al telefono' }) })
  const telJ = await tel.json()
  ok(tel.ok && Number(telJ.importo_totale ?? (await admin.from('prenotazioni').select('importo_totale').eq('cliente_nome', 'ZZ Al telefono').single()).data?.importo_totale) === 400,
    `prenotazione presa dal titolare: stesso conto, 400 (HTTP ${tel.status})`)

  // ── 7. valori ostili e un'altra azienda ──
  const ostili = [
    [{ azione: 'imposta', dal: VEN, al: VEN, valori: { prezzo: -5 } }, 'prezzo negativo'],
    [{ azione: 'imposta', dal: VEN, al: VEN, valori: { prezzo: 'abc' } }, 'prezzo non numerico'],
    [{ azione: 'imposta', dal: VEN, al: VEN, valori: { chiuso_arrivo: 'true' } }, 'restrizione scritta come testo'],
    [{ azione: 'imposta', dal: VEN, al: VEN, valori: { minimo_notti: 2.5 } }, 'minimo non intero'],
    [{ azione: 'imposta', dal: '2026-02-30', al: '2026-03-01', valori: { prezzo: 1 } }, 'data inesistente'],
    [{ azione: 'imposta', dal: VEN, al: piu(VEN, 500), valori: { prezzo: 1 } }, 'più di 400 giorni'],
    [{ azione: 'imposta', dal: VEN, al: VEN, valori: {} }, 'nessun valore'],
    [{ azione: 'distruggi', dal: VEN, al: VEN }, 'azione inventata'],
    [{ azione: 'imposta', dal: `${VEN}' or 1=1`, al: VEN, valori: { prezzo: 1 } }, 'data con dentro una query'],
  ]
  for (const [corpo, nome] of ostili) {
    const x = await tariffe(corpo)
    ok(x.status === 400, `rifiutato: ${nome} (HTTP ${x.status})`)
  }
  const bLegge = await fb(`/api/booking/risorse/${R}/tariffe?dal=${VEN}&al=${LUN}`)
  ok(bLegge.status === 404, `un'altra azienda non legge il calendario (HTTP ${bLegge.status})`)
  const bScrive = await tariffe({ azione: 'imposta', dal: VEN, al: VEN, valori: { prezzo: 1 } }, fb)
  ok(bScrive.status === 404, `un'altra azienda non scrive il calendario (HTTP ${bScrive.status})`)
  const finto = await fb(`/api/booking/risorse/00000000-0000-4000-8000-000000000000/tariffe?dal=${VEN}&al=${LUN}`)
  ok(finto.status === bLegge.status && (await finto.text()) === (await fb(`/api/booking/risorse/${R}/tariffe?dal=${VEN}&al=${LUN}`).then(x => x.text())),
    'la risposta a un id inventato è identica a quella su una risorsa altrui')
  const senza = await fetch(`${TEST_URL}/api/booking/risorse/${R}/tariffe?dal=${VEN}&al=${LUN}`)
  ok(senza.status === 401, `senza login niente (HTTP ${senza.status})`)
  const { data: dopoB } = await admin.from('risorse_tariffe').select('prezzo').eq('risorsa_id', R).eq('data', VEN).maybeSingle()
  ok(!dopoB || dopoB.prezzo == null, 'il venerdì di A non ha preso il prezzo scritto da B')

  // ── 8. copia sul prossimo anno e ritorno al prezzo base ──
  r = await tariffe({ azione: 'copia', dal: VEN, al: piu(VEN, 13) })
  j = await r.json()
  const { data: copiato } = await admin.from('risorse_tariffe').select('data, prezzo').eq('risorsa_id', R).eq('data', piu(SAB, 364)).maybeSingle()
  ok(r.ok && Number(copiato?.prezzo) === 150 && dow(copiato.data) === 6, `copiato sul prossimo anno, il sabato resta sabato (${copiato?.data})`)
  r = await tariffe({ azione: 'azzera', dal: VEN, al: piu(VEN, 13) })
  const { count } = await admin.from('risorse_tariffe').select('id', { count: 'exact', head: true }).eq('risorsa_id', R).lte('data', piu(VEN, 13))
  ok(r.ok && count === 0, `«riporta al prezzo base» toglie le righe (${count} rimaste)`)
  c = await conto(piu(LUN, 7), piu(LUN, 9))
  ok(c.disponibile && c.totale === 300, `dopo l'azzeramento torna il prezzo base: 3 × 100 (${c.totale})`)
} catch (e) {
  ok(false, `errore: ${e.message}`)
} finally {
  // Le prenotazioni tengono la risorsa (ON DELETE RESTRICT): la route di
  // cancellazione dell'azienda le porta via in ordine.
  try { if (A) { await cancellaAziendaDiProva(A.az); await admin.auth.admin.deleteUser(A.uid) } } catch (e) { console.log('  pulizia A:', e.message) }
  try { if (B) { await cancellaAziendaDiProva(B.az); await admin.auth.admin.deleteUser(B.uid) } } catch (e) { console.log('  pulizia B:', e.message) }
}

console.log(ko ? `\n✗ ${ko} controlli non passati\n` : '\n✓ tutto a posto\n')
process.exit(ko ? 1 : 0)
