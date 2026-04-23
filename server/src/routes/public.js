import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// POST /api/public/register — registrazione autonoma azienda (landing page futura)
// Non richiede autenticazione. L'azienda viene creata in stato non attivo
// e deve essere approvata dal super_admin (o auto-approvata con piano trial).
router.post('/register', async (req, res) => {
  try {
    const { ragione_sociale, email, password } = req.body
    if (!ragione_sociale?.trim()) return res.status(400).json({ error: 'Ragione sociale obbligatoria' })
    if (!email?.trim())           return res.status(400).json({ error: 'Email obbligatoria' })
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password minimo 8 caratteri' })

    // Crea utente Supabase Auth (con conferma email)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true, // in produzione: false → invia email di conferma
    })
    if (authErr) return res.status(400).json({ error: authErr.message })

    // Crea azienda (non attiva fino ad approvazione super_admin)
    const { data: az, error: azErr } = await supabase
      .from('aziende')
      .insert({
        ragione_sociale: ragione_sociale.trim(),
        email: email.trim(),
        moduli: { struttura: false, ristorante: false },
        piano: 'base',
        active: false, // richiede attivazione manuale dal super_admin
      })
      .select().single()

    if (azErr) {
      // Rollback: elimina l'utente creato
      await supabase.auth.admin.deleteUser(authData.user.id)
      return res.status(500).json({ error: azErr.message })
    }

    // Attendi trigger profilo
    await new Promise(r => setTimeout(r, 600))

    // Collega profilo all'azienda
    await supabase.from('profiles').update({
      role: 'admin_azienda',
      azienda_id: az.id,
      full_name: ragione_sociale.trim(),
    }).eq('id', authData.user.id)

    res.status(201).json({
      message: 'Registrazione completata. Il tuo account è in attesa di attivazione.',
      azienda_id: az.id,
    })
  } catch (err) {
    console.error('POST /api/public/register error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

export default router
