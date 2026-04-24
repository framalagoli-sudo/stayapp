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

// GET /api/guest/:slug — struttura (public)
router.get('/:slug', async (req, res) => {
  if (req.params.slug === 'r') return

  const { data, error } = await supabase
    .from('properties')
    .select('id, name, description, address, phone, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, cover_url, plan, modules, theme, services, gallery, restaurant, activities, excursions')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Struttura non trovata' })

  const collegamenti = await getCollegamenti('struttura', data.id)
  res.json({ ...data, collegamenti })
})

// GET /api/guest/r/:slug — ristorante (public)
router.get('/r/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('ristoranti')
    .select('id, name, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, menu')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Ristorante non trovato' })

  const collegamenti = await getCollegamenti('ristorante', data.id)
  res.json({ ...data, collegamenti })
})

export default router
