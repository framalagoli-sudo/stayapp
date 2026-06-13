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

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const { mese, anno, crea_bozze } = await request.json()

    const mesePad = String(mese).padStart(2, '0')
    const dataInizio = `${anno}-${mesePad}-01`
    const dataFine = `${anno}-${mesePad}-31`

    const [{ data: az }, { data: eventi }, { data: prodotti }, { data: recensioni }] = await Promise.all([
      supabaseAdmin.from('aziende').select('ragione_sociale, content_strategy').eq('id', azienda_id).single(),
      supabaseAdmin.from('eventi').select('title, date_start, description')
        .eq('azienda_id', azienda_id).gte('date_start', dataInizio).lte('date_start', dataFine).limit(8),
      supabaseAdmin.from('prodotti').select('nome, descrizione').eq('azienda_id', azienda_id).eq('attivo', true).limit(5),
      supabaseAdmin.from('recensioni').select('stelle, testo').eq('azienda_id', azienda_id).eq('pubblica', true)
        .gte('stelle', 4).order('created_at', { ascending: false }).limit(3),
    ])

    const strategy = az?.content_strategy || {}
    const nomiMesi = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
    const pillarNames = (strategy.pillar || []).map(p => `${p.emoji || ''} ${p.nome}`).join(', ')

    const prompt = `Crea un piano editoriale per ${nomiMesi[mese]} ${anno}.

Business: ${az?.ragione_sociale}
Tono: ${strategy.tono || 'professionale ma friendly'}
Content Pillar: ${pillarNames || 'educational, promozionale, community, behind the scenes'}
Piattaforme da usare: ${(strategy.piattaforme || ['instagram', 'facebook']).join(', ')}

Contesto reale del mese:
- Eventi programmati: ${eventi?.length ? eventi.map(e => `"${e.title}" (${e.date_start})`).join('; ') : 'nessuno'}
- Prodotti/servizi attivi: ${prodotti?.length ? prodotti.map(p => p.nome).join(', ') : 'nessuno'}
- Recensioni positive recenti: ${recensioni?.length ? recensioni.map(r => `"${(r.testo || '').substring(0, 70)}"`).join(' | ') : 'nessuna'}

Genera SOLO un array JSON valido con 12-16 post distribuiti nel mese (3-4 a settimana).
[
  {
    "giorno": 2,
    "canale": "instagram",
    "pillar": "Nome pillar",
    "titolo": "Titolo interno breve",
    "testo": "Caption completa pronta da pubblicare con hashtag inclusi",
    "note_visive": "Suggerimento: quale foto/immagine usare"
  }
]`

    const testo = await callClaude(prompt, 3000)
    let posts
    try { posts = parseJSON(testo) } catch { return Response.json({ error: 'Risposta AI non valida, riprova' }, { status: 500 }) }

    if (crea_bozze && posts.length) {
      const bozze = posts.map(p => ({
        azienda_id,
        titolo: p.titolo,
        testo: p.testo,
        canali: [p.canale],
        stato: 'bozza',
        data_pianificata: `${anno}-${mesePad}-${String(Math.min(p.giorno, 28)).padStart(2, '0')}`,
        note: p.note_visive || '',
      }))
      await supabaseAdmin.from('piano_editoriale').insert(bozze)
    }

    return Response.json({ posts, created: crea_bozze ? posts.length : 0 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
