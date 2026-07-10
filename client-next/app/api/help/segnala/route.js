import { requireAuth } from '@/lib/server-auth'
import { sendEmail } from '@/lib/send-email'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { tipo, descrizione, email } = await request.json()
    if (!descrizione?.trim()) return Response.json({ error: 'Descrizione obbligatoria' }, { status: 400 })

    if (process.env.RESEND_API_KEY) {
      await sendEmail({ _ctx: 'segnalazione',
        from: (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>',
        to: 'fra.malagoli@gmail.com',
        subject: `[${tipo || 'Segnalazione'}] da ${email || 'utente sconosciuto'}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a2e">
            <h2 style="margin-top:0">Nuova segnalazione — ${tipo || 'Segnalazione'}</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr><td style="padding:8px 0;color:#888;font-size:13px;width:100px">Da</td><td style="padding:8px 0;font-size:14px">${email || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#888;font-size:13px">Tipo</td><td style="padding:8px 0;font-size:14px">${tipo || '—'}</td></tr>
            </table>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;font-size:14px;line-height:1.7;white-space:pre-wrap">${descrizione.trim()}</div>
          </div>
        `,
        replyTo: email || undefined,
      })
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
