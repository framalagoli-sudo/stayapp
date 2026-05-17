import { Router } from 'express'
import { Resend } from 'resend'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

const router = Router()
const resend = new Resend(process.env.RESEND_API_KEY)

async function getAziendaId(userId) {
  const { data } = await supabase.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id
}

// ── Admin: lista risposte compilate ──────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    const { data } = await supabase.from('survey_risposte')
      .select('*')
      .eq('azienda_id', azienda_id)
      .not('compilato_at', 'is', null)
      .order('compilato_at', { ascending: false })
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Admin: invia survey via email ─────────────────────────────────────────────
router.post('/invia', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    const { email, nome } = req.body
    if (!email?.trim()) return res.status(400).json({ error: 'Email obbligatoria' })

    const { data: az } = await supabase
      .from('aziende').select('ragione_sociale').eq('id', azienda_id).single()

    const { data: survey, error } = await supabase.from('survey_risposte')
      .insert({ azienda_id, nome_cliente: nome || '', email_cliente: email.trim() })
      .select().single()
    if (error) throw error

    const link = `${process.env.CLIENT_URL}/survey?token=${survey.token}`
    const nomeDisplay = nome?.trim() || 'Cliente'
    const business = az?.ragione_sociale || 'il nostro team'

    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email.trim(),
      subject: `Come valuteresti la tua esperienza con ${business}?`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a2e;">
          <h2 style="margin:0 0 16px;font-size:22px;">Ciao ${nomeDisplay}!</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Quanto saresti propenso a raccomandare <strong>${business}</strong> a un amico o collega?
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${link}" style="background:#1a1a2e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
              Lascia il tuo feedback →
            </a>
          </div>
          <p style="color:#aaa;font-size:12px;text-align:center;">Ci vogliono meno di 30 secondi.</p>
        </div>`,
    })

    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Pubblico: leggi survey da token ──────────────────────────────────────────
router.get('/public', async (req, res) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ error: 'Token mancante' })
    const { data } = await supabase.from('survey_risposte')
      .select('nome_cliente, compilato_at, azienda_id')
      .eq('token', token).single()
    if (!data) return res.status(404).json({ error: 'Survey non trovata' })

    const { data: az } = await supabase
      .from('aziende').select('ragione_sociale').eq('id', data.azienda_id).single()

    res.json({
      nome: data.nome_cliente,
      compilata: !!data.compilato_at,
      business: az?.ragione_sociale || '',
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Pubblico: salva risposta ──────────────────────────────────────────────────
router.post('/public', async (req, res) => {
  try {
    const { token, nps_score, commento } = req.body
    if (!token) return res.status(400).json({ error: 'Token mancante' })
    if (nps_score === undefined || nps_score === null) return res.status(400).json({ error: 'Punteggio obbligatorio' })

    const { data, error } = await supabase.from('survey_risposte')
      .update({ nps_score, commento: commento || '', compilato_at: new Date().toISOString() })
      .eq('token', token)
      .is('compilato_at', null)
      .select().single()

    if (error || !data) return res.status(400).json({ error: 'Survey non valida o già compilata' })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
