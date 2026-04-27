import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toUuid(v) { return (v && UUID_RE.test(v)) ? v : null }

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

// ── Pubblico ───────────────────────────────────────────────────────────────

// GET /api/blog/public?azienda_id=&category_id=&entity_tipo=&entity_id=&limit=
router.get('/public', async (req, res) => {
  const { azienda_id, category_id, entity_tipo, entity_id, limit = 20 } = req.query
  let q = supabase.from('articoli')
    .select('id, title, slug, excerpt, cover_url, author, published_at, category_id, entity_tipo, entity_id')
    .eq('published', true).eq('active', true)
    .order('published_at', { ascending: false })
    .limit(parseInt(limit))
  if (azienda_id) q = q.eq('azienda_id', azienda_id)
  if (category_id) q = q.eq('category_id', category_id)
  if (entity_tipo) q = q.eq('entity_tipo', entity_tipo)
  if (entity_id) q = q.eq('entity_id', entity_id)
  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// GET /api/blog/public/:slug
router.get('/public/:slug', async (req, res) => {
  const { data, error } = await supabase.from('articoli')
    .select('id, title, slug, excerpt, content, cover_url, author, published_at, category_id, entity_tipo, entity_id, azienda_id')
    .eq('slug', req.params.slug)
    .eq('published', true).eq('active', true)
    .single()
  if (error || !data) return res.status(404).json({ error: 'Articolo non trovato' })
  res.json(data)
})

// ── Categorie (auth) ───────────────────────────────────────────────────────

// GET /api/blog/categories?azienda_id=
router.get('/categories', requireAuth, async (req, res) => {
  const { azienda_id } = req.query
  let q = supabase.from('blog_categories').select('*').order('name')
  if (azienda_id) q = q.eq('azienda_id', azienda_id)
  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// POST /api/blog/categories
router.post('/categories', requireAuth, async (req, res) => {
  const { azienda_id, name, description } = req.body
  if (!azienda_id || !name?.trim()) return res.status(400).json({ error: 'azienda_id e name obbligatori' })
  const slug = slugify(name) || `cat-${Date.now().toString(36)}`
  const { data, error } = await supabase.from('blog_categories')
    .insert({ azienda_id, name: name.trim(), slug, description: description || null })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// PATCH /api/blog/categories/:id
router.patch('/categories/:id', requireAuth, async (req, res) => {
  const { name, description } = req.body
  const updates = {}
  if (name?.trim()) { updates.name = name.trim(); updates.slug = slugify(name) }
  if (description !== undefined) updates.description = description
  const { data, error } = await supabase.from('blog_categories').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/blog/categories/:id
router.delete('/categories/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('blog_categories').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ── Articoli admin (auth) ──────────────────────────────────────────────────

// GET /api/blog — lista admin
router.get('/', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  let q = supabase.from('articoli')
    .select('id, title, slug, excerpt, cover_url, published, published_at, created_at, category_id, entity_tipo, entity_id, author, active')
    .order('created_at', { ascending: false })

  if (profile.role !== 'super_admin') {
    if (!profile.azienda_id) return res.json([])
    q = q.eq('azienda_id', profile.azienda_id)
  } else if (req.query.azienda_id) {
    q = q.eq('azienda_id', req.query.azienda_id)
  }

  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// GET /api/blog/:id — singolo (admin)
router.get('/:id', requireAuth, async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'ID non valido' })
  const { data, error } = await supabase.from('articoli').select('*').eq('id', req.params.id).single()
  if (error || !data) return res.status(404).json({ error: 'Non trovato' })
  res.json(data)
})

// POST /api/blog — crea articolo
router.post('/', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.id)
  const { title, excerpt, content, cover_url, author, category_id, entity_tipo, entity_id, published } = req.body
  const azienda_id = req.body.azienda_id || profile?.azienda_id
  if (!azienda_id || !title?.trim()) return res.status(400).json({ error: 'azienda_id e title obbligatori' })

  let slug = slugify(title) || `articolo-${Date.now().toString(36)}`
  const { count } = await supabase.from('articoli').select('id', { count: 'exact', head: true }).like('slug', `${slug}%`)
  if (count > 0) slug = `${slug}-${Date.now().toString(36)}`

  const now = new Date().toISOString()
  const { data, error } = await supabase.from('articoli').insert({
    azienda_id, slug, title: title.trim(),
    excerpt: excerpt || null, content: content || null,
    cover_url: cover_url || null, author: author || null,
    category_id: toUuid(category_id),
    entity_tipo: entity_tipo || null, entity_id: toUuid(entity_id),
    published: !!published, published_at: published ? now : null,
  }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// PATCH /api/blog/:id — aggiorna articolo
router.patch('/:id', requireAuth, async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'ID articolo non valido' })

  const allowed = ['title', 'excerpt', 'content', 'cover_url', 'author',
    'category_id', 'entity_tipo', 'entity_id', 'published', 'active']
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  // Normalizza campi UUID: stringa vuota o "undefined" → null
  if ('category_id' in updates) updates.category_id = toUuid(updates.category_id)
  if ('entity_id'   in updates) updates.entity_id   = toUuid(updates.entity_id)

  if (updates.published === true) {
    const { data: cur } = await supabase.from('articoli').select('published_at').eq('id', req.params.id).single()
    if (!cur?.published_at) updates.published_at = new Date().toISOString()
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('articoli').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/blog/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('articoli').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router
