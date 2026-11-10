// Le offerte delle risorse, fase 2 (migration 145): sconti in percentuale e di
// un importo, prenotazione anticipata, last minute, pacchetti che si ripetono.
//
// Le domande, provate dalle route vere:
//   1. ogni tipo si crea dal pannello e il sito fa il conto giusto?
//   2. le offerte non si sommano: vince la più conveniente per chi prenota?
//   3. la prenotazione paga quel conto, e se lo ricorda (dettaglio_prezzo)?
//   4. i valori senza senso vengono rifiutati, anche in modifica?
//   5. negli slot orari un'offerta scelta dal browser vale solo nel suo giorno
//      e nella sua ora (prima bastava nominarla per averne il prezzo)?
//
// Uso: node probe-offerte-sconti.mjs   ($env:TEST_URL='http://localhost:3000' per il locale)

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { admin, cancellaAziendaDiProva } from './probe-auth.mjs'

const { SUPABASE_URL, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }
const piu = (g, n) => { const d = new Date(`${g}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const dow = g => new Date(`${g}T12:00:00Z`).getUTCDay()
const OGGI = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())
let VEN = piu(OGGI, 45)
while (dow(VEN) !== 5) VEN = piu(VEN, 1)
const LUN = piu(VEN, 3)

let az = null, uid = null
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-Sconti-${Date.now()}`, require_2fa: false }).select().single(); az = a.id
  const { data: e } = await admin.from('entita').insert({ azienda_id: az, tipo: 'attivita', slug: `zz-sconti-${Date.now()}`, name: 'ZZ Sconti', active: true }).select().single()
  const email = `probe-sconti-${Date.now()}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: us } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); uid = us.user.id
  await admin.from('profiles').upsert({ id: uid, role: 'admin_azienda', azienda_id: az, full_name: 'P' }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const api = (path, opts = {}) => fetch(`${TEST_URL}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session.access_token}` } })

  const { data: f } = await admin.from('risorse').insert({ azienda_id: az, entity_tipo: 'attivita', entity_id: e.id, nome: 'ZZ Furgone',
    modalita: 'giornaliero', quantita: 3, prezzo: 100, attiva: true, conferma_auto: true, visibile_minisito: true,
    disponibilita: { conta_giorno_uscita: true, minimo_notti: 1 }, blocchi: [] }).select().single()
  const tutti = Object.fromEntries(['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'].map(k => [k, [{ start: '09:00', end: '20:00' }]]))
  const { data: sl } = await admin.from('risorse').insert({ azienda_id: az, entity_tipo: 'attivita', entity_id: e.id, nome: 'ZZ Campo',
    modalita: 'slot', durata_minuti: 60, quantita: 1, prezzo: 20, attiva: true, conferma_auto: true, visibile_minisito: true,
    disponibilita: tutti, blocchi: [] }).select().single()

  const crea = async corpo => { const r = await api('/api/booking/promozioni', { method: 'POST', body: JSON.stringify({ risorsa_id: f.id, nome: 'ZZ offerta', ...corpo }) }); return { r, j: await r.json() } }
  const conto = (dal, al) => fetch(`${TEST_URL}/api/booking/public/disponibilita/${f.id}?data=${dal}&data_fine=${al}`).then(r => r.json())
  const togli = id => api(`/api/booking/promozioni/${id}`, { method: 'DELETE' })

  console.log('\nOFFERTE: SCONTI, ANTICIPO, LAST MINUTE, PACCHETTI\n')
  // ── 1. percentuale da 3 giorni in su ──
  let { r, j } = await crea({ nome: 'ZZ Lungo', sconto_tipo: 'percentuale', sconto_valore: 10, minimo_notti: 2 })
  ok(r.status === 201, `sconto del 10% creato (HTTP ${r.status}${j.error ? ' ' + j.error : ''})`)
  let c = await conto(VEN, LUN)
  ok(c.totale === 360 && c.totale_pieno === 400 && c.offerta?.sconto === '-10%', `ven→lun: 400 - 10% = ${c.totale} (${c.offerta?.sconto})`)
  c = await conto(VEN, piu(VEN, 1))
  ok(c.totale === 200 && !c.offerta, `2 giorni (sotto il minimo): nessuno sconto, ${c.totale}`)
  await togli(j.id)

  // ── 2. importo ──
  ;({ r, j } = await crea({ nome: 'ZZ Meno 30', sconto_tipo: 'importo', sconto_valore: 30 }))
  c = await conto(VEN, LUN)
  ok(r.status === 201 && c.totale === 370, `sconto di 30 €: 400 → ${c.totale}`)
  await togli(j.id)

  // ── 3. prenotazione anticipata e last minute ──
  ;({ j } = await crea({ nome: 'ZZ Anticipata', sconto_tipo: 'percentuale', sconto_valore: 15, prenota_prima_giorni: 30 }))
  c = await conto(VEN, LUN)
  ok(c.totale === 340, `anticipata (mancano più di 30 giorni): -15% → ${c.totale}`)
  const vicino = piu(OGGI, 3)
  c = await conto(vicino, piu(vicino, 2))
  ok(c.totale === 300 && !c.offerta, `anticipata a 3 giorni: non vale (${c.totale})`)
  await togli(j.id)
  ;({ j } = await crea({ nome: 'ZZ Last minute', sconto_tipo: 'percentuale', sconto_valore: 25, prenota_entro_giorni: 5 }))
  c = await conto(vicino, piu(vicino, 2))
  ok(c.totale === 225, `last minute a 3 giorni: -25% → ${c.totale}`)
  c = await conto(VEN, LUN)
  ok(c.totale === 400 && !c.offerta, `last minute fra 45 giorni: non vale (${c.totale})`)
  await togli(j.id)

  // ── 4. pacchetto ven→lun ──
  ;({ r, j } = await crea({ nome: 'ZZ Weekend lungo', sconto_tipo: 'prezzo', prezzo_modo: 'periodo', prezzo_speciale: 300, durata_esatta: 3, giorni_settimana: [5] }))
  ok(r.status === 201, `pacchetto ven→lun creato (HTTP ${r.status}${j.error ? ' ' + j.error : ''})`)
  c = await conto(VEN, LUN)
  ok(c.totale === 300 && c.offerta?.nome === 'ZZ Weekend lungo', `ven→lun col pacchetto: ${c.totale}`)
  c = await conto(piu(VEN, 7), piu(LUN, 7))
  ok(c.totale === 300, `…e anche la settimana dopo: ${c.totale}`)
  c = await conto(piu(VEN, -1), piu(LUN, -1))
  ok(c.totale === 400, `gio→dom non è il pacchetto: ${c.totale}`)

  // ── 5. non cumulabili: vince la migliore ──
  const { j: meno } = await crea({ nome: 'ZZ Meno 50', sconto_tipo: 'importo', sconto_valore: 50 })
  c = await conto(VEN, LUN)
  ok(c.totale === 300 && c.offerta?.nome === 'ZZ Weekend lungo', `pacchetto (300) e -50 € (350) insieme: vince il pacchetto, ${c.totale}`)
  c = await conto(VEN, piu(VEN, 1))
  ok(c.totale === 150 && c.offerta?.nome === 'ZZ Meno 50', `su 2 giorni vale solo il -50 €: ${c.totale}`)

  // ── 6. la prenotazione paga quel conto e se lo ricorda ──
  const pren = await fetch(`${TEST_URL}/api/booking/public/prenota`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ risorsa_id: f.id, data: VEN, data_fine: LUN, cliente_nome: 'ZZ Cliente', cliente_email: `delivered+zzsconti${Date.now()}@resend.dev`, n_persone: 1, privacy_accettata: true }) })
  ok(pren.status === 201, `prenotazione ven→lun dal sito (HTTP ${pren.status})`)
  const { data: riga } = await admin.from('prenotazioni').select('importo_totale, promozione_id, dettaglio_prezzo').eq('risorsa_id', f.id).single()
  ok(Number(riga?.importo_totale) === 300, `importo salvato: ${riga?.importo_totale}`)
  ok(riga?.dettaglio_prezzo?.offerta?.nome === 'ZZ Weekend lungo' && riga?.dettaglio_prezzo?.totale_listino === 400, 'la prenotazione ricorda l\'offerta e il listino')
  await togli(meno.id)

  // ── 7. valori senza senso ──
  for (const [corpo, nome] of [
    [{ sconto_tipo: 'percentuale', sconto_valore: 150 }, 'sconto del 150%'],
    [{ sconto_tipo: 'importo', sconto_valore: 0 }, 'sconto di 0 €'],
    [{ sconto_tipo: 'prezzo', prezzo_speciale: 300, durata_esatta: 3, prezzo_modo: 'giorno' }, 'durata esatta senza prezzo per tutto il periodo'],
    [{ sconto_tipo: 'percentuale', sconto_valore: 10, prenota_prima_giorni: 30, prenota_entro_giorni: 3 }, 'anticipata e last minute insieme al contrario'],
    [{ sconto_tipo: 'prezzo', prezzo_speciale: 'gratis' }, 'prezzo non numerico'],
    [{ sconto_tipo: 'prezzo', prezzo_speciale: 10, giorni_settimana: [8] }, 'giorno della settimana inesistente'],
  ]) {
    const { r: x } = await crea(corpo)
    ok(x.status === 400, `rifiutato: ${nome} (HTTP ${x.status})`)
  }
  const pm = await api(`/api/booking/promozioni/${j.id}`, { method: 'PATCH', body: JSON.stringify({ sconto_tipo: 'percentuale' }) })
  ok(pm.status === 400, `in modifica: cambiare tipo senza dire lo sconto è rifiutato (HTTP ${pm.status})`)
  const sconto = await api('/api/booking/promozioni', { method: 'POST', body: JSON.stringify({ risorsa_id: sl.id, nome: 'ZZ x', sconto_tipo: 'percentuale', sconto_valore: 10 }) })
  ok(sconto.status === 400, `uno sconto su una risorsa a slot è rifiutato (HTTP ${sconto.status})`)

  // ── 8. slot: l'offerta scelta dal browser vale solo nel suo giorno e ora ──
  const { data: vecchia } = await admin.from('risorse_promozioni').insert({ risorsa_id: sl.id, nome: 'ZZ Fuori stagione',
    prezzo_speciale: 1, data_inizio: '2020-01-01', data_fine: '2020-12-31' }).select().single()
  const domani = piu(OGGI, 2)
  const ps = await fetch(`${TEST_URL}/api/booking/public/prenota`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ risorsa_id: sl.id, data: domani, ora_inizio: '10:00', promozione_id: vecchia.id, cliente_nome: 'ZZ Furbo', cliente_email: `delivered+zzslot${Date.now()}@resend.dev`, n_persone: 1, privacy_accettata: true }) })
  const { data: rs } = await admin.from('prenotazioni').select('importo_totale, promozione_id').eq('risorsa_id', sl.id).maybeSingle()
  ok(ps.status === 201 && Number(rs?.importo_totale) === 20 && !rs?.promozione_id,
    `slot con un'offerta del 2020 nominata dal browser: paga il listino, 20 € (pagato ${rs?.importo_totale}, HTTP ${ps.status})`)
} catch (e) {
  ok(false, `errore: ${e.message}`)
} finally {
  try { if (az) await cancellaAziendaDiProva(az) } catch (e) { console.log('  pulizia:', e.message) }
  if (uid) await admin.auth.admin.deleteUser(uid)
}

console.log(ko ? `\n✗ ${ko} controlli non passati\n` : '\n✓ tutto a posto\n')
process.exit(ko ? 1 : 0)
