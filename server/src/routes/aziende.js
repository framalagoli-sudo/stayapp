import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('role, azienda_id')
    .eq('id', userId)
    .single()
  return data
}

// GET /api/aziende
router.get('/', async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  let query = supabase.from('aziende').select('*').order('ragione_sociale')

  if (profile.role !== 'super_admin') {
    if (!profile.azienda_id) return res.json([])
    query = query.eq('id', profile.azienda_id)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/aziende/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('aziende').select('*').eq('id', req.params.id).single()
  if (error || !data) return res.status(404).json({ error: 'Azienda non trovata' })
  res.json(data)
})

// POST /api/aziende — solo super_admin
router.post('/', async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (profile?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin può creare aziende' })
    }

    const { ragione_sociale } = req.body
    if (!ragione_sociale?.trim()) {
      return res.status(400).json({ error: 'ragione_sociale è obbligatoria' })
    }

    const allowed = ['ragione_sociale', 'partita_iva', 'codice_fiscale', 'email', 'pec',
      'telefono', 'cellulare', 'indirizzo', 'citta', 'cap', 'provincia', 'piano', 'moduli']
    const body = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

    const { data, error } = await supabase.from('aziende').insert(body).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    console.error('POST /api/aziende error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// PATCH /api/aziende/:id
router.patch('/:id', async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    const isOwner = profile.azienda_id === req.params.id
    if (profile.role !== 'super_admin' && !isOwner) {
      return res.status(403).json({ error: 'Permessi insufficienti' })
    }

    const allowed = ['ragione_sociale', 'partita_iva', 'codice_fiscale', 'email', 'pec',
      'telefono', 'cellulare', 'indirizzo', 'citta', 'cap', 'provincia', 'piano', 'moduli', 'active']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' })
    }

    const { data, error } = await supabase
      .from('aziende')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// DELETE /api/aziende/:id — solo super_admin
router.delete('/:id', async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (profile?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Permessi insufficienti' })
  }

  const { error } = await supabase.from('aziende').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ── Gestione utente admin dell'azienda ────────────────────────────────────────

// GET /api/aziende/:id/utente — trova l'utente admin_azienda associato
router.get('/:id/utente', async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Accesso negato' })

  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('azienda_id', req.params.id)
      .eq('role', 'admin_azienda')
      .limit(1)

    if (!profiles?.length) return res.json(null)

    const { data: authUser, error } = await supabase.auth.admin.getUserById(profiles[0].id)
    if (error) return res.json(null)

    res.json({
      id: profiles[0].id,
      email: authUser.user?.email,
      full_name: profiles[0].full_name,
      last_sign_in: authUser.user?.last_sign_in_at,
      banned: !!authUser.user?.banned_until,
    })
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// POST /api/aziende/:id/utente — crea credenziali per l'azienda
router.post('/:id/utente', async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Accesso negato' })

  const { email, password, full_name } = req.body
  if (!email?.trim()) return res.status(400).json({ error: 'Email obbligatoria' })
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password minimo 6 caratteri' })

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim(), password, email_confirm: true,
      user_metadata: { full_name },
    })
    if (error) return res.status(400).json({ error: error.message })

    await new Promise(r => setTimeout(r, 600))

    await supabase.from('profiles')
      .update({ role: 'admin_azienda', azienda_id: req.params.id, full_name: full_name || null })
      .eq('id', data.user.id)

    res.status(201).json({ id: data.user.id, email: data.user.email, full_name, banned: false })
  } catch (err) {
    console.error('POST /api/aziende/:id/utente error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// PATCH /api/aziende/:id/utente/:uid — reset password o blocca/sblocca
router.patch('/:id/utente/:uid', async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Accesso negato' })

  const updates = {}
  if (req.body.password) updates.password = req.body.password
  if (typeof req.body.banned === 'boolean') {
    updates.ban_duration = req.body.banned ? '87600h' : 'none'
  }

  const { error } = await supabase.auth.admin.updateUserById(req.params.uid, updates)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// DELETE /api/aziende/:id/utente/:uid — revoca accesso
router.delete('/:id/utente/:uid', async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Accesso negato' })

  const { error } = await supabase.auth.admin.deleteUser(req.params.uid)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router
