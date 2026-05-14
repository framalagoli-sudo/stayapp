import { supabase } from '../lib/supabase.js'

const REDACTED_KEYS = ['password', 'token', 'secret', 'key', 'authorization']

function sanitize(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body ?? null
  const out = { ...body }
  for (const k of Object.keys(out)) {
    if (REDACTED_KEYS.some(r => k.toLowerCase().includes(r))) out[k] = '[REDACTED]'
  }
  return out
}

function extractEntity(path) {
  const match = path.match(/\/api\/([^/?]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)
  if (match) return { entity_tipo: match[1], entity_id: match[2] }
  const segment = path.split('/').filter(Boolean)[1]
  return { entity_tipo: segment || null, entity_id: null }
}

export function auditLog(req, res, next) {
  if (!['PATCH', 'DELETE', 'POST'].includes(req.method)) return next()
  // Solo PATCH e DELETE su percorsi admin (non guest, non auth)
  const isAdminPath = req.path.startsWith('/api/') &&
    !req.path.startsWith('/api/guest') &&
    !req.path.startsWith('/api/auth') &&
    !req.path.startsWith('/api/public') &&
    !req.path.startsWith('/api/demo') &&
    req.method !== 'POST' // POST già loggato altrove, focus su modifiche
  const isDeleteOrPatch = ['PATCH', 'DELETE'].includes(req.method)
  if (!isDeleteOrPatch) return next()

  res.on('finish', () => {
    if (!req.user || res.statusCode >= 400) return
    const { entity_tipo, entity_id } = extractEntity(req.originalUrl)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || null
    supabase.from('audit_log').insert({
      user_id:     req.user.id,
      user_email:  req.user.email,
      method:      req.method,
      path:        req.originalUrl,
      entity_tipo,
      entity_id,
      payload:     sanitize(req.body),
      ip,
      status_code: res.statusCode,
    }).then(({ error }) => {
      if (error) console.error('[audit]', error.message)
    })
  })
  next()
}
