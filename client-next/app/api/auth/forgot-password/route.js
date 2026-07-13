import { supabaseAdmin } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/send-email'
import { platformEmailTemplate } from '@/lib/email-template'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'

export async function POST(request) {
  try {
    const ip = getClientIp(request)
    // Anti mail-bombing: max 3 richieste di reset per IP all'ora.
    const rl = await rateLimit(request, { name: 'forgot-password', limit: 3, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

    const { email, turnstileToken } = await request.json()
    if (!email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })

    const captcha = await verifyTurnstile(turnstileToken, ip)
    if (!captcha.success) return Response.json({ error: 'Verifica anti-bot fallita' }, { status: 403 })

    const clientUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim().toLowerCase(),
      options: { redirectTo: `${clientUrl}/admin/reset-password` },
    })
    // Anti account-enumeration: non rivelare MAI se l'email esiste. Su qualsiasi
    // esito (email inesistente, errore) rispondiamo ok:true e logghiamo lato server.
    if (error) { console.warn('[forgot-password] generateLink:', error.message); return Response.json({ ok: true }) }

    const resetLink = data?.properties?.action_link
    if (!resetLink) { console.warn('[forgot-password] nessun action_link'); return Response.json({ ok: true }) }

    if (process.env.RESEND_API_KEY) {
      await sendEmail({ _ctx: 'reset-password',
        to: email.trim().toLowerCase(),
        subject: 'Ripristino password OltreNova',
        html: platformEmailTemplate({
          title: 'Ripristino password',
          intro: 'Hai richiesto di reimpostare la password del tuo account OltreNova. Clicca il pulsante per scegliere una nuova password.',
          ctaText: 'Scegli nuova password →', ctaUrl: resetLink,
          footerNote: 'Il link è valido per <strong>1 ora</strong> e può essere usato una sola volta. Se non hai richiesto il ripristino, ignora questa email.',
        }),
      })
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
