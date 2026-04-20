import { supabase } from '../lib/supabase.js'

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing token' })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' })

  req.user = data.user
  next()
}

export async function requireRole(roles) {
  return async (req, res, next) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single()

    if (!data || !roles.includes(data.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    req.profile = data
    next()
  }
}
