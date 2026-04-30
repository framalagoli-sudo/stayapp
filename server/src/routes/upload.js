import { Router } from 'express'
import multer from 'multer'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB hard cap
})

router.use(requireAuth)

async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('property_id, role')
    .eq('id', userId)
    .single()
  return data
}

async function handleUpload(req, res, dbField) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })

    const profile = await getProfile(req.user.id)
    if (!profile?.property_id) {
      return res.status(403).json({ error: 'Struttura non associata al profilo' })
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const storagePath = `${profile.property_id}/${dbField}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('property-media')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      })
    if (uploadError) return res.status(500).json({ error: uploadError.message })

    const { data } = supabase.storage.from('property-media').getPublicUrl(storagePath)
    // cache-buster so the browser always loads the freshly uploaded file
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`

    const { error: dbError } = await supabase
      .from('properties')
      .update({ [dbField]: publicUrl })
      .eq('id', profile.property_id)
    if (dbError) return res.status(500).json({ error: dbError.message })

    res.json({ url: publicUrl })
  } catch (err) {
    console.error(`Upload error [${dbField}]:`, err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
}

async function handleDelete(req, res, dbField) {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.property_id) {
      return res.status(403).json({ error: 'Struttura non associata al profilo' })
    }

    // Read current URL to extract storage path for deletion
    const { data: prop } = await supabase
      .from('properties')
      .select(dbField)
      .eq('id', profile.property_id)
      .single()

    const currentUrl = prop?.[dbField]
    if (currentUrl) {
      const marker = '/property-media/'
      const idx = currentUrl.indexOf(marker)
      if (idx !== -1) {
        const storagePath = currentUrl.slice(idx + marker.length).split('?')[0]
        await supabase.storage.from('property-media').remove([storagePath])
      }
    }

    await supabase
      .from('properties')
      .update({ [dbField]: null })
      .eq('id', profile.property_id)

    res.json({ success: true })
  } catch (err) {
    console.error(`Delete error [${dbField}]:`, err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
}

// Gallery: upload only (no DB update — client manages the array via PATCH /properties)
router.post('/gallery', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err)
      return res.status(400).json({ error: `Errore file: ${err.message}` })
    }
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })

    const profile = await getProfile(req.user.id)
    if (!profile?.property_id) return res.status(403).json({ error: 'Struttura non associata' })

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const storagePath = `${profile.property_id}/gallery-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('property-media')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
    if (uploadError) return res.status(500).json({ error: uploadError.message })

    const { data } = supabase.storage.from('property-media').getPublicUrl(storagePath)
    res.json({ url: `${data.publicUrl}?v=${Date.now()}` })
  } catch (err) {
    console.error('Gallery upload error:', err)
    res.status(500).json({ error: err.message || 'Errore interno del server' })
  }
})

router.post('/logo',  upload.single('file'), (req, res) => handleUpload(req, res, 'logo_url'))
router.post('/cover', upload.single('file'), (req, res) => handleUpload(req, res, 'cover_url'))

router.delete('/logo',  (req, res) => handleDelete(req, res, 'logo_url'))
router.delete('/cover', (req, res) => handleDelete(req, res, 'cover_url'))

// ── Ristorante uploads ─────────────────────────────────────────────────────

async function getRistoranteAccess(userId, ristoranteId) {
  const { data: profile } = await supabase
    .from('profiles').select('role, azienda_id').eq('id', userId).single()
  if (!profile) return null
  if (profile.role === 'super_admin') return profile
  const { data: rist } = await supabase
    .from('ristoranti').select('azienda_id').eq('id', ristoranteId).single()
  if (!rist || rist.azienda_id !== profile.azienda_id) return null
  return profile
}

async function handleRistoranteUpload(req, res, dbField) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })
    const { ristorante_id } = req.query
    if (!ristorante_id) return res.status(400).json({ error: 'ristorante_id obbligatorio' })

    const access = await getRistoranteAccess(req.user.id, ristorante_id)
    if (!access) return res.status(403).json({ error: 'Accesso negato' })

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const storagePath = `ristoranti/${ristorante_id}/${dbField}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('property-media')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
    if (uploadError) return res.status(500).json({ error: uploadError.message })

    const { data } = supabase.storage.from('property-media').getPublicUrl(storagePath)
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`

    const { error: dbError } = await supabase
      .from('ristoranti').update({ [dbField]: publicUrl }).eq('id', ristorante_id)
    if (dbError) return res.status(500).json({ error: dbError.message })

    res.json({ url: publicUrl })
  } catch (err) {
    console.error(`Ristorante upload error [${dbField}]:`, err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
}

router.post('/restaurant-logo',  upload.single('file'), (req, res) => handleRistoranteUpload(req, res, 'logo_url'))
router.post('/restaurant-cover', upload.single('file'), (req, res) => handleRistoranteUpload(req, res, 'cover_url'))

router.post('/restaurant-gallery', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: `Errore file: ${err.message}` })
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })
    const { ristorante_id } = req.query
    if (!ristorante_id) return res.status(400).json({ error: 'ristorante_id obbligatorio' })

    const access = await getRistoranteAccess(req.user.id, ristorante_id)
    if (!access) return res.status(403).json({ error: 'Accesso negato' })

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const storagePath = `ristoranti/${ristorante_id}/gallery-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('property-media')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
    if (uploadError) return res.status(500).json({ error: uploadError.message })

    const { data } = supabase.storage.from('property-media').getPublicUrl(storagePath)
    res.json({ url: `${data.publicUrl}?v=${Date.now()}` })
  } catch (err) {
    console.error('Restaurant gallery upload error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// POST /api/upload/event-cover?evento_id=xxx
router.post('/event-cover', (req, res, next) => {
  upload.single('file')(req, res, err => {
    if (err) return res.status(400).json({ error: `Errore file: ${err.message}` })
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })
    const { evento_id } = req.query
    if (!evento_id) return res.status(400).json({ error: 'evento_id obbligatorio' })

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const storagePath = `eventi/${evento_id}/cover-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('property-media')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
    if (uploadError) return res.status(500).json({ error: uploadError.message })

    const { data } = supabase.storage.from('property-media').getPublicUrl(storagePath)
    const url = `${data.publicUrl}?v=${Date.now()}`

    await supabase.from('eventi').update({ cover_url: url, updated_at: new Date().toISOString() }).eq('id', evento_id)
    res.json({ url })
  } catch (err) {
    console.error('Event cover upload error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// POST /api/upload/blog-cover — cover articolo (solo URL, nessun aggiornamento DB)
router.post('/blog-cover', (req, res, next) => {
  upload.single('file')(req, res, err => {
    if (err) return res.status(400).json({ error: `Errore file: ${err.message}` })
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })
    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const storagePath = `blog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('property-media')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
    if (uploadError) return res.status(500).json({ error: uploadError.message })
    const { data } = supabase.storage.from('property-media').getPublicUrl(storagePath)
    res.json({ url: `${data.publicUrl}?v=${Date.now()}` })
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// ── Attività uploads ───────────────────────────────────────────────────────

async function handleAttivitaUpload(req, res, dbField) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })
    const { attivita_id } = req.query
    if (!attivita_id) return res.status(400).json({ error: 'attivita_id obbligatorio' })

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const storagePath = `attivita/${attivita_id}/${dbField}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('property-media')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
    if (uploadError) return res.status(500).json({ error: uploadError.message })

    const { data } = supabase.storage.from('property-media').getPublicUrl(storagePath)
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`

    const { error: dbError } = await supabase
      .from('attivita').update({ [dbField]: publicUrl }).eq('id', attivita_id)
    if (dbError) return res.status(500).json({ error: dbError.message })

    res.json({ url: publicUrl })
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' })
  }
}

router.post('/attivita-logo',  upload.single('file'), (req, res) => handleAttivitaUpload(req, res, 'logo_url'))
router.post('/attivita-cover', upload.single('file'), (req, res) => handleAttivitaUpload(req, res, 'cover_url'))

router.post('/attivita-gallery', (req, res, next) => {
  upload.single('file')(req, res, err => {
    if (err) return res.status(400).json({ error: `Errore file: ${err.message}` })
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })
    const { attivita_id } = req.query
    if (!attivita_id) return res.status(400).json({ error: 'attivita_id obbligatorio' })

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const storagePath = `attivita/${attivita_id}/gallery-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('property-media')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
    if (uploadError) return res.status(500).json({ error: uploadError.message })

    const { data } = supabase.storage.from('property-media').getPublicUrl(storagePath)
    res.json({ url: `${data.publicUrl}?v=${Date.now()}` })
  } catch {
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// POST /api/upload/minisito-image?entity_type=struttura|ristorante|attivita&entity_id=xxx
// Upload-only: no DB update, caller saves the URL in minisito jsonb
router.post('/minisito-image', (req, res, next) => {
  upload.single('file')(req, res, err => {
    if (err) return res.status(400).json({ error: `Errore file: ${err.message}` })
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })
    const { entity_type, entity_id } = req.query
    if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type e entity_id obbligatori' })

    const { data: profile } = await supabase.from('profiles').select('role, property_id, azienda_id').eq('id', req.user.id).single()
    if (!profile) return res.status(403).json({ error: 'Accesso negato' })

    if (entity_type === 'struttura') {
      if (profile.role !== 'super_admin' && profile.property_id !== entity_id)
        return res.status(403).json({ error: 'Accesso negato' })
    } else if (entity_type === 'ristorante') {
      const { data: rist } = await supabase.from('ristoranti').select('azienda_id').eq('id', entity_id).single()
      if (!rist || (profile.role !== 'super_admin' && rist.azienda_id !== profile.azienda_id))
        return res.status(403).json({ error: 'Accesso negato' })
    } else if (entity_type === 'attivita') {
      const { data: att } = await supabase.from('attivita').select('azienda_id').eq('id', entity_id).single()
      if (!att || (profile.role !== 'super_admin' && att.azienda_id !== profile.azienda_id))
        return res.status(403).json({ error: 'Accesso negato' })
    } else {
      return res.status(400).json({ error: 'entity_type non valido' })
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const storagePath = `${entity_type}/${entity_id}/minisito-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('property-media')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
    if (uploadError) return res.status(500).json({ error: uploadError.message })

    const { data } = supabase.storage.from('property-media').getPublicUrl(storagePath)
    res.json({ url: `${data.publicUrl}?v=${Date.now()}` })
  } catch (err) {
    console.error('Minisito image upload error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

export default router
