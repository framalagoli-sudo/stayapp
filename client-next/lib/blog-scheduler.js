import { supabaseAdmin } from './supabase-server'

export function calcNextRun(frequenza, ora, giornoSettimana, giornoMese, from = new Date()) {
  const d = new Date(from)
  d.setMinutes(0, 0, 0)

  if (frequenza === 'giornaliera') {
    d.setUTCHours(ora)
    if (d <= from) d.setUTCDate(d.getUTCDate() + 1)
    return d
  }

  if (frequenza === 'settimanale') {
    d.setUTCHours(ora)
    const currentDay = d.getUTCDay()
    let diff = giornoSettimana - currentDay
    if (diff < 0 || (diff === 0 && d <= from)) diff += 7
    d.setUTCDate(d.getUTCDate() + diff)
    return d
  }

  // mensile
  d.setUTCHours(ora)
  d.setUTCDate(giornoMese)
  if (d <= from) {
    d.setUTCMonth(d.getUTCMonth() + 1)
    d.setUTCDate(giornoMese)
  }
  return d
}

async function fetchUnsplashCover(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key || !query?.trim()) return null
  try {
    const q = encodeURIComponent(query.trim().slice(0, 80))
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${q}&per_page=3&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const photos = data.results || []
    if (!photos.length) return null
    const pick = photos[Math.floor(Math.random() * photos.length)]
    return pick.urls?.regular || null
  } catch { return null }
}

async function generateArticle(automazione) {
  const { entity_tipo, entity_id, azienda_id, argomenti, modalita } = automazione
  const tableMap = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
  const table = tableMap[entity_tipo]
  if (!table) return

  const { data: entity } = await supabaseAdmin.from(table)
    .select('name, description, services, minisito')
    .eq('id', entity_id).single()
  if (!entity) return

  const { data: eventi } = await supabaseAdmin.from('eventi')
    .select('title, start_date')
    .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
    .gte('start_date', new Date().toISOString())
    .order('start_date').limit(4)

  const mini      = entity.minisito || {}
  const services   = Array.isArray(entity.services)    ? entity.services.filter(s => s.name).slice(0, 6) : []
  const highlights = Array.isArray(mini.highlights)    ? mini.highlights.slice(0, 4) : []
  const argList    = Array.isArray(argomenti) && argomenti.length ? argomenti : []

  let ctx = `Business: ${entity.name} (${entity_tipo})`
  if (entity.description) ctx += `\nDescrizione: ${entity.description}`
  if (services.length)    ctx += `\nServizi: ${services.map(s => s.name).join(', ')}`
  if (highlights.length)  ctx += `\nPunti di forza: ${highlights.map(h => h.text).join(', ')}`
  if (eventi?.length)     ctx += `\nEventi: ${eventi.map(e => e.title).join(', ')}`

  let topicLine = ''
  if (argList.length) {
    const idx = Math.floor(Date.now() / 1000) % argList.length
    topicLine = `\nArgomento: ${argList[idx]}`
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY ?? '').trim()
  if (!apiKey) return

  const prompt = `Sei un content writer esperto. Scrivi un articolo di blog in italiano per "${entity.name}".

Contesto:
${ctx}${topicLine}

Rispondi ESCLUSIVAMENTE con un oggetto JSON (nessun testo prima o dopo):
{
  "title": "Titolo accattivante SEO (max 80 caratteri)",
  "excerpt": "Breve introduzione (max 180 caratteri)",
  "content": "Corpo completo in HTML semplice (p, h2, h3, ul, li, strong — min 350 parole)"
}`

  const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!apiRes.ok) return

  const aiData = await apiRes.json()
  const raw = aiData.content?.[0]?.text?.trim() || ''

  let parsed
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(match ? match[0] : raw)
  } catch { return }
  if (!parsed?.title?.trim() || !parsed?.content?.trim()) return

  const cover_url = await fetchUnsplashCover(parsed.title)

  function slugify(str) {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }
  let slug = slugify(parsed.title) || `articolo-ai-${Date.now().toString(36)}`
  const { count } = await supabaseAdmin.from('articoli').select('id', { count: 'exact', head: true }).like('slug', `${slug}%`)
  if (count > 0) slug = `${slug}-${Date.now().toString(36)}`

  const now = new Date().toISOString()
  await supabaseAdmin.from('articoli').insert({
    azienda_id, slug,
    title: parsed.title.trim(),
    excerpt: parsed.excerpt?.trim() || null,
    content: parsed.content,
    cover_url: cover_url || null,
    author: 'AI',
    entity_tipo, entity_id,
    published: modalita === 'pubblica',
    published_at: modalita === 'pubblica' ? now : null,
  })

  if (modalita === 'bozza' && automazione.notifica_email && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend((process.env.RESEND_API_KEY ?? '').trim())
      await resend.emails.send({
        from: (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>',
        to: automazione.notifica_email,
        subject: `Nuova bozza AI pronta: "${parsed.title}"`,
        html: `<p>È stata generata automaticamente una nuova bozza di articolo per <strong>${entity.name}</strong>:</p>
<p><strong>${parsed.title}</strong></p>
<p>${parsed.excerpt || ''}</p>
<p><a href="${(process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'}/admin/blog">Apri l'admin Blog →</a></p>`,
      })
    } catch (e) { console.error('[blogScheduler] notifica email:', e.message) }
  }
}

export async function runBlogScheduler() {
  const now = new Date().toISOString()

  const { data: automazioni } = await supabaseAdmin.from('blog_automazioni')
    .select('*')
    .eq('attiva', true)
    .lte('next_run_at', now)

  if (!automazioni?.length) return

  for (const auto of automazioni) {
    try {
      await generateArticle(auto)
    } catch (e) {
      console.error(`[blogScheduler] errore per automazione ${auto.id}:`, e.message)
    }

    const next = calcNextRun(auto.frequenza, auto.ora_pubblicazione, auto.giorno_settimana, auto.giorno_mese)
    await supabaseAdmin.from('blog_automazioni').update({
      last_run_at: now,
      next_run_at: next.toISOString(),
      updated_at: now,
    }).eq('id', auto.id)
  }
}
