import { supabaseAdmin } from '@/lib/supabase-server'
import { Resend } from 'resend'

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })

    const clientUrl = process.env.CLIENT_URL || 'https://oltrenova.com'
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim().toLowerCase(),
      options: { redirectTo: `${clientUrl}/admin/reset-password` },
    })
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const resetLink = data?.properties?.action_link
    if (!resetLink) return Response.json({ error: 'Impossibile generare il link di ripristino' }, { status: 500 })

    if (process.env.RESEND_API_KEY) {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
        to: email.trim().toLowerCase(),
        subject: 'Ripristino password OltreNova',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
          <h2 style="margin-top:0;margin-bottom:8px;font-size:22px">Ripristino password</h2>
          <p style="color:#666;margin-top:0;margin-bottom:24px;line-height:1.6">Hai richiesto di reimpostare la password del tuo account OltreNova.<br>Clicca il pulsante qui sotto per scegliere una nuova password.</p>
          <div style="margin:28px 0"><a href="${resetLink}" style="display:inline-block;padding:13px 28px;background:#1a1a2e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Scegli nuova password →</a></div>
          <p style="color:#999;font-size:13px;line-height:1.6">Il link è valido per <strong>1 ora</strong> e può essere usato una sola volta.<br>Se non hai richiesto il ripristino, ignora questa email.</p>
        </div>`,
      })
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
