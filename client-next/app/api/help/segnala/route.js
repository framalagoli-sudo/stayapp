import { requireAuth } from '@/lib/server-auth'
import { sendEmail } from '@/lib/send-email'
import { emailTemplate } from '@/lib/email-template'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { tipo, descrizione, email } = await request.json()
    if (!descrizione?.trim()) return Response.json({ error: 'Descrizione obbligatoria' }, { status: 400 })

    if (process.env.RESEND_API_KEY) {
      await sendEmail({ _ctx: 'segnalazione',
        to: 'fra.malagoli@gmail.com',
        subject: `[${tipo || 'Segnalazione'}] da ${email || 'utente sconosciuto'}`,
        html: emailTemplate({
          title: `Nuova segnalazione — ${tipo || 'Segnalazione'}`, entityName: 'OltreNova',
          rows: [
            { label: 'Da', value: email || '—' },
            { label: 'Tipo', value: tipo || '—' },
            { label: 'Messaggio', value: descrizione.trim().replace(/\n/g, '<br>') },
          ],
          appUrl: (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com',
        }),
        replyTo: email || undefined,
      })
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
