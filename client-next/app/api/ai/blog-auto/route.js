import { requireAuth } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { callClaude, getRemainingCredits, consumeCredit, MONTHLY_LIMIT } from '@/lib/ai-helpers'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id, role').eq('id', userId).single()
  if (data?.azienda_id) return data.azienda_id
  if (data?.role === 'super_admin') return userId
  return null
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function fetchUnsplashCover(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null
  try {
    const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
      headers: { Authorization: `Client-ID ${key}` },
    })
    const data = await r.json()
    return data.results?.[0]?.urls?.regular || null
  } catch { return null }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { entity_tipo, entity_id, argomento } = await request.json()
    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })

    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Business non trovato' }, { status: 400 })

    const remaining = getRemainingCredits(azienda_id)
    if (remaining <= 0)
      return Response.json({ error: `Limite mensile raggiunto (${MONTHLY_LIMIT} generazioni/mese). Si rinnova il mese prossimo.` }, { status: 429 })

    const tableMap = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
    const table = tableMap[entity_tipo]
    if (!table) return Response.json({ error: 'entity_tipo non valido' }, { status: 400 })

    const { data: entity, error: entErr } = await supabaseAdmin.from(table)
      .select('name, description, services, minisito').eq('id', entity_id).single()
    if (entErr || !entity) return Response.json({ error: 'Entità non trovata' }, { status: 404 })

    const { data: eventi } = await supabaseAdmin.from('eventi')
      .select('title, start_date').eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
      .gte('start_date', new Date().toISOString()).order('start_date').limit(4)

    const mini = entity.minisito || {}
    const services = Array.isArray(entity.services) ? entity.services.filter(s => s.name).slice(0, 8) : []
    const highlights = Array.isArray(mini.highlights) ? mini.highlights.slice(0, 5) : []

    let ctx = `Business: ${entity.name} (${entity_tipo})`
    if (entity.description) ctx += `\nDescrizione: ${entity.description}`
    if (services.length) ctx += `\nServizi: ${services.map(s => s.name).join(', ')}`
    if (highlights.length) ctx += `\nPunti di forza: ${highlights.map(h => h.text).join(', ')}`
    if (eventi?.length) ctx += `\nEventi in programma: ${eventi.map(e => `${e.title} (${new Date(e.start_date).toLocaleDateString('it-IT')})`).join(', ')}`

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
    } catch { return Response.json({ error: 'Risposta AI non parsabile. Riprova.' }, { status: 500 }) }

    if (!parsed.title?.trim() || !parsed.content?.trim())
      return Response.json({ error: 'Risposta AI incompleta. Riprova.' }, { status: 500 })

    let slug = slugify(parsed.title) || `articolo-ai-${Date.now().toString(36)}`
    const { count } = await supabaseAdmin.from('articoli').select('id', { count: 'exact', head: true }).like('slug', `${slug}%`)
    if (count > 0) slug = `${slug}-${Date.now().toString(36)}`

    const cover_url = await fetchUnsplashCover(parsed.title)
    const { data: articolo, error: artErr } = await supabaseAdmin.from('articoli').insert({
      azienda_id, slug,
      title: parsed.title.trim(),
      excerpt: parsed.excerpt?.trim() || null,
      content: parsed.content,
      cover_url: cover_url || null,
      author: 'AI', entity_tipo, entity_id, published: false,
    }).select('id, title, slug').single()

    if (artErr) return Response.json({ error: artErr.message }, { status: 500 })
    const leftAfter = consumeCredit(azienda_id)
    return Response.json({ ...articolo, usage: { remaining: leftAfter, limit: MONTHLY_LIMIT } }, { status: 201 })
  } catch (e) {
    console.error('[AI blog-auto]', e.message)
    const isTimeout = e.name === 'AbortError'
    return Response.json({ error: isTimeout ? 'Timeout AI (90s). Prova con meno dettagli o riprova.' : 'Errore durante la generazione. Riprova.' }, { status: 500 })
  }
}
