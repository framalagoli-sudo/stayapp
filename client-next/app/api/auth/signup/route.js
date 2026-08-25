import { supabaseAdmin } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/send-email'
import { platformEmailTemplate } from '@/lib/email-template'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'

export async function POST(request) {
  try {
    // Ogni registrazione crea un utente, un'azienda e spedisce un'email
    // all'indirizzo indicato: senza limite si riempie il database e si bombarda
    // una casella altrui (i suffissi `+etichetta` valgono come indirizzi diversi
    // ma arrivano tutti nella stessa). Oggi la porta è chiusa da `signup_enabled`,
    // ma resterà aperta quando partirà l'onboarding self-serve.
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'signup', limit: 3, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

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

    // `upsert`, non `insert`: alla creazione dell'utente un trigger del database
    // ha già scritto una riga in `profiles` con ruolo `staff` e nessuna azienda.
    // Con `insert` la chiave duplicata faceva fallire la registrazione — e il
    // rollback qui sotto cancellava utente e azienda, quindi nessuno riusciva a
    // iscriversi. Misurato il 25/08/2026 percorrendo il flusso da capo.
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId, role: 'admin_azienda', azienda_id: az.id, full_name: nome_azienda.trim(),
    }, { onConflict: 'id' })
    if (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('aziende').delete().eq('id', az.id)
      return Response.json({ error: profileErr.message }, { status: 500 })
    }

    if (process.env.RESEND_API_KEY) {
      const clientUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
      sendEmail({ _ctx: 'signup',
        to: email.trim().toLowerCase(),
        subject: 'Benvenuto in OltreNova!',
        html: platformEmailTemplate({
          title: 'Benvenuto in OltreNova!',
          intro: `Il tuo account per <strong>${nome_azienda.trim()}</strong> è pronto. Hai <strong>14 giorni di prova gratuita</strong> — senza carta di credito.`,
          ctaText: 'Completa il setup →', ctaUrl: `${clientUrl}/admin/onboarding`,
        }),
      }).catch(() => {})
    }
    return Response.json({ ok: true }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
