import express from 'express'
import { randomUUID } from 'crypto'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { fetchUnsplashCover } from '../lib/unsplash.js'

const router = express.Router()

async function callClaude(prompt, maxTokens = 500) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurata su Railway')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90_000)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
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
  } finally {
    clearTimeout(timer)
  }
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

// Rate limit for generate-site: max 10 generations per hour per user
const genRateMap = new Map()
const GEN_LIMIT_PER_HOUR = 10

function checkAndConsumeGenRate(userId) {
  const now = Date.now()
  const times = (genRateMap.get(userId) || []).filter(t => now - t < 3_600_000)
  if (times.length >= GEN_LIMIT_PER_HOUR) return false
  genRateMap.set(userId, [...times, now])
  return true
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

// GET /api/ai/unsplash?q=estate+spiaggia&n=12
// Cerca foto su Unsplash per query libera — richiede UNSPLASH_ACCESS_KEY su Railway
router.get('/unsplash', requireAuth, async (req, res) => {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return res.status(503).json({ error: 'UNSPLASH_ACCESS_KEY non configurata su Railway' })
  const q = (req.query.q || '').trim().slice(0, 100)
  if (!q) return res.status(400).json({ error: 'Parametro q obbligatorio' })
  const n = Math.min(parseInt(req.query.n || '12', 10), 30)
  try {
    const r = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${n}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
    if (!r.ok) return res.status(502).json({ error: 'Unsplash non disponibile' })
    const body = await r.json()
    const photos = (body.results || []).map(p => ({
      id:     p.id,
      url:    p.urls.regular,
      thumb:  p.urls.small,
      alt:    p.alt_description || '',
      author: p.user.name,
      link:   p.links.html,
    }))
    res.json(photos)
  } catch (e) {
    res.status(500).json({ error: e.message })
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

// ── Helpers generate-site ────────────────────────────────────────────────────

const ALLOWED_OBIETTIVI = ['lead_gen', 'vendita', 'vetrina', 'prenotazioni', 'portfolio', 'evento']
const ALLOWED_TEMPLATES = ['essential', 'complete', 'narrative']
const ALLOWED_MODES     = ['landing', 'site']

const OBIETTIVO_CONFIGS = {
  lead_gen: {
    label: 'Lead Generation',
    landing_blocks: 'hero(urgente+CTA principale ben visibile) → highlights(3-4 benefici chiave) → stats(numeri credibilità) → about(problema→soluzione) → testimonianze → cta_banner → faq(rispondi alle obiezioni reali) → contatti(form prominente)',
    site_home_blocks: 'hero → highlights → stats → cta_banner → testimonianze → contatti',
    notes: 'CTA form visibile entro i primi 2 blocchi. FAQ risponde a obiezioni reali del cliente. Testi focalizzati sul problema e sulla soluzione offerta.',
  },
  vendita: {
    label: 'Vendita / E-commerce',
    landing_blocks: 'hero(offerta irresistibile con beneficio principale) → highlights(benefici prodotto/servizio) → pacchetti(prezzi chiari e comparabili) → foto_testo(come funziona, step-by-step) → stats(numeri credibili) → testimonianze(con risultati concreti) → cta_banner(urgency) → faq → contatti',
    site_home_blocks: 'hero → highlights → pacchetti → testimonianze → cta_banner → faq',
    notes: 'Mostra prezzi chiaramente. Urgency e scarcity nella CTA. Testimonianze con risultati concreti e misurabili.',
  },
  vetrina: {
    label: 'Vetrina / Branding',
    landing_blocks: 'hero(mood evocativo, tagline memorabile) → about(storia e valori autentici) → foto_testo(prodotto/servizio principale) → foto_testo(altro aspetto, inverti:true) → gallery → stats → team → testimonianze → contatti',
    site_home_blocks: 'hero → about → foto_testo → gallery → stats → testimonianze → contatti',
    notes: 'Atmosfera e brand identity prima di tutto. Usa foto_testo alternati (inverti:true su righe pari). Tono narrativo ed empatico. Gallery per impatto visivo.',
  },
  prenotazioni: {
    label: 'Prenotazioni',
    landing_blocks: 'hero(prenota subito, CTA molto prominente) → highlights(3-4 motivi per sceglierci) → steps(come funziona: 3-4 passi semplici) → services → stats → testimonianze → faq(domande su prenotazione, disdetta, pagamento) → contatti',
    site_home_blocks: 'hero → steps → services → highlights → stats → testimonianze → contatti',
    notes: 'CTA principale = "Prenota ora". Steps chiari e rassicuranti sul processo. FAQ include disdette, modifiche, pagamenti.',
  },
  portfolio: {
    label: 'Portfolio / Credibilità',
    landing_blocks: 'hero(chi sei e specializzazione) → about(background e approccio) → foto_testo(caso studio 1 concreto con risultati) → foto_testo(caso studio 2, inverti:true) → stats(clienti serviti, anni esperienza, progetti completati) → testimonianze(clienti reali con azienda e ruolo) → contatti',
    site_home_blocks: 'hero → about → foto_testo → foto_testo → stats → testimonianze → contatti',
    notes: 'Mostra lavori concreti con risultati misurabili. Stats = numeri professionali credibili. Testimonianze con nome, azienda e ruolo.',
  },
  evento: {
    label: 'Evento',
    landing_blocks: 'hero(titolo evento + data + CTA iscrizione urgente) → about(cos\'è e perché partecipare) → steps(programma/scaletta dettagliata) → team(speaker/ospiti con bio) → stats(edizioni passate, partecipanti attesi) → faq(dove, quando, costi, accessibilità) → newsletter(registrati per aggiornamenti) → contatti',
    site_home_blocks: 'hero → about → steps → team → faq → newsletter → contatti',
    notes: 'Data e urgency prominenti in hero. Steps = programma dettagliato dell\'evento. FAQ su logistica e praticità.',
  },
}

const TEMPLATE_CONFIGS = {
  essential: {
    label: 'Essenziale',
    style_hint: 'Template ESSENZIALE: usa al massimo 5-6 blocchi totali. Testi brevi e incisivi. Un messaggio chiaro per blocco. Scegli solo i blocchi più importanti per l\'obiettivo, ometti tutto il resto.',
  },
  complete: {
    label: 'Completo',
    style_hint: 'Template COMPLETO: struttura professionale con tutti i blocchi utili per l\'obiettivo. 7-9 blocchi per landing, 4-6 per ogni pagina nei siti multi-page. Testi dettagliati e persuasivi.',
  },
  narrative: {
    label: 'Narrativo',
    style_hint: 'Template NARRATIVO: racconta una storia. Usa foto_testo alternati (inverti:true sulle righe pari). Tono empatico e coinvolgente. Costruisci un percorso emotivo verso la conversione. Preferisci about e foto_testo a highlights e stats.',
  },
}

const MAX_LENGTHS = { nome: 100, settore: 150, descrizione: 600, servizi: 500, punti_forza: 400, cta_text: 80, tono: 50, target: 50 }
function sanitizeStr(val, maxLen) { return String(val || '').trim().slice(0, maxLen) }

function slugifyAI(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pagina'
}

function addItemIds(blocks) {
  return (blocks || []).map(b => ({
    ...b,
    id: randomUUID(),
    data: addIdsToData(b.data || {}),
  }))
}

function addIdsToData(data) {
  const result = { ...data }
  for (const key of Object.keys(result)) {
    if (Array.isArray(result[key])) {
      result[key] = result[key].map(item =>
        item && typeof item === 'object' ? { id: randomUUID(), ...item } : item
      )
    }
  }
  return result
}

function buildSitePrompt({ entity, mode, obiettivo, template, answers }) {
  const { nome, settore, descrizione, servizi, punti_forza, cta_text, tono, target } = answers
  const objConf  = OBIETTIVO_CONFIGS[obiettivo] || OBIETTIVO_CONFIGS.vetrina
  const tmplConf = TEMPLATE_CONFIGS[template]   || TEMPLATE_CONFIGS.complete

  const pagesSpec = mode === 'landing'
    ? `CREA 1 PAGINA (slug "home", nel_menu false, titolo "${nome || entity.name}").
Struttura blocchi consigliata per obiettivo "${objConf.label}":
${objConf.landing_blocks}
Note obiettivo: ${objConf.notes}`
    : `CREA 4 PAGINE:
1. home (slug "home", nel_menu false): ${objConf.site_home_blocks}
2. chi-siamo (slug "chi-siamo", nel_menu true): about, foto_testo x2, steps o team, stats
3. servizi (slug "servizi", nel_menu true): about(intro), paragrafi(3-6 card con icona), highlights, cta_banner
4. contatti (slug "contatti", nel_menu true): about(intro contatti), contatti
Note obiettivo: ${objConf.notes}`

  return `Sei un web designer e copywriter esperto italiano. Crea ${mode === 'landing' ? 'una landing page' : 'un sito completo'} per un business.

BLOCCHI DISPONIBILI — usa SOLO questi tipi:
• hero: { title, tagline, cta1_text, cta1_url(""), height("large"|"medium") }
• about: { title, text }
• foto_testo: { title, text, inverti(bool), button_label, button_url("") }
• paragrafi: { titolo, items:[{icon,title,text}] }
• highlights: { titolo, items:[{icon,text}] }
• stats: { titolo, items:[{value,label}] }
• cta_banner: { title, subtitle, button_text, button_url("") }
• testimonianze: { titolo, items:[{nome,testo,stelle(5)}] }
• faq: { titolo, items:[{domanda,risposta}] }
• steps: { titolo, items:[{icon,title,text}] }
• pacchetti: { titolo, items:[{nome,prezzo,descrizione,features:[]}] }
• team: { titolo, items:[{nome,ruolo,bio}] }
• newsletter: { title, subtitle }
• gallery (auto): data:{}
• services (auto): data:{}
• contatti (auto): data:{}

Icone Lucide valide per "icon": star, check, check-circle, heart, home, phone, mail, users, zap, shield, award, clock, map-pin, coffee, utensils, sparkles, leaf, sun, briefcase, wrench, euro, handshake, smile, target, trending-up, calendar, globe, camera, music, activity, book, layers, tag

DATI BUSINESS:
Nome: ${nome || entity.name}
Settore: ${settore || 'non specificato'}
Descrizione: ${descrizione || entity.description || ''}
Servizi: ${servizi || 'non specificati'}
Punti di forza: ${punti_forza || 'non specificati'}
CTA principale: ${cta_text || 'Contattaci'}
Tono di comunicazione: ${tono || 'professionale'}
Target: ${target || 'tutti'}

${pagesSpec}

${tmplConf.style_hint}

REGOLE ASSOLUTE:
- Testi in italiano, specifici e realistici (MAI placeholder come "Lorem ipsum" o "[nome servizio]")
- Testimonianze: nomi italiani verosimili, testi dettagliati e credibili con contesto reale
- FAQ: domande reali che un cliente farebbe a questo tipo di business
- Stats: numeri coerenti e credibili per il settore specifico
- button_url, cta1_url: sempre stringa vuota "" (l\'utente li imposta in seguito)
- Ogni blocco deve aggiungere valore concreto — nessun blocco vuoto o generico

Rispondi ESCLUSIVAMENTE con JSON valido (nessun testo prima o dopo il JSON):
{"pages":[{"titolo":"...","slug":"...","nel_menu":false,"blocks":[{"type":"hero","data":{...}}]}]}`
}

// POST /api/ai/generate-site  (beta — super_admin only)
router.post('/generate-site', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', req.user.id).single()
    if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Accesso riservato ai super_admin (beta)' })

    if (!checkAndConsumeGenRate(req.user.id)) {
      return res.status(429).json({ error: `Limite orario raggiunto (${GEN_LIMIT_PER_HOUR} generazioni/ora). Riprova tra qualche minuto.` })
    }

    const { entity_tipo, entity_id, mode, obiettivo, template, answers } = req.body

    if (!entity_tipo || !entity_id || !answers)         return res.status(400).json({ error: 'Parametri mancanti' })
    if (!ALLOWED_MODES.includes(mode))                  return res.status(400).json({ error: 'mode non valido' })
    if (!ALLOWED_OBIETTIVI.includes(obiettivo))         return res.status(400).json({ error: 'obiettivo non valido' })
    if (!ALLOWED_TEMPLATES.includes(template))          return res.status(400).json({ error: 'template non valido' })

    const tableMap = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
    const table = tableMap[entity_tipo]
    if (!table) return res.status(400).json({ error: 'entity_tipo non valido' })

    const { data: entity } = await supabase.from(table).select('name, description').eq('id', entity_id).single()
    if (!entity) return res.status(404).json({ error: 'Entità non trovata' })

    const clean = {
      nome:        sanitizeStr(answers.nome,        MAX_LENGTHS.nome),
      settore:     sanitizeStr(answers.settore,     MAX_LENGTHS.settore),
      descrizione: sanitizeStr(answers.descrizione, MAX_LENGTHS.descrizione),
      servizi:     sanitizeStr(answers.servizi,     MAX_LENGTHS.servizi),
      punti_forza: sanitizeStr(answers.punti_forza, MAX_LENGTHS.punti_forza),
      cta_text:    sanitizeStr(answers.cta_text,    MAX_LENGTHS.cta_text)  || 'Contattaci',
      tono:        sanitizeStr(answers.tono,        MAX_LENGTHS.tono)      || 'professionale',
      target:      sanitizeStr(answers.target,      MAX_LENGTHS.target)    || 'tutti',
    }

    const prompt = buildSitePrompt({ entity, mode, obiettivo, template, answers: clean })
    const raw = await callClaude(prompt, 6000)

    let parsed
    try {
      const m = raw.match(/\{[\s\S]*\}/s) || raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(m ? m[0] : raw)
    } catch {
      console.error('[AI generate-site] parse error, raw:', raw.slice(0, 300))
      return res.status(500).json({ error: 'Risposta AI non parsabile. Riprova.' })
    }

    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      return res.status(500).json({ error: 'Struttura generata non valida. Riprova.' })
    }

    // Safety caps: max 4 pages, max 12 blocks per page
    parsed.pages = parsed.pages.slice(0, 4)
    for (const pg of parsed.pages) {
      if (Array.isArray(pg.blocks)) pg.blocks = pg.blocks.slice(0, 12)
    }

    const created = []
    for (let i = 0; i < parsed.pages.length; i++) {
      const pg = parsed.pages[i]
      let slug = slugifyAI(pg.slug || pg.titolo || 'pagina').slice(0, 80)

      const { count } = await supabase.from('pagine').select('id', { count: 'exact', head: true })
        .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('slug', slug)
      if (count > 0) slug = `${slug}-${Date.now().toString(36)}`

      const blocks = addItemIds(pg.blocks || [])

      const { data: p } = await supabase.from('pagine').insert({
        entity_tipo, entity_id,
        titolo: pg.titolo || 'Pagina',
        slug, nel_menu: !!pg.nel_menu,
        status: 'bozza', blocks, ordine: i,
      }).select('id, titolo, slug, nel_menu').single()

      if (p) created.push(p)
    }

    res.json({ pages: created })
  } catch (e) {
    console.error('[AI generate-site]', e.message)
    const isTimeout = e.name === 'AbortError'
    res.status(500).json({ error: isTimeout ? 'Timeout AI (90s). Prova con meno dettagli o riprova.' : 'Errore durante la generazione. Riprova.' })
  }
})

export default router
