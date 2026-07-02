import { randomUUID } from 'crypto'
import { requireAuth } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { callClaude, checkAndConsumeGenRate } from '@/lib/ai-helpers'
import { resolveBlockImages } from '@/lib/unsplash'

export const maxDuration = 60

const ALLOWED_OBIETTIVI = ['lead_gen', 'vendita', 'vetrina', 'prenotazioni', 'portfolio', 'evento']
const ALLOWED_TEMPLATES = ['essential', 'complete', 'narrative']
const ALLOWED_MODES = ['landing', 'site']
const MAX_LENGTHS = { nome: 100, settore: 150, descrizione: 600, servizi: 500, punti_forza: 400, cta_text: 80, tono: 50, target: 50 }
const GEN_LIMIT_PER_HOUR = 10

const OBIETTIVO_CONFIGS = {
  lead_gen: { label: 'Lead Generation', landing_blocks: 'hero_slider(1 slide, promessa + CTA) → highlights(3-4 benefici) → stats(style:dark) → about(problema→soluzione) → testimonianze → cta_banner(variant:split) → accordion(obiezioni) → form_builder', site_home_blocks: 'hero_slider → highlights → stats(style:dark) → cta_banner → testimonianze → form_builder', notes: 'CTA form visibile presto. Accordion risponde a obiezioni reali.' },
  vendita: { label: 'Vendita / E-commerce', landing_blocks: 'hero_slider(offerta) → highlights → pacchetti(prezzi chiari) → foto_testo(come funziona) → stats(style:dark) → testimonianze → cta_banner(variant:split, urgency) → accordion → form_builder', site_home_blocks: 'hero_slider → highlights → pacchetti → testimonianze → cta_banner → accordion', notes: 'Prezzi chiari. Urgency nella CTA.' },
  vetrina: { label: 'Vetrina / Branding', landing_blocks: 'hero_slider(2-3 slide, mood evocativo) → about(storia e valori) → foto_testo → foto_testo(inverti:true) → carosello(proposte/gallery) → stats(style:dark) → testimonianze → form_builder', site_home_blocks: 'hero_slider → about → foto_testo → carosello → stats(style:dark) → testimonianze → form_builder', notes: 'Atmosfera e brand prima di tutto. foto_testo alternati (inverti:true su righe pari).' },
  prenotazioni: { label: 'Prenotazioni', landing_blocks: 'hero_slider(prenota subito) → highlights(perché noi) → steps(come funziona) → services → stats(style:dark) → testimonianze → accordion → form_builder', site_home_blocks: 'hero_slider → steps → services → highlights → stats(style:dark) → testimonianze → form_builder', notes: 'CTA = "Prenota ora". Steps rassicuranti. Se ristorante, includi un blocco menu.' },
  portfolio: { label: 'Portfolio / Credibilità', landing_blocks: 'hero_slider(chi sei) → about(background) → foto_testo(caso 1 con risultati) → foto_testo(caso 2, inverti:true) → carosello(lavori) → stats(style:dark) → testimonianze → form_builder', site_home_blocks: 'hero_slider → about → foto_testo → carosello → stats(style:dark) → testimonianze → form_builder', notes: 'Lavori concreti con risultati misurabili.' },
  evento: { label: 'Evento', landing_blocks: "hero_slider(titolo evento + data) → countdown(target = data evento) → about(cos'è) → steps(programma) → team(speaker) → stats(style:dark) → accordion(dove,quando,costi) → newsletter → form_builder", site_home_blocks: 'hero_slider → countdown → about → steps → team → accordion → newsletter → form_builder', notes: 'Countdown verso la data. Steps = programma dettagliato.' },
}
const TEMPLATE_CONFIGS = {
  essential: { label: 'Essenziale', style_hint: 'Template ESSENZIALE: usa al massimo 5-6 blocchi totali. Testi brevi e incisivi.' },
  complete: { label: 'Completo', style_hint: 'Template COMPLETO: struttura professionale con tutti i blocchi utili. 7-9 blocchi per landing.' },
  narrative: { label: 'Narrativo', style_hint: 'Template NARRATIVO: racconta una storia. Usa foto_testo alternati (inverti:true sulle righe pari). Tono empatico.' },
}

function sanitizeStr(val, maxLen) { return String(val || '').trim().slice(0, maxLen) }
function slugifyAI(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pagina' }
function addItemIds(blocks) { return (blocks || []).map(b => ({ ...b, id: randomUUID(), data: addIdsToData(b.data || {}) })) }
function addIdsToData(data) {
  const result = { ...data }
  for (const key of Object.keys(result)) {
    if (Array.isArray(result[key])) result[key] = result[key].map(item => item && typeof item === 'object' ? { id: randomUUID(), ...item } : item)
  }
  return result
}

function buildSitePrompt({ entity, entity_tipo, mode, obiettivo, template, answers }) {
  const { nome, settore, descrizione, servizi, punti_forza, cta_text, tono, target } = answers
  const objConf = OBIETTIVO_CONFIGS[obiettivo] || OBIETTIVO_CONFIGS.vetrina
  const tmplConf = TEMPLATE_CONFIGS[template] || TEMPLATE_CONFIGS.complete
  const menuNote = entity_tipo === 'ristorante' ? ' Includi un blocco "menu" nella home (mostra il menù reale del ristorante).' : ''
  const pagesSpec = mode === 'landing'
    ? `CREA 1 PAGINA (slug "__home__", nel_menu false, titolo "${nome || entity.name}").\nStruttura blocchi consigliata per obiettivo "${objConf.label}":\n${objConf.landing_blocks}\nNote obiettivo: ${objConf.notes}${menuNote}`
    : `CREA 4 PAGINE:\n1. Homepage (slug "__home__", nel_menu false): ${objConf.site_home_blocks}${menuNote}\n2. chi-siamo (slug "chi-siamo", nel_menu true): about, foto_testo x2, steps o team, stats(style:dark)\n3. servizi (slug "servizi", nel_menu true): about(intro), paragrafi(3-6 card con icona), highlights, cta_banner\n4. contatti (slug "contatti", nel_menu true): about(intro contatti), form_builder\nNote obiettivo: ${objConf.notes}`

  return `Sei un web designer e copywriter esperto italiano. Crea ${mode === 'landing' ? 'una landing page' : 'un sito completo'} moderno e professionale per un business.

BLOCCHI DISPONIBILI — usa SOLO questi tipi (rispetta ESATTAMENTE i nomi dei campi):
• hero_slider: { height("full"), slides:[{ image_query, title, subtitle, cta1_text, cta1_url("") }] }  ← PREFERISCILO all'hero come primo blocco
• hero: { title, tagline, cta1_text, cta1_url(""), image_query, height("large"|"full") }
• about: { title, text }
• foto_testo: { title, text, image_query, inverti(bool), button_label(""), button_url("") }
• carosello: { titolo, items:[{ image_query, title, text }] }
• colonne: { titolo, columns(2|3), items:[{ title, text }] }
• paragrafi: { titolo, items:[{icon,title,text}] }
• highlights: { titolo, items:[{icon,text}] }
• stats: { titolo, items:[{value,label}] }
• steps: { titolo, items:[{icon,title,text}] }
• accordion: { titolo, items:[{title,text}] }
• faq: { titolo, items:[{question,answer}] }
• testimonianze: { titolo, items:[{author,role,text,stars(5)}] }
• pacchetti: { titolo, items:[{name,tagline,price,price_label,badge}] }
• team: { titolo, items:[{nome,ruolo,bio}] }
• cta_banner: { title, subtitle, button_text, button_url(""), variant("center"|"split") }
• countdown: { titolo, sottotitolo, target("YYYY-MM-DDTHH:MM") }  ← solo eventi con una data
• menu: { titolo }  ← SOLO ristoranti
• divisore: { variant("wave"|"diagonal"), color("muted"|"primary") }  ← separatore decorativo tra sezioni
• newsletter: { title, subtitle }
• form_builder: { form_token(""), titolo_sezione("Contattaci") }
• gallery (auto): data:{} · services (auto): data:{}

IMMAGINI: per ogni campo "image_query" scrivi 2-5 parole in INGLESE che descrivono la foto ideale per QUESTO business (es. "cozy italian restaurant interior", "modern dental studio"). NON inventare URL: verranno risolte automaticamente.

SFONDI DI SEZIONE (ritmo premium): puoi aggiungere a un blocco "style":{"bg":"dark"} o "style":{"bg":"gradient"} o "style":{"bg":"light"}. La maggior parte delle sezioni resta chiara; usa 1-2 sezioni scure/gradiente (tipicamente stats o una cta_banner) per dare ritmo. Non esagerare.

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
- Rispetta ESATTAMENTE i nomi dei campi (es. faq → question/answer; testimonianze → author/text/stars; pacchetti → name/price)
- Testimonianze: nomi italiani verosimili, testi credibili
- FAQ/accordion: domande reali del cliente
- Stats: numeri credibili per il settore
- button_url, cta1_url, form_token: sempre stringa vuota ""
- Ogni blocco deve aggiungere valore

Rispondi ESCLUSIVAMENTE con JSON valido (nessun testo prima o dopo):
{"theme":{"secondaryColor":"#RRGGBB"},"pages":[{"titolo":"...","slug":"...","nel_menu":false,"blocks":[{"type":"hero_slider","data":{...},"style":{}}]}]}
"secondaryColor" = colore accento coerente col brand (usato per badge e dettagli).`
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return Response.json({ error: 'Accesso riservato ai super_admin (beta)' }, { status: 403 })

    if (!checkAndConsumeGenRate(user.id))
      return Response.json({ error: `Limite orario raggiunto (${GEN_LIMIT_PER_HOUR} generazioni/ora). Riprova tra qualche minuto.` }, { status: 429 })

    const body = await request.json()
    const { entity_tipo, entity_id, mode, obiettivo, template, answers } = body

    if (!entity_tipo || !entity_id || !answers) return Response.json({ error: 'Parametri mancanti' }, { status: 400 })
    if (!ALLOWED_MODES.includes(mode)) return Response.json({ error: 'mode non valido' }, { status: 400 })
    if (!ALLOWED_OBIETTIVI.includes(obiettivo)) return Response.json({ error: 'obiettivo non valido' }, { status: 400 })
    if (!ALLOWED_TEMPLATES.includes(template)) return Response.json({ error: 'template non valido' }, { status: 400 })

    const tableMap = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
    const table = tableMap[entity_tipo]
    if (!table) return Response.json({ error: 'entity_tipo non valido' }, { status: 400 })

    const { data: entity } = await supabaseAdmin.from(table).select('name, description').eq('id', entity_id).single()
    if (!entity) return Response.json({ error: 'Entità non trovata' }, { status: 404 })

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

    const prompt = buildSitePrompt({ entity, entity_tipo, mode, obiettivo, template, answers: clean })
    const raw = await callClaude(prompt, 6000)

    let parsed
    try {
      const m = raw.match(/\{[\s\S]*\}/s) || raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(m ? m[0] : raw)
    } catch {
      console.error('[AI generate-site] parse error, raw:', raw.slice(0, 300))
      return Response.json({ error: 'Risposta AI non parsabile. Riprova.' }, { status: 500 })
    }

    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0)
      return Response.json({ error: 'Struttura generata non valida. Riprova.' }, { status: 500 })

    parsed.pages = parsed.pages.slice(0, 4)
    for (const pg of parsed.pages) {
      if (Array.isArray(pg.blocks)) {
        pg.blocks = pg.blocks.slice(0, 12).map(b =>
          b.type === 'contatti' ? { ...b, type: 'form_builder', data: { form_token: '', titolo_sezione: 'Contattaci', ...(b.data || {}) } } : b
        )
      }
    }

    const created = []
    for (let i = 0; i < parsed.pages.length; i++) {
      const pg = parsed.pages[i]
      const isHome = i === 0
      // immagini pertinenti da Unsplash (image_query → URL); fail-safe se non configurato
      const blocks = await resolveBlockImages(addItemIds(pg.blocks || []), [])

      if (isHome) {
        const { data: existing } = await supabaseAdmin.from('pagine').select('id')
          .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('slug', '__home__').maybeSingle()
        let p
        if (existing) {
          const { data } = await supabaseAdmin.from('pagine').update({
            titolo: pg.titolo || entity.name, status: 'pubblicata', blocks, nel_menu: false,
          }).eq('id', existing.id).select('id, titolo, slug, nel_menu').single()
          p = data
        } else {
          const { data } = await supabaseAdmin.from('pagine').insert({
            entity_tipo, entity_id, titolo: pg.titolo || entity.name,
            slug: '__home__', nel_menu: false, status: 'pubblicata', blocks, ordine: 0,
          }).select('id, titolo, slug, nel_menu').single()
          p = data
        }
        if (p) created.push({ ...p, published: true })
      } else {
        let slug = slugifyAI(pg.slug || pg.titolo || 'pagina').slice(0, 80)
        const { count } = await supabaseAdmin.from('pagine').select('id', { count: 'exact', head: true })
          .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('slug', slug)
        if (count > 0) slug = `${slug}-${Date.now().toString(36)}`
        const { data: p } = await supabaseAdmin.from('pagine').insert({
          entity_tipo, entity_id, titolo: pg.titolo || 'Pagina',
          slug, nel_menu: !!pg.nel_menu, status: 'pubblicata', blocks, ordine: i,
        }).select('id, titolo, slug, nel_menu').single()
        if (p) created.push({ ...p, published: true })
      }
    }

    const secondary = typeof parsed.theme?.secondaryColor === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.theme.secondaryColor.trim())
      ? parsed.theme.secondaryColor.trim() : null
    const { data: currentEntity } = await supabaseAdmin.from(table).select('minisito, theme').eq('id', entity_id).single()
    const entityUpdate = {}
    if (!currentEntity?.minisito?.active) entityUpdate.minisito = { ...(currentEntity?.minisito || {}), active: true }
    if (secondary) entityUpdate.theme = { ...(currentEntity?.theme || {}), secondaryColor: secondary }
    if (Object.keys(entityUpdate).length) await supabaseAdmin.from(table).update(entityUpdate).eq('id', entity_id)

    return Response.json({ pages: created })
  } catch (e) {
    console.error('[AI generate-site]', e.message)
    const isTimeout = e.name === 'AbortError'
    return Response.json({ error: isTimeout ? 'Timeout AI (90s). Prova con meno dettagli o riprova.' : (e.message || 'Errore durante la generazione. Riprova.') }, { status: 500 })
  }
}
