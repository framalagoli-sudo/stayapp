import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// Public — no auth required. Called by the guest PWA via slug
router.get('/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('properties')
    .select('id, name, description, address, phone, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, cover_url, plan, modules, theme, services, gallery, restaurant, activities, excursions')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Struttura non trovata' })
  res.json(data)
})

export default router
