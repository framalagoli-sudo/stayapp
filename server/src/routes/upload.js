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
router.post('/gallery', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })
    const profile = await getProfile(req.user.id)
    if (!profile?.property_id) return res.status(403).json({ error: 'Struttura non associata' })

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const path = `${profile.property_id}/gallery-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('property-media')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: false })
    if (error) return res.status(500).json({ error: error.message })
    const { data } = supabase.storage.from('property-media').getPublicUrl(path)
    res.json({ url: `${data.publicUrl}?v=${Date.now()}` })
  } catch (err) {
    console.error('Gallery upload error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

router.post('/logo',  upload.single('file'), (req, res) => handleUpload(req, res, 'logo_url'))
router.post('/cover', upload.single('file'), (req, res) => handleUpload(req, res, 'cover_url'))

router.delete('/logo',  (req, res) => handleDelete(req, res, 'logo_url'))
router.delete('/cover', (req, res) => handleDelete(req, res, 'cover_url'))

export default router
