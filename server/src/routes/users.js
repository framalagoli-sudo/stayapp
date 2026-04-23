import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

async function requireSuperAdmin(req, res) {
  const { data } = await supabase.from('profiles').select('role').eq('id', req.user.id).single()
  if (data?.role !== 'super_admin') {
    res.status(403).json({ error: 'Solo super_admin può gestire gli utenti' })
    return false
  }
  return true
}

// GET /api/users — lista utenti con profili
router.get('/', async (req, res) => {
  if (!await requireSuperAdmin(req, res)) return

  try {
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (authErr) return res.status(500).json({ error: authErr.message })

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, full_name, azienda_id, property_id')

    const { data: aziende } = await supabase.from('aziende').select('id, ragione_sociale')

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    const aziendaMap = Object.fromEntries((aziende || []).map(a => [a.id, a.ragione_sociale]))

    const users = authData.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      banned: !!u.banned_until,
      confirmed: !!u.email_confirmed_at,
      last_sign_in: u.last_sign_in_at,
      ...profileMap[u.id],
      azienda_name: aziendaMap[profileMap[u.id]?.azienda_id] || null,
    }))

    res.json(users)
  } catch (err) {
    console.error('GET /api/users error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// POST /api/users — crea nuovo utente
router.post('/', async (req, res) => {
  if (!await requireSuperAdmin(req, res)) return

  try {
    const { email, password, full_name, role = 'admin_azienda', azienda_id } = req.body
    if (!email?.trim()) return res.status(400).json({ error: 'Email obbligatoria' })
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password minimo 6 caratteri' })

    // Crea utente in Supabase Auth (email già confermata, nessuna email inviata)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })
    if (authErr) return res.status(400).json({ error: authErr.message })

    // Attendi il trigger che crea il profilo
    await new Promise(r => setTimeout(r, 600))

    // Aggiorna il profilo con ruolo e azienda
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ role, azienda_id: azienda_id || null, full_name })
      .eq('id', authData.user.id)

    if (profileErr) console.error('Profile update error:', profileErr)

    res.status(201).json({
      id: authData.user.id,
      email: authData.user.email,
      role,
      azienda_id,
      full_name,
      banned: false,
    })
  } catch (err) {
    console.error('POST /api/users error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// PATCH /api/users/:id — modifica profilo / blocca / sblocca
router.patch('/:id', async (req, res) => {
  if (!await requireSuperAdmin(req, res)) return

  try {
    const { id } = req.params
    const { role, azienda_id, full_name, banned } = req.body

    // Aggiorna autenticazione (ban)
    if (typeof banned === 'boolean') {
      const { error } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: banned ? '87600h' : 'none',
      })
      if (error) return res.status(500).json({ error: error.message })
    }

    // Aggiorna profilo
    const profileUpdates = {}
    if (role !== undefined)       profileUpdates.role = role
    if (azienda_id !== undefined) profileUpdates.azienda_id = azienda_id || null
    if (full_name !== undefined)  profileUpdates.full_name = full_name

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/users/:id error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// DELETE /api/users/:id — elimina utente (cascade su profile via FK)
router.delete('/:id', async (req, res) => {
  if (!await requireSuperAdmin(req, res)) return

  try {
    const { error } = await supabase.auth.admin.deleteUser(req.params.id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

export default router
