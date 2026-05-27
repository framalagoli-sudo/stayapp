import { Router } from 'express'
import { Resend } from 'resend'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.post('/segnala', async (req, res) => {
  const { tipo, descrizione, email } = req.body
  if (!descrizione?.trim()) return res.status(400).json({ error: 'Descrizione obbligatoria' })

  try {
    if (process.env.RESEND_API_KEY) {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
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
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
