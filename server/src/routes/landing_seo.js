import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

async function assertSuperAdmin(userId) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'super_admin'
}

// GET /api/landing-seo — public
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('landing_seo').select('*').single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || {})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/landing-seo — super_admin only
router.patch('/', requireAuth, async (req, res) => {
  try {
    if (!await assertSuperAdmin(req.user.id)) return res.status(403).json({ error: 'Accesso negato' })

    const { data: existing } = await supabase.from('landing_seo').select('id').single()
    const payload = { ...req.body, updated_at: new Date().toISOString() }

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('landing_seo').update(payload).eq('id', existing.id).select().single()
      if (error) return res.status(500).json({ error: error.message })
      result = data
    } else {
      const { data, error } = await supabase
        .from('landing_seo').insert(payload).select().single()
      if (error) return res.status(500).json({ error: error.message })
      result = data
    }

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
