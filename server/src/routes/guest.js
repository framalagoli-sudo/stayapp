import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

async function getCollegamenti(tipo, id) {
  const { data: links } = await supabase
    .from('collegamenti')
    .select('*')
    .or(`and(from_tipo.eq.${tipo},from_id.eq.${id}),and(to_tipo.eq.${tipo},to_id.eq.${id})`)

  if (!links?.length) return []

  const result = []
  for (const link of links) {
    const isFrom = link.from_tipo === tipo && link.from_id === id
    const otherTipo = isFrom ? link.to_tipo : link.from_tipo
    const otherId   = isFrom ? link.to_id   : link.from_id

    let entity = null
    if (otherTipo === 'struttura') {
      const { data } = await supabase.from('properties')
        .select('id, name, slug, logo_url, cover_url, description')
        .eq('id', otherId).eq('active', true).single()
      entity = data
    } else if (otherTipo === 'ristorante') {
      const { data } = await supabase.from('ristoranti')
        .select('id, name, slug, logo_url, cover_url, description, schedule')
        .eq('id', otherId).eq('active', true).single()
      entity = data
    }
    if (entity) result.push({ tipo: otherTipo, ...entity })
  }
  return result
}

// GET /api/guest/r/:slug — ristorante (public)
router.get('/r/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('ristoranti')
    .select('id, name, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, menu, modules, minisito')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Ristorante non trovato' })

  const collegamenti = await getCollegamenti('ristorante', data.id)
  res.json({ ...data, collegamenti })
})

// GET /api/guest/eventi?entity_tipo=struttura&entity_id=xxx — eventi pubblici
router.get('/eventi', async (req, res) => {
  const { entity_tipo, entity_id } = req.query
  let query = supabase
    .from('eventi')
    .select('id, slug, title, description, cover_url, date_start, date_end, location, price, seats_total, seats_booked, packages')
    .eq('published', true)
    .eq('active', true)
    .gte('date_start', new Date().toISOString())
    .order('date_start')

  if (entity_tipo && entity_id) {
    query = query.eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// POST /api/guest/eventi/:id/book — crea prenotazione (pubblico)
router.post('/eventi/:id/book', async (req, res) => {
  const { guest_name, guest_email, guest_phone, package_id, seats, notes } = req.body
  if (!guest_name?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' })
  if (!guest_email?.trim()) return res.status(400).json({ error: 'Email obbligatoria' })

  const { data: evento, error: evErr } = await supabase
    .from('eventi').select('id, seats_total, seats_booked, packages, price').eq('id', req.params.id).single()
  if (evErr || !evento) return res.status(404).json({ error: 'Evento non trovato' })

  const reqSeats = parseInt(seats) || 1
  if (evento.seats_total && (evento.seats_booked + reqSeats) > evento.seats_total)
    return res.status(400).json({ error: 'Posti non disponibili' })

  // Calcola importo totale
  let price = evento.price || 0
  if (package_id) {
    const pkg = (evento.packages || []).find(p => p.id === package_id)
    if (pkg) price = pkg.price || 0
  }
  const total_amount = price * reqSeats

  const { data, error } = await supabase.from('event_bookings').insert({
    event_id: req.params.id, guest_name, guest_email,
    guest_phone: guest_phone || null, package_id: package_id || null,
    seats: reqSeats, total_amount, notes: notes || null, status: 'pending',
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// GET /api/guest/:slug — struttura (public) — DEVE stare per ultima (catch-all)
router.get('/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('properties')
    .select('id, name, description, address, phone, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, cover_url, plan, modules, theme, services, gallery, restaurant, activities, excursions, minisito')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Struttura non trovata' })

  const collegamenti = await getCollegamenti('struttura', data.id)
  res.json({ ...data, collegamenti })
})

export default router
