import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { fetchUnsplashCover } from '../lib/unsplash.js'

const router = express.Router()

async function callClaude(prompt, maxTokens = 500) {
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
      max_tokens: maxTokens,
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
  const { data } = await supabase.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id || null
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

// ─── Prompt factory per ogni tipo ────────────────────────────────────────────
const TIPO_PROMPTS = {
  blog_titolo: ({ tema, nome_business }) =>
    `Sei un copywriter esperto. Genera 1 titolo accattivante per un articolo di blog${nome_business ? ` per "${nome_business}"` : ''}.
Tema: ${tema}
Lingua: italiano
Rispondi SOLO con il titolo, senza virgolette o spiegazioni.`,

  blog_corpo: ({ tema, contesto, nome_business, tono }) =>
    `Sei un copywriter esperto. Scrivi il corpo di un articolo di blog${nome_business ? ` per "${nome_business}"` : ''}.
Titolo/tema: ${tema}${contesto ? `\nBrief: ${contesto}` : ''}
Tono: ${tono || 'professionale e coinvolgente'}
Lingua: italiano
Scrivi articolo completo con paragrafi. Solo il corpo, niente titoli extra o virgolette esterne.`,

  risposta_recensione: ({ tema, nome_business }) =>
    `Sei il responsabile di "${nome_business || 'un business'}". Scrivi una risposta professionale e cortese a questa recensione.
${tema}
Lingua: italiano. Tono: professionale, grato, personalizzato.
Scrivi SOLO il testo della risposta, senza prefissi o spiegazioni.`,

  email_corpo: ({ tema, contesto, nome_business, tono }) =>
    `Sei un email marketing specialist. Scrivi il corpo di una email automatica${nome_business ? ` per "${nome_business}"` : ''}.
Brief: ${tema}${contesto ? `\nVariabili disponibili: ${contesto}` : ''}
Tono: ${tono || 'amichevole e professionale'}
Lingua: italiano
Scrivi SOLO il corpo (no oggetto, no firma). Puoi usare {{nome}}, {{data}}, {{servizio}} ecc.`,

  preventivo_note: ({ tema, nome_business }) =>
    `Sei un professionista. Scrivi una nota introduttiva per un preventivo${nome_business ? ` per "${nome_business}"` : ''}.
Brief: ${tema}
Lingua: italiano
Scrivi 2-4 frasi per le note del preventivo. Solo il testo, niente virgolette.`,

  newsletter_oggetto: ({ tema, nome_business }) =>
    `Sei un email marketer esperto. Genera 1 oggetto email accattivante per una newsletter${nome_business ? ` di "${nome_business}"` : ''}.
Tema: ${tema}
Lingua: italiano. Max 60 caratteri. Rispondi SOLO con l'oggetto, senza virgolette.`,

  newsletter_corpo: ({ tema, contesto, nome_business, tono }) =>
    `Sei un copywriter esperto. Scrivi il corpo di una newsletter${nome_business ? ` per "${nome_business}"` : ''}.
Tema: ${tema}${contesto ? `\nDettagli: ${contesto}` : ''}
Tono: ${tono || 'coinvolgente e professionale'}
Lingua: italiano
Scrivi il testo della newsletter con paragrafi ben strutturati. Niente virgolette esterne.`,

  minisito_tagline: ({ tema, nome_business }) =>
    `Sei un copywriter esperto. Scrivi 1 tagline breve e memorabile${nome_business ? ` per "${nome_business}"` : ''}.
Brief: ${tema}
Lingua: italiano. Max 10 parole. Solo la tagline, senza virgolette.`,

  minisito_about: ({ tema, nome_business }) =>
    `Sei un copywriter esperto. Scrivi una sezione "Chi siamo" per il sito di "${nome_business || 'un business'}".
Brief: ${tema}
Lingua: italiano. 3-5 frasi coinvolgenti. Solo il testo, senza titoli o virgolette esterne.`,
}

// POST /api/ai/genera
router.post('/genera', requireAuth, async (req, res) => {
  try {
    const { tipo, tema, tono, contesto, nome_business } = req.body
    if (!tipo || !tema?.trim()) return res.status(400).json({ error: 'tipo e tema sono obbligatori' })
    if (!TIPO_PROMPTS[tipo]) return res.status(400).json({ error: `tipo non supportato: ${tipo}` })

    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(400).json({ error: 'Business non trovato' })

    const remaining = getRemainingCredits(azienda_id)
    if (remaining <= 0) {
      return res.status(429).json({ error: `Limite mensile raggiunto (${MONTHLY_LIMIT} generazioni/mese). Si rinnova il mese prossimo.` })
    }

    const prompt = TIPO_PROMPTS[tipo]({ tema, tono, contesto, nome_business })
    const maxTokens = ['blog_corpo', 'newsletter_corpo'].includes(tipo) ? 1500 : 400
    const testo = await callClaude(prompt, maxTokens)
    const leftAfter = consumeCredit(azienda_id)
    res.json({ testo, usage: { remaining: leftAfter, limit: MONTHLY_LIMIT } })
  } catch (e) {
    console.error('[AI genera]', e.message)
    res.status(500).json({ error: 'Errore durante la generazione AI. Riprova tra qualche secondo.' })
  }
})

// POST /api/ai/blog-auto — genera bozza articolo da contesto entità
router.post('/blog-auto', requireAuth, async (req, res) => {
  try {
    const { entity_tipo, entity_id, argomento } = req.body
    if (!entity_tipo || !entity_id) return res.status(400).json({ error: 'entity_tipo e entity_id obbligatori' })

    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(400).json({ error: 'Business non trovato' })

    const remaining = getRemainingCredits(azienda_id)
    if (remaining <= 0) {
      return res.status(429).json({ error: `Limite mensile raggiunto (${MONTHLY_LIMIT} generazioni/mese). Si rinnova il mese prossimo.` })
    }

    const tableMap = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
    const table = tableMap[entity_tipo]
    if (!table) return res.status(400).json({ error: 'entity_tipo non valido' })

    const { data: entity, error: entErr } = await supabase.from(table)
      .select('name, description, services, minisito')
      .eq('id', entity_id).single()
    if (entErr || !entity) return res.status(404).json({ error: 'Entità non trovata' })

    // Prossimi eventi per contesto
    const { data: eventi } = await supabase.from('eventi')
      .select('title, start_date')
      .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
      .gte('start_date', new Date().toISOString())
      .order('start_date').limit(4)

    const mini = entity.minisito || {}
    const services = Array.isArray(entity.services) ? entity.services.filter(s => s.name).slice(0, 8) : []
    const highlights = Array.isArray(mini.highlights) ? mini.highlights.slice(0, 5) : []

    let ctx = `Business: ${entity.name} (${entity_tipo})`
    if (entity.description) ctx += `\nDescrizione: ${entity.description}`
    if (services.length)     ctx += `\nServizi: ${services.map(s => s.name).join(', ')}`
    if (highlights.length)   ctx += `\nPunti di forza: ${highlights.map(h => h.text).join(', ')}`
    if (eventi?.length)      ctx += `\nEventi in programma: ${eventi.map(e => `${e.title} (${new Date(e.start_date).toLocaleDateString('it-IT')})`).join(', ')}`

    const topicLine = argomento?.trim() ? `\nArgomento richiesto: ${argomento.trim()}` : ''

    const prompt = `Sei un content writer esperto. Scrivi un articolo di blog in italiano per "${entity.name}".

Contesto:
${ctx}${topicLine}

Rispondi ESCLUSIVAMENTE con un oggetto JSON con questa struttura (nessun testo prima o dopo):
{
  "title": "Titolo accattivante SEO (max 80 caratteri)",
  "excerpt": "Breve introduzione (1-2 frasi, max 180 caratteri)",
  "content": "Corpo completo in HTML semplice (usa p, h2, h3, ul, li, strong — min 350 parole)"
}`

    const raw = await callClaude(prompt, 2500)

    let parsed
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match ? match[0] : raw)
    } catch {
      return res.status(500).json({ error: 'Risposta AI non parsabile. Riprova.' })
    }
    if (!parsed.title?.trim() || !parsed.content?.trim()) {
      return res.status(500).json({ error: 'Risposta AI incompleta. Riprova.' })
    }

    function slugify(str) {
      return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }
    let slug = slugify(parsed.title) || `articolo-ai-${Date.now().toString(36)}`
    const { count } = await supabase.from('articoli').select('id', { count: 'exact', head: true }).like('slug', `${slug}%`)
    if (count > 0) slug = `${slug}-${Date.now().toString(36)}`

    const cover_url = await fetchUnsplashCover(parsed.title)

    const { data: articolo, error: artErr } = await supabase.from('articoli').insert({
      azienda_id, slug,
      title: parsed.title.trim(),
      excerpt: parsed.excerpt?.trim() || null,
      content: parsed.content,
      cover_url: cover_url || null,
      author: 'AI',
      entity_tipo,
      entity_id,
      published: false,
    }).select('id, title, slug').single()

    if (artErr) return res.status(500).json({ error: artErr.message })

    const leftAfter = consumeCredit(azienda_id)
    res.status(201).json({ ...articolo, usage: { remaining: leftAfter, limit: MONTHLY_LIMIT } })
  } catch (e) {
    console.error('[AI blog-auto]', e.message)
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
