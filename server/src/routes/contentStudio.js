import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

const router = Router()

async function getAziendaId(userId) {
  const { data } = await supabase.from('profiles').select('azienda_id').eq('id', userId).single()
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
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '')
    throw new Error(`Claude API error: ${resp.status} — ${errBody}`)
  }
  const data = await resp.json()
  return data.content?.[0]?.text || ''
}

function parseJSON(text) {
  // Rimuove eventuali backtick/markdown fence residui
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const arrMatch = clean.match(/\[[\s\S]*\]/)
  const objMatch = clean.match(/\{[\s\S]*\}/)
  const raw = arrMatch?.[0] || objMatch?.[0]
  if (!raw) {
    console.error('[contentStudio] parseJSON — nessun JSON trovato. Raw:', text.slice(0, 500))
    throw new Error('Nessun JSON trovato nella risposta AI')
  }
  try {
    return JSON.parse(raw)
  } catch (e) {
    console.error('[contentStudio] parseJSON — JSON.parse fallito:', e.message, '— Raw:', raw.slice(0, 500))
    throw e
  }
}

// GET /api/content-studio/strategia
router.get('/strategia', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    const { data } = await supabase
      .from('aziende').select('content_strategy, ragione_sociale').eq('id', azienda_id).single()
    res.json({ strategy: data?.content_strategy || {}, nome: data?.ragione_sociale || '' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/content-studio/strategia
router.post('/strategia', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    const { tono, target, usp, piattaforme, tipo_business, nome_business } = req.body

    if (!target?.trim() || !usp?.trim()) {
      return res.status(400).json({ error: 'Target e USP sono obbligatori' })
    }

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
  "voice_tips": [
    "Consiglio concreto sul tono 1",
    "Consiglio concreto sul tono 2",
    "Consiglio concreto sul tono 3"
  ],
  "hashtag_base": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10"],
  "frequenza": { "instagram": 4, "facebook": 3, "linkedin": 1, "tiktok": 2, "google_business": 2 },
  "mix": { "Educational": 30, "Intrattenimento": 25, "Promozionale": 25, "Community": 20 }
}`

    const testo = await callClaude(prompt, 2500)
    let strategy
    try { strategy = parseJSON(testo) } catch {
      return res.status(500).json({ error: 'Risposta AI non valida, riprova' })
    }

    strategy.tono = tono
    strategy.target = target
    strategy.usp = usp
    strategy.piattaforme = piattaforme || []
    strategy.generato_il = new Date().toISOString().split('T')[0]

    await supabase.from('aziende').update({ content_strategy: strategy }).eq('id', azienda_id)
    res.json({ strategy })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/content-studio/strategia — salva manualmente senza AI
router.put('/strategia', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    const { pillar, voice_tips, hashtag_base, frequenza, mix, tono, target, usp, piattaforme } = req.body
    const strategy = {
      pillar: pillar || [],
      voice_tips: voice_tips || [],
      hashtag_base: hashtag_base || [],
      frequenza: frequenza || {},
      mix: mix || {},
      tono: tono || 'friendly',
      target: target || '',
      usp: usp || '',
      piattaforme: piattaforme || [],
      generato_il: new Date().toISOString().split('T')[0],
    }
    await supabase.from('aziende').update({ content_strategy: strategy }).eq('id', azienda_id)
    res.json({ strategy })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/content-studio/piano
router.post('/piano', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    const { mese, anno, crea_bozze } = req.body

    const mesePad = String(mese).padStart(2, '0')
    const dataInizio = `${anno}-${mesePad}-01`
    const dataFine = `${anno}-${mesePad}-31`

    const [{ data: az }, { data: eventi }, { data: prodotti }, { data: recensioni }] = await Promise.all([
      supabase.from('aziende').select('ragione_sociale, content_strategy').eq('id', azienda_id).single(),
      supabase.from('eventi').select('title, date_start, description')
        .eq('azienda_id', azienda_id)
        .gte('date_start', dataInizio).lte('date_start', dataFine).limit(8),
      supabase.from('prodotti').select('nome, descrizione')
        .eq('azienda_id', azienda_id).eq('attivo', true).limit(5),
      supabase.from('recensioni').select('stelle, testo')
        .eq('azienda_id', azienda_id).eq('pubblica', true).gte('stelle', 4)
        .order('created_at', { ascending: false }).limit(3),
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
Per gli eventi crea post di annuncio qualche giorno prima. Varia canali e pillar.
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
    try { posts = parseJSON(testo) } catch {
      return res.status(500).json({ error: 'Risposta AI non valida, riprova' })
    }

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
      await supabase.from('piano_editoriale').insert(bozze)
    }

    res.json({ posts, created: crea_bozze ? posts.length : 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/content-studio/caption
router.post('/caption', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    const { piattaforma, topic, contesto, pillar } = req.body

    if (!topic?.trim()) return res.status(400).json({ error: 'Inserisci un argomento per il post' })

    const { data: az } = await supabase
      .from('aziende').select('ragione_sociale, content_strategy').eq('id', azienda_id).single()
    const strategy = az?.content_strategy || {}

    const guide = {
      instagram: 'Hook forte nella prima riga, emoji moderate (2-4), testo coinvolgente, 5-8 hashtag misti (niche + popolari) in fondo',
      facebook: 'Tono conversazionale e caldo, può essere più lungo, termina con domanda per stimolare commenti, max 2-3 hashtag',
      linkedin: 'Professionale e autorevole, hook nella prima riga, usa a-capo per leggibilità, max 3 hashtag di settore, tono umano non corporate',
      tiktok: 'Breve e d\'impatto, prima riga = hook per fermare lo scroll, linguaggio diretto, 3-5 hashtag trending + specifici, CTA chiara',
      google_business: 'Informativo e locale, 150-300 caratteri, include nome zona/città, parole chiave del settore, invito a visitare o contattare',
    }

    const prompt = `Sei un copywriter esperto di social media marketing.

Business: ${az?.ragione_sociale}
Tono brand: ${strategy.tono || 'professionale ma friendly'}
Content Pillar: ${pillar || 'contenuto generale'}
Piattaforma: ${piattaforma}
Guida per questa piattaforma: ${guide[piattaforma] || ''}

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
    try { varianti = parseJSON(testo) } catch {
      return res.status(500).json({ error: 'Risposta AI non valida, riprova' })
    }

    res.json({ varianti })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/content-studio/gap
router.get('/gap', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    const today = new Date().toISOString().split('T')[0]
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    const ago30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const meseStart = today.slice(0, 7) + '-01'
    const meseEnd = today.slice(0, 7) + '-31'

    const [evRes, prRes, arRes, piRes] = await Promise.all([
      supabase.from('eventi').select('id, title, date_start, cover_url, price')
        .eq('azienda_id', azienda_id).gte('date_start', today).lte('date_start', in30)
        .order('date_start').limit(6),
      supabase.from('prodotti').select('id, nome, prezzo, immagini')
        .eq('azienda_id', azienda_id).eq('attivo', true)
        .order('created_at', { ascending: false }).limit(6),
      supabase.from('articoli').select('id, title, excerpt, cover_url, created_at')
        .eq('azienda_id', azienda_id).eq('published', true)
        .gte('created_at', ago30).order('created_at', { ascending: false }).limit(6),
      supabase.from('piano_editoriale').select('id')
        .eq('azienda_id', azienda_id)
        .gte('data_pianificata', meseStart).lte('data_pianificata', meseEnd),
    ])

    res.json({
      eventi: evRes.data || [],
      prodotti: prRes.data || [],
      articoli: arRes.data || [],
      piano_questo_mese: piRes.data?.length || 0,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
