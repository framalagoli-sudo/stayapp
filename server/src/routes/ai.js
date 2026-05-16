import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

const router = express.Router()

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurata su Railway')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Anthropic API error ${res.status}`)
  }
  const data = await res.json()
  return data.content[0].text.trim()
}

const MONTHLY_LIMIT = parseInt(process.env.AI_MONTHLY_LIMIT || '20')
// in-memory: azienda_id -> { count, month }
const usageMap = new Map()

function currentMonth() { return new Date().toISOString().slice(0, 7) }

function getRemainingCredits(azienda_id) {
  const month = currentMonth()
  const rec = usageMap.get(azienda_id)
  if (!rec || rec.month !== month) return MONTHLY_LIMIT
  return Math.max(0, MONTHLY_LIMIT - rec.count)
}

function consumeCredit(azienda_id) {
  const month = currentMonth()
  const rec = usageMap.get(azienda_id)
  const count = (!rec || rec.month !== month) ? 1 : rec.count + 1
  usageMap.set(azienda_id, { count, month })
  return MONTHLY_LIMIT - count
}

const CHANNEL_RULES = {
  instagram:       'Instagram: emoji appropriate sparse nel testo, 150-280 caratteri, 10-15 hashtag rilevanti alla fine',
  facebook:        'Facebook: testo coinvolgente 100-200 caratteri, call to action finale, max 3 hashtag',
  linkedin:        'LinkedIn: tono professionale e autorevole, 200-350 caratteri, max 3 hashtag, no emoji eccessive',
  tiktok:          'TikTok: tono giovane e diretto, 80-130 caratteri, hook d\'impatto nelle prime parole, trending',
  x:               'X (Twitter): max 250 caratteri, incisivo e diretto, max 2 hashtag',
  google_business: 'Google Business: informativo e locale, 100-150 caratteri, tono professionale, no hashtag',
}

async function getAziendaId(userId) {
  const { data: profile } = await supabase
    .from('profiles').select('property_id').eq('id', userId).single()
  if (!profile?.property_id) return null
  const { data: prop } = await supabase
    .from('properties').select('azienda_id').eq('id', profile.property_id).single()
  return prop?.azienda_id || null
}

// POST /api/ai/social-post
router.post('/social-post', requireAuth, async (req, res) => {
  try {
    const { tema, tono = 'amichevole', nome_business, canale } = req.body
    if (!tema?.trim() || !canale) return res.status(400).json({ error: 'tema e canale sono obbligatori' })

    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(400).json({ error: 'Business non trovato' })

    const remaining = getRemainingCredits(azienda_id)
    if (remaining <= 0) {
      return res.status(429).json({ error: `Limite mensile raggiunto (${MONTHLY_LIMIT} generazioni/mese). Si rinnova il mese prossimo.` })
    }

    const channelRule = CHANNEL_RULES[canale] || `${canale}: adatta la lunghezza e il tono al canale`
    const businessCtx = nome_business ? `per "${nome_business}"` : ''

    const prompt = `Sei un esperto di social media marketing. Scrivi un post ${businessCtx}.

Canale — ${channelRule}
Tema/brief: ${tema}
Tono: ${tono}
Lingua: italiano

Scrivi SOLO il testo del post, senza titoli, introduzioni, virgolette esterne o spiegazioni aggiuntive.`

    const testo = await callClaude(prompt)
    const leftAfter = consumeCredit(azienda_id)
    res.json({ testo, usage: { remaining: leftAfter, limit: MONTHLY_LIMIT } })
  } catch (e) {
    console.error('[AI social-post]', e.message)
    res.status(500).json({ error: 'Errore durante la generazione AI. Riprova tra qualche secondo.' })
  }
})

// GET /api/ai/usage
router.get('/usage', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.json({ remaining: MONTHLY_LIMIT, limit: MONTHLY_LIMIT })
    res.json({ remaining: getRemainingCredits(azienda_id), limit: MONTHLY_LIMIT })
  } catch (e) {
    res.json({ remaining: MONTHLY_LIMIT, limit: MONTHLY_LIMIT })
  }
})

export default router
