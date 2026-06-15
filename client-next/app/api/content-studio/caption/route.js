import { supabaseAdmin } from '@/lib/supabase-server'

export const maxDuration = 60
import { requireAuth } from '@/lib/server-auth'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id
}

async function callClaude(prompt, maxTokens = 800) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': (process.env.ANTHROPIC_API_KEY ?? '').trim(),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: 'Rispondi SEMPRE e SOLO con JSON valido, senza markdown, senza backtick, senza testo prima o dopo.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!resp.ok) throw new Error(`Claude API error: ${resp.status}`)
  const data = await resp.json()
  return data.content?.[0]?.text || ''
}

function parseJSON(text) {
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const raw = (clean.match(/\[[\s\S]*\]/) || clean.match(/\{[\s\S]*\}/))?.[0]
  if (!raw) throw new Error('Nessun JSON trovato')
  return JSON.parse(raw)
}

const GUIDE = {
  instagram: 'Hook forte nella prima riga, emoji moderate (2-4), testo coinvolgente, 5-8 hashtag misti in fondo',
  facebook: 'Tono conversazionale e caldo, può essere più lungo, termina con domanda per stimolare commenti, max 2-3 hashtag',
  linkedin: 'Professionale e autorevole, hook nella prima riga, usa a-capo per leggibilità, max 3 hashtag di settore',
  tiktok: 'Breve e d\'impatto, prima riga = hook per fermare lo scroll, linguaggio diretto, 3-5 hashtag trending + specifici',
  google_business: 'Informativo e locale, 150-300 caratteri, include nome zona/città, parole chiave del settore',
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const { piattaforma, topic, contesto, pillar } = await request.json()
    if (!topic?.trim()) return Response.json({ error: 'Inserisci un argomento per il post' }, { status: 400 })

    const { data: az } = await supabaseAdmin.from('aziende').select('ragione_sociale, content_strategy').eq('id', azienda_id).single()
    const strategy = az?.content_strategy || {}

    const prompt = `Sei un copywriter esperto di social media marketing.

Business: ${az?.ragione_sociale}
Tono brand: ${strategy.tono || 'professionale ma friendly'}
Content Pillar: ${pillar || 'contenuto generale'}
Piattaforma: ${piattaforma}
Guida per questa piattaforma: ${GUIDE[piattaforma] || ''}

Argomento del post: ${topic}
${contesto ? `Dettagli/contesto: ${contesto}` : ''}

Genera ESATTAMENTE 3 varianti di caption, ognuna con stile diverso.
Rispondi SOLO con JSON valido:
[
  { "variante": 1, "stile": "Diretta & Informativa", "testo": "caption completa", "hashtag": ["#tag1","#tag2","#tag3","#tag4","#tag5"] },
  { "variante": 2, "stile": "Narrativa & Storytelling", "testo": "caption completa", "hashtag": ["#tag1","#tag2","#tag3","#tag4","#tag5"] },
  { "variante": 3, "stile": "Engagement & Domanda", "testo": "caption completa", "hashtag": ["#tag1","#tag2","#tag3","#tag4","#tag5"] }
]`

    const testo = await callClaude(prompt, 1200)
    let varianti
    try { varianti = parseJSON(testo) } catch { return Response.json({ error: 'Risposta AI non valida, riprova' }, { status: 500 }) }
    return Response.json({ varianti })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
