import { supabaseAdmin } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

const DAY_KEYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

function parseTime(str) {
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
    if (p.data_fine && date > p.data_fine) continue
    if (p.giorni_settimana?.length && !p.giorni_settimana.includes(dayOfWeek)) continue
    if (p.ora_inizio) {
      if (slotMin < parseTime(p.ora_inizio) || slotMin >= parseTime(p.ora_fine)) continue
    }
    return { id: p.id, nome: p.nome, prezzo: p.prezzo_speciale, badge: p.badge_label, colore: p.colore }
  }
  return null
}

async function calcolaSlotOrari(risorsa, promozioni, date) {
  if (isDateBlocked(risorsa.blocchi, date)) return []
  const dayKey = DAY_KEYS[new Date(date + 'T12:00:00').getDay()]
  const windows = risorsa.disponibilita[dayKey] || []
  if (!windows.length) return []

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

  const { data: bookings } = await supabaseAdmin.from('prenotazioni')
    .select('ora_inizio')
    .eq('risorsa_id', risorsa.id)
    .eq('data', date)
    .in('stato', ['confermata', 'in_attesa'])

  const occupancy = {}
  for (const b of bookings || []) {
    const k = b.ora_inizio?.slice(0, 5)
    occupancy[k] = (occupancy[k] || 0) + 1
  }

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

async function calcolaCoperti(risorsa, date) {
  const disp = risorsa.disponibilita || {}
  const giorniChiusura = disp.giorni_chiusura || []
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()
  if (isDateBlocked(risorsa.blocchi, date)) return []
  if (giorniChiusura.includes(dayOfWeek)) return []

  const servizi = disp.servizi || []
  if (!servizi.length) return []

  const { data: bookings } = await supabaseAdmin.from('prenotazioni')
    .select('servizio, ora_inizio, n_persone')
    .eq('risorsa_id', risorsa.id)
    .eq('data', date)
    .in('stato', ['confermata', 'in_attesa'])

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
        result.push({ servizio: srv.nome, ora: orario, disponibili, totale: risorsa.max_coperti, prezzo: risorsa.prezzo })
      }
    }
  }
  return result
}

export async function GET(request, { params }) {
  try {
    const { risorsaId } = params
    if (!isUUID(risorsaId)) return Response.json({ error: 'risorsa_id non valido' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('data')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return Response.json({ error: 'data non valida (YYYY-MM-DD)' }, { status: 400 })

    const { data: risorsa, error: re } = await supabaseAdmin.from('risorse')
      .select('*').eq('id', risorsaId).eq('attiva', true).single()
    if (re || !risorsa) return Response.json({ error: 'Risorsa non trovata' }, { status: 404 })

    const { data: promozioni } = await supabaseAdmin.from('risorse_promozioni')
      .select('*').eq('risorsa_id', risorsaId).eq('attiva', true)

    const slots = risorsa.modalita === 'coperti'
      ? await calcolaCoperti(risorsa, date)
      : await calcolaSlotOrari(risorsa, promozioni || [], date)

    return Response.json({ risorsa_id: risorsaId, data: date, modalita: risorsa.modalita, slots })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
