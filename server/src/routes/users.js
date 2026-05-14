import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

async function getCallerProfile(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

async function requireSuperAdmin(req, res) {
  const p = await getCallerProfile(req.user.id)
  if (p?.role !== 'super_admin') {
    res.status(403).json({ error: 'Solo super_admin può eseguire questa operazione' })
    return null
  }
  return p
}

async function requireAdminOrAbove(req, res) {
  const p = await getCallerProfile(req.user.id)
  if (!['super_admin', 'admin_azienda'].includes(p?.role)) {
    res.status(403).json({ error: 'Accesso non autorizzato' })
    return null
  }
  return p
}

// ── GET /api/users — lista utenti ────────────────────────────────────────────
// super_admin: tutti | admin_azienda: solo staff della propria azienda
router.get('/', async (req, res) => {
  const caller = await getCallerProfile(req.user.id)
  if (!caller) return res.status(403).json({ error: 'Profilo non trovato' })

  try {
    if (caller.role === 'super_admin') {
      const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      if (authErr) return res.status(500).json({ error: authErr.message })
      const { data: profiles } = await supabase.from('profiles').select('id, role, full_name, azienda_id, property_id, permissions')
      const { data: aziende } = await supabase.from('aziende').select('id, ragione_sociale')
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      const aziendaMap = Object.fromEntries((aziende || []).map(a => [a.id, a.ragione_sociale]))
      const users = authData.users.map(u => ({
        id: u.id, email: u.email, created_at: u.created_at,
        banned: !!u.banned_until, confirmed: !!u.email_confirmed_at, last_sign_in: u.last_sign_in_at,
        ...profileMap[u.id],
        azienda_name: aziendaMap[profileMap[u.id]?.azienda_id] || null,
      }))
      return res.json(users)
    }

    if (caller.role === 'admin_azienda') {
      if (!caller.azienda_id) return res.json([])
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, role, full_name, azienda_id, permissions')
        .eq('azienda_id', caller.azienda_id)
        .eq('role', 'staff')
      if (!profiles?.length) return res.json([])

      const ids = profiles.map(p => p.id)
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const authMap = Object.fromEntries((authData?.users || []).filter(u => ids.includes(u.id)).map(u => [u.id, u]))
      const users = profiles.map(p => ({
        id: p.id, role: p.role, full_name: p.full_name, azienda_id: p.azienda_id, permissions: p.permissions || {},
        email: authMap[p.id]?.email || null,
        banned: !!authMap[p.id]?.banned_until,
        confirmed: !!authMap[p.id]?.email_confirmed_at,
        last_sign_in: authMap[p.id]?.last_sign_in_at || null,
        invited: !authMap[p.id]?.email_confirmed_at,
      }))
      return res.json(users)
    }

    return res.status(403).json({ error: 'Accesso non autorizzato' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/users/invite — invita staff via email ──────────────────────────
router.post('/invite', async (req, res) => {
  const caller = await requireAdminOrAbove(req, res)
  if (!caller) return

  const { email, full_name, permissions = {} } = req.body
  if (!email?.trim()) return res.status(400).json({ error: 'Email obbligatoria' })

  const azienda_id = caller.role === 'super_admin' ? req.body.azienda_id : caller.azienda_id
  if (!azienda_id) return res.status(400).json({ error: 'azienda_id obbligatorio' })

  try {
    const redirectTo = `${process.env.CLIENT_URL || 'http://localhost:5173'}/admin`
    const { data, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email.trim(), {
      data: { full_name: full_name?.trim() || '' },
      redirectTo,
    })
    if (inviteErr) return res.status(400).json({ error: inviteErr.message })

    // Upsert profilo — gestisce sia il caso trigger già eseguito sia quello non ancora eseguito
    await new Promise(r => setTimeout(r, 400))
    await supabase.from('profiles').upsert({
      id: data.user.id,
      role: 'staff',
      azienda_id,
      full_name: full_name?.trim() || '',
      permissions,
    }, { onConflict: 'id' })

    res.status(201).json({
      id: data.user.id, email: data.user.email, role: 'staff',
      full_name: full_name?.trim() || '', azienda_id, permissions, invited: true,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/users — crea utente con password (solo super_admin) ─────────────
router.post('/', async (req, res) => {
  if (!await requireSuperAdmin(req, res)) return
  try {
    const { email, password, full_name, role = 'admin_azienda', azienda_id } = req.body
    if (!email?.trim()) return res.status(400).json({ error: 'Email obbligatoria' })
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password minimo 6 caratteri' })
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email.trim(), password, email_confirm: true, user_metadata: { full_name },
    })
    if (authErr) return res.status(400).json({ error: authErr.message })
    await new Promise(r => setTimeout(r, 600))
    await supabase.from('profiles').update({ role, azienda_id: azienda_id || null, full_name }).eq('id', authData.user.id)
    res.status(201).json({ id: authData.user.id, email: authData.user.email, role, azienda_id, full_name, banned: false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── PATCH /api/users/:id — aggiorna ruolo / permessi / ban ───────────────────
router.patch('/:id', async (req, res) => {
  const caller = await requireAdminOrAbove(req, res)
  if (!caller) return
  try {
    const { id } = req.params
    // admin_azienda può modificare solo i propri staff
    if (caller.role === 'admin_azienda') {
      const { data: target } = await supabase.from('profiles').select('azienda_id, role').eq('id', id).single()
      if (target?.azienda_id !== caller.azienda_id || target?.role !== 'staff') {
        return res.status(403).json({ error: 'Non puoi modificare questo utente' })
      }
    }

    const { role, azienda_id, full_name, banned, permissions } = req.body

    if (typeof banned === 'boolean') {
      const { error } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: banned ? '87600h' : 'none',
      })
      if (error) return res.status(500).json({ error: error.message })
    }

    const profileUpdates = {}
    if (role !== undefined && caller.role === 'super_admin') profileUpdates.role = role
    if (azienda_id !== undefined && caller.role === 'super_admin') profileUpdates.azienda_id = azienda_id || null
    if (full_name !== undefined)  profileUpdates.full_name = full_name
    if (permissions !== undefined) profileUpdates.permissions = permissions

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── DELETE /api/users/:id — elimina utente ───────────────────────────────────
router.delete('/:id', async (req, res) => {
  const caller = await requireAdminOrAbove(req, res)
  if (!caller) return
  try {
    if (caller.role === 'admin_azienda') {
      const { data: target } = await supabase.from('profiles').select('azienda_id, role').eq('id', req.params.id).single()
      if (target?.azienda_id !== caller.azienda_id || target?.role !== 'staff') {
        return res.status(403).json({ error: 'Non puoi eliminare questo utente' })
      }
    }
    const { error } = await supabase.auth.admin.deleteUser(req.params.id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
