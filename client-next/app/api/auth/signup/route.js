import { supabaseAdmin } from '@/lib/supabase-server'
import { Resend } from 'resend'

export async function POST(request) {
  try {
    const { data: cfg } = await supabaseAdmin.from('platform_config').select('signup_enabled').eq('id', 1).single()
    if (!cfg?.signup_enabled) return Response.json({ error: 'Le registrazioni sono temporaneamente chiuse.' }, { status: 403 })

    const { nome_azienda, email, password } = await request.json()
    if (!nome_azienda?.trim()) return Response.json({ error: 'Nome azienda obbligatorio' }, { status: 400 })
    if (!email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })
    if (!password || password.length < 8) return Response.json({ error: 'Password minimo 8 caratteri' }, { status: 400 })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(), password, email_confirm: true,
    })
    if (authError) {
      const msg = authError.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return Response.json({ error: 'Email già registrata. Prova ad accedere.' }, { status: 400 })
      }
      return Response.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString()

    const { data: az, error: azErr } = await supabaseAdmin.from('aziende').insert({
      ragione_sociale: nome_azienda.trim(),
      email: email.trim().toLowerCase(),
      moduli: { struttura: false, ristorante: false, attivita: false },
      piano: 'base', active: true, trial_ends_at: trialEndsAt, subscription_status: 'trial',
    }).select().single()
    if (azErr) { await supabaseAdmin.auth.admin.deleteUser(userId); return Response.json({ error: azErr.message }, { status: 500 }) }

    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      id: userId, role: 'admin_azienda', azienda_id: az.id, full_name: nome_azienda.trim(),
    })
    if (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('aziende').delete().eq('id', az.id)
      return Response.json({ error: profileErr.message }, { status: 500 })
    }

    if (process.env.RESEND_API_KEY) {
      const clientUrl = process.env.CLIENT_URL || 'https://oltrenova.com'
      new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
        to: email.trim().toLowerCase(),
        subject: 'Benvenuto in OltreNova!',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#1a1a2e;margin-top:0">Benvenuto in OltreNova!</h2>
          <p>Il tuo account per <strong>${nome_azienda.trim()}</strong> è pronto.</p>
          <p>Hai <strong>14 giorni di prova gratuita</strong> — senza carta di credito.</p>
          <div style="margin:24px 0"><a href="${clientUrl}/admin/onboarding" style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Completa il setup →</a></div>
        </div>`,
      }).catch(() => {})
    }
    return Response.json({ ok: true }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
