import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id
}

async function callClaude(prompt, maxTokens = 800) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
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
  const arrMatch = clean.match(/\[[\s\S]*\]/)
  const objMatch = clean.match(/\{[\s\S]*\}/)
  const raw = arrMatch?.[0] || objMatch?.[0]
  if (!raw) throw new Error('Nessun JSON trovato nella risposta AI')
  return JSON.parse(raw)
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const { data } = await supabaseAdmin.from('aziende').select('content_strategy, ragione_sociale').eq('id', azienda_id).single()
    return Response.json({ strategy: data?.content_strategy || {}, nome: data?.ragione_sociale || '' })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const { tono, target, usp, piattaforme, tipo_business, nome_business } = await request.json()
    if (!target?.trim() || !usp?.trim()) return Response.json({ error: 'Target e USP sono obbligatori' }, { status: 400 })

    const prompt = `Sei un esperto di content marketing per piccoli business locali e online.
Crea una strategia editoriale social personalizzata per:
- Nome business: ${nome_business}
- Tipo: ${tipo_business || 'business di servizi'}
- Tono desiderato: ${tono}
- Target clienti: ${target}
- Punto di forza unico (USP): ${usp}
- Piattaforme usate: ${(piattaforme || []).join(', ')}

Rispondi SOLO con JSON valido, senza testo aggiuntivo prima o dopo:
{
  "pillar": [
    { "id": "1", "nome": "...", "descrizione": "Cosa pubblicare: esempi concreti", "emoji": "..." },
    { "id": "2", "nome": "...", "descrizione": "...", "emoji": "..." },
    { "id": "3", "nome": "...", "descrizione": "...", "emoji": "..." },
    { "id": "4", "nome": "...", "descrizione": "...", "emoji": "..." },
    { "id": "5", "nome": "...", "descrizione": "...", "emoji": "..." }
  ],
  "voice_tips": ["Consiglio 1","Consiglio 2","Consiglio 3"],
  "hashtag_base": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10"],
  "frequenza": { "instagram": 4, "facebook": 3, "linkedin": 1, "tiktok": 2, "google_business": 2 },
  "mix": { "Educational": 30, "Intrattenimento": 25, "Promozionale": 25, "Community": 20 }
}`

    const testo = await callClaude(prompt, 2500)
    let strategy
    try { strategy = parseJSON(testo) } catch { return Response.json({ error: 'Risposta AI non valida, riprova' }, { status: 500 }) }

    strategy.tono = tono; strategy.target = target; strategy.usp = usp
    strategy.piattaforme = piattaforme || []
    strategy.generato_il = new Date().toISOString().split('T')[0]

    await supabaseAdmin.from('aziende').update({ content_strategy: strategy }).eq('id', azienda_id)
    return Response.json({ strategy })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PUT(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const { pillar, voice_tips, hashtag_base, frequenza, mix, tono, target, usp, piattaforme } = await request.json()
    const strategy = {
      pillar: pillar || [], voice_tips: voice_tips || [], hashtag_base: hashtag_base || [],
      frequenza: frequenza || {}, mix: mix || {},
      tono: tono || 'friendly', target: target || '', usp: usp || '',
      piattaforme: piattaforme || [],
      generato_il: new Date().toISOString().split('T')[0],
    }
    await supabaseAdmin.from('aziende').update({ content_strategy: strategy }).eq('id', azienda_id)
    return Response.json({ strategy })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
