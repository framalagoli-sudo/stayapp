import { Router } from 'express'
import { Resend } from 'resend'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { sendWebhooks } from '../lib/webhook.js'
import { triggerAutomazione } from '../lib/automazioni.js'
import { syncBookingCreate, syncBookingDelete } from '../lib/googleCalendar.js'

const router = Router()
const resend = new Resend(process.env.RESEND_API_KEY)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

// Day name mapping: JS getDay() → chiave disponibilita
const DAY_KEYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

// ─── Disponibilità: logica core ───────────────────────────────────────────────

function parseTime(str) {
  // "09:30" → 570 (minuti da mezzanotte)
  const [h, m] = str.split(':').map(Number)
  return h * 60 + (m || 0)
}

function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function isDateBlocked(blocchi, date) {
  return (blocchi || []).some(b => {
    if (b.data) return b.data === date
    if (b.data_inizio && b.data_fine) return date >= b.data_inizio && date <= b.data_fine
    return false
  })
}

function findPromo(promozioni, slotOra, date) {
  const slotMin = parseTime(slotOra)
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()

  for (const p of promozioni) {
    if (!p.attiva) continue
    if (p.data_inizio && date < p.data_inizio) continue
    if (p.data_fine   && date > p.data_fine)   continue
    if (p.giorni_settimana?.length && !p.giorni_settimana.includes(dayOfWeek)) continue
    if (p.ora_inizio) {
      if (slotMin < parseTime(p.ora_inizio) || slotMin >= parseTime(p.ora_fine)) continue
    }
    return { id: p.id, nome: p.nome, prezzo: p.prezzo_speciale, badge: p.badge_label, colore: p.colore }
  }
  return null
}

// Calcola slot disponibili per modalita = 'slot'
async function calcolaSlotOrari(risorsa, promozioni, date) {
  if (isDateBlocked(risorsa.blocchi, date)) return []

  const dayKey  = DAY_KEYS[new Date(date + 'T12:00:00').getDay()]
  const windows = risorsa.disponibilita[dayKey] || []
  if (!windows.length) return []

  // Genera tutti gli slot teorici nella giornata
  const tuttiSlot = []
  for (const w of windows) {
    let cur = parseTime(w.start)
    const fine = parseTime(w.end) - risorsa.durata_minuti
    while (cur <= fine) {
      tuttiSlot.push(formatTime(cur))
      cur += risorsa.durata_minuti
    }
  }
  if (!tuttiSlot.length) return []

  // Occupazioni esistenti per questa risorsa in questa data
  const { data: bookings } = await supabase
    .from('prenotazioni')
    .select('ora_inizio')
    .eq('risorsa_id', risorsa.id)
    .eq('data', date)
    .in('stato', ['confermata', 'in_attesa'])

  const occupancy = {}
  for (const b of bookings || []) {
    const k = b.ora_inizio?.slice(0, 5) // "09:00:00" → "09:00"
    occupancy[k] = (occupancy[k] || 0) + 1
  }

  // Filtro: non mostrare slot nel passato (con margine anticipo_ore)
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + (risorsa.anticipo_ore || 1) * 60

  return tuttiSlot
    .filter(slot => {
      if (date === today && parseTime(slot) < nowMinutes) return false
      return (occupancy[slot] || 0) < risorsa.quantita
    })
    .map(slot => ({
      ora: slot,
      ora_fine: formatTime(parseTime(slot) + risorsa.durata_minuti),
      disponibili: risorsa.quantita - (occupancy[slot] || 0),
      totale: risorsa.quantita,
      prezzo: risorsa.prezzo,
      promo: findPromo(promozioni, slot, date),
    }))
}

// Calcola disponibilità per modalita = 'coperti'
async function calcolaCoperti(risorsa, date) {
  const disp = risorsa.disponibilita || {}
  const giorniChiusura = disp.giorni_chiusura || []
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()

  if (isDateBlocked(risorsa.blocchi, date)) return []
  if (giorniChiusura.includes(dayOfWeek)) return []

  const servizi = disp.servizi || []
  if (!servizi.length) return []

  const { data: bookings } = await supabase
    .from('prenotazioni')
    .select('servizio, ora_inizio, n_persone')
    .eq('risorsa_id', risorsa.id)
    .eq('data', date)
    .in('stato', ['confermata', 'in_attesa'])

  // Mappa occupazione: "Pranzo_12:00" → totale persone
  const occupancy = {}
  for (const b of bookings || []) {
    const k = `${b.servizio}_${b.ora_inizio?.slice(0, 5)}`
    occupancy[k] = (occupancy[k] || 0) + (b.n_persone || 1)
  }

  const result = []
  for (const srv of servizi) {
    for (const orario of srv.orari || []) {
      const k = `${srv.nome}_${orario}`
      const occupati = occupancy[k] || 0
      const disponibili = (risorsa.max_coperti || 0) - occupati
      if (disponibili > 0) {
        result.push({
          servizio: srv.nome,
          ora: orario,
          disponibili,
          totale: risorsa.max_coperti,
          prezzo: risorsa.prezzo,
        })
      }
    }
  }
  return result
}

// ─── Email di conferma ────────────────────────────────────────────────────────

function buildWaUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return raw
  const clean = raw.replace(/[\s\-\(\)\+]/g, '').replace(/^00/, '').replace(/^0/, '39')
  return `https://wa.me/${clean}`
}

async function getEntityWhatsapp(entityTipo, entityId) {
  try {
    if (entityTipo === 'struttura') {
      const { data } = await supabase.from('properties').select('whatsapp').eq('id', entityId).single()
      return data?.whatsapp || null
    }
    if (entityTipo === 'ristorante') {
      const { data } = await supabase.from('ristoranti').select('minisito').eq('id', entityId).single()
      return data?.minisito?.social?.whatsapp || null
    }
    if (entityTipo === 'attivita') {
      const { data } = await supabase.from('attivita').select('minisito').eq('id', entityId).single()
      return data?.minisito?.social?.whatsapp || null
    }
  } catch { /* non bloccante */ }
  return null
}

async function inviaEmailConferma(prenotazione, risorsa, whatsapp = null) {
  if (!process.env.RESEND_API_KEY) return
  const cancelUrl = `${process.env.CLIENT_URL || 'https://oltrenova.com'}/cancella-prenotazione?token=${prenotazione.cancellation_token}`
  const waUrl = buildWaUrl(whatsapp)

  const quando = risorsa.modalita === 'coperti'
    ? `${prenotazione.data} — ${prenotazione.servizio} ore ${prenotazione.ora_inizio}`
    : `${prenotazione.data} ore ${prenotazione.ora_inizio?.slice(0, 5)}–${prenotazione.ora_fine?.slice(0, 5)}`

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
      to: prenotazione.cliente_email,
      subject: `Prenotazione confermata — ${risorsa.nome}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1a1a2e">Prenotazione confermata ✓</h2>
          <p>Ciao <strong>${prenotazione.cliente_nome}</strong>,</p>
          <p>La tua prenotazione è confermata.</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr><td style="padding:8px;color:#666">Servizio</td><td style="padding:8px;font-weight:600">${risorsa.nome}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding:8px;color:#666">Quando</td><td style="padding:8px;font-weight:600">${quando}</td></tr>
            <tr><td style="padding:8px;color:#666">Persone</td><td style="padding:8px;font-weight:600">${prenotazione.n_persone}</td></tr>
            ${prenotazione.importo_totale > 0 ? `<tr style="background:#f5f5f5"><td style="padding:8px;color:#666">Importo</td><td style="padding:8px;font-weight:600">€${prenotazione.importo_totale}</td></tr>` : ''}
          </table>
          ${prenotazione.note_cliente ? `<p style="color:#666;font-size:14px">Note: ${prenotazione.note_cliente}</p>` : ''}
          ${waUrl ? `
          <div style="margin:20px 0;padding:14px 18px;background:#f0fdf4;border-radius:10px;text-align:center">
            <p style="margin:0;font-size:14px;color:#166534">
              Hai domande?
              <a href="${waUrl}" style="color:#25D366;font-weight:700;text-decoration:none">Scrivici su WhatsApp →</a>
            </p>
          </div>` : ''}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="font-size:13px;color:#999">
            Hai bisogno di cancellare?
            <a href="${cancelUrl}" style="color:#00b5b5">Clicca qui</a>
            (entro ${risorsa.cancellazione_ore || 24} ore prima).
          </p>
        </div>
      `,
    })
  } catch (e) {
    console.error('[booking] email conferma fallita:', e.message)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (requireAuth)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Risorse ──────────────────────────────────────────────────────────────────

const RISORSE_ALLOWED = [
  'nome', 'descrizione', 'modalita', 'entity_tipo', 'entity_id',
  'durata_minuti', 'quantita', 'max_coperti',
  'prezzo', 'valuta', 'colore',
  'disponibilita', 'blocchi',
  'anticipo_ore', 'cancellazione_ore', 'conferma_auto', 'attiva', 'visibile_minisito',
]

router.get('/risorse', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    let query = supabase.from('risorse').select('*').order('nome')
    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return res.json([])
      query = query.eq('azienda_id', profile.azienda_id)
    } else if (isUUID(req.query.azienda_id)) {
      query = query.eq('azienda_id', req.query.azienda_id)
    }
    if (req.query.entity_tipo && req.query.entity_id) {
      query = query.eq('entity_tipo', req.query.entity_tipo).eq('entity_id', req.query.entity_id)
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/risorse/:id', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })
    let q = supabase.from('risorse').select('*').eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data, error } = await q.single()
    if (error || !data) return res.status(404).json({ error: 'Risorsa non trovata' })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/risorse', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    const azienda_id = isUUID(req.body.azienda_id) ? req.body.azienda_id
      : isUUID(profile.azienda_id) ? profile.azienda_id : null
    if (!azienda_id) return res.status(400).json({ error: 'Nessuna azienda valida' })
    if (!req.body.nome?.trim()) return res.status(400).json({ error: 'Il nome è obbligatorio' })

    const payload = Object.fromEntries(Object.entries(req.body).filter(([k]) => RISORSE_ALLOWED.includes(k)))
    const { data, error } = await supabase.from('risorse').insert({ ...payload, azienda_id }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/risorse/:id', requireAuth, async (req, res) => {
  try {
    const payload = Object.fromEntries(Object.entries(req.body).filter(([k]) => RISORSE_ALLOWED.includes(k)))
    payload.updated_at = new Date().toISOString()
    const { data, error } = await supabase.from('risorse').update(payload).eq('id', req.params.id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/risorse/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('risorse').delete().eq('id', req.params.id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Promozioni ───────────────────────────────────────────────────────────────

const PROMO_ALLOWED = [
  'nome', 'descrizione', 'data_inizio', 'data_fine',
  'ora_inizio', 'ora_fine', 'giorni_settimana',
  'prezzo_speciale', 'badge_label', 'colore', 'attiva',
]

router.get('/promozioni', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    let query = supabase.from('risorse_promozioni')
      .select('*, risorse(nome, azienda_id)')
      .order('created_at', { ascending: false })

    if (isUUID(req.query.risorsa_id)) {
      query = query.eq('risorsa_id', req.query.risorsa_id)
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    // Filtra per azienda se non super_admin
    const filtered = profile.role === 'super_admin' ? data
      : data.filter(p => p.risorse?.azienda_id === profile.azienda_id)
    res.json(filtered)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/promozioni', requireAuth, async (req, res) => {
  try {
    if (!req.body.risorsa_id || !isUUID(req.body.risorsa_id))
      return res.status(400).json({ error: 'risorsa_id obbligatorio' })
    const payload = Object.fromEntries(Object.entries(req.body).filter(([k]) => PROMO_ALLOWED.includes(k)))
    const { data, error } = await supabase.from('risorse_promozioni')
      .insert({ ...payload, risorsa_id: req.body.risorsa_id }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/promozioni/:id', requireAuth, async (req, res) => {
  try {
    const payload = Object.fromEntries(Object.entries(req.body).filter(([k]) => PROMO_ALLOWED.includes(k)))
    const { data, error } = await supabase.from('risorse_promozioni').update(payload).eq('id', req.params.id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/promozioni/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('risorse_promozioni').delete().eq('id', req.params.id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Prenotazioni (admin) ─────────────────────────────────────────────────────

router.get('/prenotazioni', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    let query = supabase.from('prenotazioni')
      .select('*, risorse(nome, modalita, colore, entity_tipo, entity_id)')
      .order('data', { ascending: false })
      .order('ora_inizio', { ascending: true })

    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return res.json([])
      query = query.eq('azienda_id', profile.azienda_id)
    }
    if (isUUID(req.query.risorsa_id)) query = query.eq('risorsa_id', req.query.risorsa_id)
    if (req.query.data)               query = query.eq('data', req.query.data)
    if (req.query.stato)              query = query.eq('stato', req.query.stato)
    if (req.query.data_da)            query = query.gte('data', req.query.data_da)
    if (req.query.data_a)             query = query.lte('data', req.query.data_a)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/prenotazioni/:id', requireAuth, async (req, res) => {
  try {
    const allowed = ['stato', 'note_interne', 'n_persone']
    const payload = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
    payload.updated_at = new Date().toISOString()

    // Leggi prenotazione corrente per eventuale sync calendario
    const { data: prev } = await supabase.from('prenotazioni').select('*').eq('id', req.params.id).single()

    const { data, error } = await supabase.from('prenotazioni').update(payload).eq('id', req.params.id).select().single()
    if (error) return res.status(500).json({ error: error.message })

    // Sync Google Calendar: cancellata → rimuovi evento; confermata da in_attesa → crea evento
    if (prev && payload.stato) {
      if (payload.stato === 'cancellata' && prev.google_event_id) {
        syncBookingDelete(prev.azienda_id, prev.google_event_id)
      } else if (payload.stato === 'confermata' && prev.stato === 'in_attesa' && !prev.google_event_id) {
        const { data: risorsa } = await supabase.from('risorse').select('nome, durata_minuti').eq('id', prev.risorsa_id).single()
        syncBookingCreate(data, risorsa)
      }
    }

    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/prenotazioni/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('prenotazioni').delete().eq('id', req.params.id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Occupancy per calendario (admin) ────────────────────────────────────────
// Ritorna conteggio prenotazioni per ogni risorsa per ogni giorno del range

router.get('/occupancy', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    const { data_da, data_a } = req.query
    if (!data_da || !data_a) return res.status(400).json({ error: 'data_da e data_a obbligatori' })

    let query = supabase.from('prenotazioni')
      .select('risorsa_id, data, stato, n_persone')
      .gte('data', data_da)
      .lte('data', data_a)
      .in('stato', ['confermata', 'in_attesa'])

    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return res.json({})
      query = query.eq('azienda_id', profile.azienda_id)
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    // Aggrega: { risorsa_id: { data: { count, persone } } }
    const result = {}
    for (const b of data || []) {
      if (!result[b.risorsa_id]) result[b.risorsa_id] = {}
      if (!result[b.risorsa_id][b.data]) result[b.risorsa_id][b.data] = { count: 0, persone: 0 }
      result[b.risorsa_id][b.data].count++
      result[b.risorsa_id][b.data].persone += b.n_persone || 1
    }
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (no auth)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/booking/public/risorse/:entity_tipo/:entity_id
router.get('/public/risorse/:entity_tipo/:entity_id', async (req, res) => {
  try {
    const { entity_tipo, entity_id } = req.params
    if (!isUUID(entity_id)) return res.status(400).json({ error: 'entity_id non valido' })

    const { data, error } = await supabase.from('risorse')
      .select('id, nome, descrizione, modalita, durata_minuti, quantita, max_coperti, prezzo, valuta, colore, disponibilita, blocchi, anticipo_ore, cancellazione_ore, conferma_auto')
      .eq('entity_tipo', entity_tipo)
      .eq('entity_id', entity_id)
      .eq('attiva', true)
      .eq('visibile_minisito', true)
      .order('nome')

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/booking/public/disponibilita/:risorsa_id?data=YYYY-MM-DD
router.get('/public/disponibilita/:risorsa_id', async (req, res) => {
  try {
    const { risorsa_id } = req.params
    const { data: date } = req.query

    if (!isUUID(risorsa_id)) return res.status(400).json({ error: 'risorsa_id non valido' })
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'data non valida (YYYY-MM-DD)' })

    const { data: risorsa, error: re } = await supabase
      .from('risorse').select('*').eq('id', risorsa_id).eq('attiva', true).single()
    if (re || !risorsa) return res.status(404).json({ error: 'Risorsa non trovata' })

    const { data: promozioni } = await supabase
      .from('risorse_promozioni').select('*').eq('risorsa_id', risorsa_id).eq('attiva', true)

    const slots = risorsa.modalita === 'coperti'
      ? await calcolaCoperti(risorsa, date)
      : await calcolaSlotOrari(risorsa, promozioni || [], date)

    res.json({ risorsa_id, data: date, modalita: risorsa.modalita, slots })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/booking/public/prenota
router.post('/public/prenota', async (req, res) => {
  try {
    const {
      risorsa_id, data, ora_inizio, servizio,
      cliente_nome, cliente_email, cliente_telefono,
      n_persone, note_cliente, promozione_id,
    } = req.body

    if (!isUUID(risorsa_id)) return res.status(400).json({ error: 'risorsa_id non valido' })
    if (!data)          return res.status(400).json({ error: 'data obbligatoria' })
    if (!cliente_nome?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' })
    if (!cliente_email?.trim()) return res.status(400).json({ error: 'Email obbligatoria' })

    const { data: risorsa, error: re } = await supabase
      .from('risorse').select('*').eq('id', risorsa_id).eq('attiva', true).single()
    if (re || !risorsa) return res.status(404).json({ error: 'Risorsa non trovata o non attiva' })

    // Calcola ora_fine per slot
    let ora_fine = null
    if (risorsa.modalita === 'slot' && ora_inizio) {
      ora_fine = formatTime(parseTime(ora_inizio) + risorsa.durata_minuti)
    }

    // Prezzo finale (con eventuale promo)
    let prezzo_unitario = risorsa.prezzo
    if (isUUID(promozione_id)) {
      const { data: promo } = await supabase.from('risorse_promozioni')
        .select('prezzo_speciale').eq('id', promozione_id).eq('attiva', true).single()
      if (promo) prezzo_unitario = promo.prezzo_speciale
    }
    const persone = Math.max(1, parseInt(n_persone) || 1)
    const importo_totale = prezzo_unitario * persone

    const payload = {
      risorsa_id,
      azienda_id: risorsa.azienda_id,
      entity_tipo: risorsa.entity_tipo,
      entity_id: risorsa.entity_id,
      data,
      ora_inizio: ora_inizio || null,
      ora_fine,
      servizio: servizio || null,
      cliente_nome: cliente_nome.trim(),
      cliente_email: cliente_email.trim().toLowerCase(),
      cliente_telefono: cliente_telefono?.trim() || null,
      n_persone: persone,
      note_cliente: note_cliente?.trim() || null,
      stato: risorsa.conferma_auto ? 'confermata' : 'in_attesa',
      prezzo_unitario,
      importo_totale,
      promozione_id: isUUID(promozione_id) ? promozione_id : null,
    }

    const { data: prenotazione, error: pe } = await supabase
      .from('prenotazioni').insert(payload).select().single()
    if (pe) return res.status(500).json({ error: pe.message })

    // Email conferma + webhook + Google Calendar + automazioni (fire-and-forget)
    getEntityWhatsapp(risorsa.entity_tipo, risorsa.entity_id)
      .then(wa => inviaEmailConferma(prenotazione, risorsa, wa))
    syncBookingCreate(prenotazione, risorsa)
    sendWebhooks(prenotazione.azienda_id, 'nuova_prenotazione', {
      prenotazione_id: prenotazione.id,
      risorsa_id: prenotazione.risorsa_id,
      cliente_nome: prenotazione.cliente_nome,
      cliente_email: prenotazione.cliente_email,
      data: prenotazione.data,
      ora_inizio: prenotazione.ora_inizio,
      importo_totale: prenotazione.importo_totale,
    })

    const visitDatetime = prenotazione.data && prenotazione.ora_inizio
      ? new Date(`${prenotazione.data}T${prenotazione.ora_inizio}`).toISOString()
      : prenotazione.data ? new Date(`${prenotazione.data}T09:00:00`).toISOString() : null

    // Genera token recensione per {{link_recensione}} nel trigger post_visita
    let reviewLink = ''
    if (visitDatetime) {
      try {
        const { data: recData } = await supabase.from('recensioni').insert({
          azienda_id: prenotazione.azienda_id,
          entity_tipo: risorsa.entity_tipo,
          entity_id: risorsa.entity_id,
          autore: prenotazione.cliente_nome,
          stelle: 5, testo: '', fonte: 'form',
          verificata: false, pubblica: false,
        }).select('token').single()
        if (recData?.token) {
          reviewLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/recensione?token=${recData.token}`
        }
      } catch (e) { console.error('[booking] genera token recensione:', e.message) }
    }

    const autoVars = {
      nome: prenotazione.cliente_nome,
      email: prenotazione.cliente_email,
      data: new Date(prenotazione.data).toLocaleDateString('it-IT'),
      ora: prenotazione.ora_inizio || '',
      servizio: prenotazione.servizio || risorsa.nome || '',
      n_persone: String(prenotazione.n_persone || '1'),
      note: prenotazione.note_cliente || '',
      link_recensione: reviewLink,
      visit_datetime: visitDatetime,
      source_tipo: 'prenotazione',
      source_id: prenotazione.id,
    }
    const ctx = { azienda_id: prenotazione.azienda_id, entity_tipo: risorsa.entity_tipo, entity_id: risorsa.entity_id }
    triggerAutomazione('nuova_prenotazione', ctx, autoVars).catch(e => console.error('[auto] nuova_prenotazione:', e.message))
    if (visitDatetime) {
      triggerAutomazione('pre_visita',  ctx, autoVars).catch(e => console.error('[auto] pre_visita:', e.message))
      triggerAutomazione('post_visita', ctx, autoVars).catch(e => console.error('[auto] post_visita:', e.message))
    }

    res.status(201).json(prenotazione)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/booking/public/cancella?token=UUID
router.get('/public/cancella', async (req, res) => {
  try {
    const { token } = req.query
    if (!isUUID(token)) return res.status(400).json({ error: 'Token non valido' })

    const { data: pren, error } = await supabase
      .from('prenotazioni').select('*, risorse(nome, cancellazione_ore)')
      .eq('cancellation_token', token).single()

    if (error || !pren) return res.status(404).json({ error: 'Prenotazione non trovata' })
    if (pren.stato === 'cancellata') return res.status(400).json({ error: 'Già cancellata' })

    // Verifica policy cancellazione
    if (pren.ora_inizio) {
      const appuntamento = new Date(`${pren.data}T${pren.ora_inizio}`)
      const limite = new Date(appuntamento.getTime() - (pren.risorse?.cancellazione_ore || 24) * 3600000)
      if (new Date() > limite) {
        return res.status(400).json({ error: `Non è più possibile cancellare (limite ${pren.risorse?.cancellazione_ore || 24}h prima)` })
      }
    }

    await supabase.from('prenotazioni')
      .update({ stato: 'cancellata', updated_at: new Date().toISOString() })
      .eq('id', pren.id)

    res.json({ ok: true, messaggio: 'Prenotazione cancellata con successo' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
