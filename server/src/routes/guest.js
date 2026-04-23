import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/guest/:slug — struttura (public)
router.get('/:slug', async (req, res) => {
  if (req.params.slug === 'r') return // handled by /r/:slug below

  const { data, error } = await supabase
    .from('properties')
    .select('id, name, description, address, phone, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, cover_url, plan, modules, theme, services, gallery, restaurant, activities, excursions')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Struttura non trovata' })
  res.json(data)
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
  res.json(data)
})

export default router
