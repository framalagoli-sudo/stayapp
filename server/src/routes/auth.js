import { Router } from 'express'
import { Resend } from 'resend'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/forgot-password — genera link recovery e invia via Resend
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email?.trim()) return res.status(400).json({ error: 'Email obbligatoria' })

  try {
    const clientUrl = process.env.CLIENT_URL || 'https://oltrenova.com'

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim().toLowerCase(),
      options: { redirectTo: `${clientUrl}/admin/reset-password` },
    })
    if (error) return res.status(400).json({ error: error.message })

    const resetLink = data?.properties?.action_link
    if (!resetLink) return res.status(500).json({ error: 'Impossibile generare il link di ripristino' })

    // Verifica che il link punti al redirectTo corretto (se manca, Supabase ha ignorato il redirectTo)
    const expectedRedirect = encodeURIComponent(`${clientUrl}/admin/reset-password`)
    if (!resetLink.includes('/admin/reset-password') && !resetLink.includes(expectedRedirect)) {
      console.warn('[auth] ATTENZIONE: action_link non contiene /admin/reset-password — aggiungere URL alla whitelist Supabase Redirect URLs:', resetLink.substring(0, 120))
    }

    if (process.env.RESEND_API_KEY) {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
        to: email.trim().toLowerCase(),
        subject: 'Ripristino password OltreNova',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
            <h2 style="margin-top:0;margin-bottom:8px;font-size:22px">Ripristino password</h2>
            <p style="color:#666;margin-top:0;margin-bottom:24px;line-height:1.6">
              Hai richiesto di reimpostare la password del tuo account OltreNova.<br>
              Clicca il pulsante qui sotto per scegliere una nuova password.
            </p>
            <div style="margin:28px 0">
              <a href="${resetLink}"
                 style="display:inline-block;padding:13px 28px;background:#1a1a2e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                Scegli nuova password →
              </a>
            </div>
            <p style="color:#999;font-size:13px;line-height:1.6">
              Il link è valido per <strong>1 ora</strong> e può essere usato una sola volta.<br>
              Se non hai richiesto il ripristino, ignora questa email — il tuo account è al sicuro.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
            <p style="color:#bbb;font-size:12px;margin:0">OltreNova · noreply@oltrenova.com</p>
          </div>
        `,
      })
    }

    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/auth/reset-password — aggiorna password server-side (bypassa AAL2 per recovery)
router.post('/reset-password', async (req, res) => {
  const { password, access_token } = req.body
  if (!password || !access_token) return res.status(400).json({ error: 'Dati mancanti' })
  if (password.length < 8) return res.status(400).json({ error: 'Password minimo 8 caratteri' })

  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser(access_token)
    if (userErr || !user) return res.status(401).json({ error: 'Token non valido o scaduto' })

    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true })
    if (updateErr) return res.status(500).json({ error: updateErr.message })

    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, property_id, group_id, azienda_id, permissions')
    .eq('id', req.user.id)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/auth/signup-status — public, permette alla pagina /signup di verificare se le registrazioni sono aperte
router.get('/signup-status', async (req, res) => {
  try {
    const { data } = await supabase.from('platform_config').select('signup_enabled').eq('id', 1).single()
    res.json({ signup_enabled: data?.signup_enabled ?? false })
  } catch { res.json({ signup_enabled: false }) }
})

// POST /api/auth/signup — self-registration pubblica
router.post('/signup', async (req, res) => {
  try {
    // 1. Verifica che le registrazioni siano aperte
    const { data: cfg } = await supabase.from('platform_config').select('signup_enabled').eq('id', 1).single()
    if (!cfg?.signup_enabled) {
      return res.status(403).json({ error: 'Le registrazioni sono temporaneamente chiuse.' })
    }

    const { nome_azienda, email, password } = req.body
    if (!nome_azienda?.trim()) return res.status(400).json({ error: 'Nome azienda obbligatorio' })
    if (!email?.trim()) return res.status(400).json({ error: 'Email obbligatoria' })
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password minimo 8 caratteri' })

    // 2. Crea utente Supabase Auth (admin API, auto-conferma email)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    })
    if (authError) {
      const msg = authError.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already been registered')) {
        return res.status(400).json({ error: 'Email già registrata. Prova ad accedere.' })
      }
      return res.status(400).json({ error: authError.message })
    }

    const userId = authData.user.id
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString()

    // 3. Crea azienda
    const { data: az, error: azErr } = await supabase.from('aziende').insert({
      ragione_sociale: nome_azienda.trim(),
      email: email.trim().toLowerCase(),
      moduli: { struttura: false, ristorante: false, attivita: false },
      piano: 'base',
      active: true,
      trial_ends_at: trialEndsAt,
      subscription_status: 'trial',
    }).select().single()

    if (azErr) {
      await supabase.auth.admin.deleteUser(userId)
      return res.status(500).json({ error: azErr.message })
    }

    // 4. Crea profilo
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: userId,
      role: 'admin_azienda',
      azienda_id: az.id,
      full_name: nome_azienda.trim(),
    })

    if (profileErr) {
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('aziende').delete().eq('id', az.id)
      return res.status(500).json({ error: profileErr.message })
    }

    // 5. Email di benvenuto (fire-and-forget)
    if (process.env.RESEND_API_KEY) {
      const clientUrl = process.env.CLIENT_URL || 'https://oltrenova.com'
      new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
        to: email.trim().toLowerCase(),
        subject: 'Benvenuto in OltreNova!',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <h2 style="color:#1a1a2e;margin-top:0">Benvenuto in OltreNova!</h2>
            <p>Il tuo account per <strong>${nome_azienda.trim()}</strong> è pronto.</p>
            <p>Hai <strong>14 giorni di prova gratuita</strong> per esplorare tutte le funzionalità — senza inserire una carta di credito.</p>
            <div style="margin:24px 0">
              <a href="${clientUrl}/admin/onboarding"
                 style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
                Completa il setup →
              </a>
            </div>
            <p style="color:#999;font-size:13px">Hai bisogno di aiuto? Rispondi a questa email.</p>
          </div>
        `,
      }).catch(() => {})
    }

    res.status(201).json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/auth/platform-config — super_admin only
router.get('/platform-config', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', req.user.id).single()
    if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Solo super admin' })
    const { data, error } = await supabase.from('platform_config').select('*').eq('id', 1).single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || { signup_enabled: false })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PATCH /api/auth/platform-config — super_admin only
router.patch('/platform-config', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', req.user.id).single()
    if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Solo super admin' })
    const allowed = ['signup_enabled']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
    updates.updated_at = new Date().toISOString()
    const { data, error } = await supabase.from('platform_config')
      .upsert({ id: 1, ...updates }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
