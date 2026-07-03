import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess, ENTITY_TABLES } from '@/lib/server-auth'
import { getTemplate } from '@/lib/siteTemplates'
import { callClaude } from '@/lib/ai-helpers'
import { resolveBlockImages } from '@/lib/unsplash'
import { AI_BLOCKS_SCHEMA, AI_IMAGE_RULE, AI_BG_RULE, AI_ICONS } from '@/lib/ai-blocks'

export const maxDuration = 60

// "Ho già i contenuti": l'utente incolla un documento (es. generato con ChatGPT)
// con le sezioni già scritte. L'AI lo converte nei NOSTRI blocchi PRESERVANDO la
// struttura/testi del documento (non riempie un template fisso). Il look (tema)
// viene dal template scelto, la struttura+testi dal documento.

const TIPO_LABEL = { struttura: 'struttura ricettiva', ristorante: 'ristorante / locale', attivita: 'attività / servizio' }
const MENU_NOTE  = { ristorante: ' Se il documento parla del menù, includi un blocco "menu".' }
const DOC_MAX = 12000  // limite input per non sforare i token (MVP: no chunking)

function addIdsToData(data) {
  const out = { ...(data || {}) }
  for (const k of Object.keys(out)) {
    if (Array.isArray(out[k])) out[k] = out[k].map(it => (it && typeof it === 'object' ? { id: randomUUID(), ...it } : it))
  }
  return out
}
function withIds(blocks) { return (blocks || []).map(b => ({ ...b, id: randomUUID(), data: addIdsToData(b.data) })) }

function buildPrompt({ entity, entity_tipo, documento }) {
  return `Sei un web designer e copywriter esperto italiano. Un cliente ti fornisce un DOCUMENTO con i contenuti già scritti del suo sito (sezioni, titoli, testi). Convertilo in una home page usando i NOSTRI blocchi, PRESERVANDO le sue sezioni e i suoi testi. NON inventare sezioni che non ci sono, NON perdere contenuti importanti; puoi migliorare la forma ma resta fedele al contenuto del documento.

${AI_BLOCKS_SCHEMA}

${AI_IMAGE_RULE}

${AI_BG_RULE}

${AI_ICONS}

MAPPATURA sezione → blocco (indicativa): apertura/claim → hero_slider o hero; chi siamo/storia → about o foto_testo; servizi/benefici → paragrafi o highlights o colonne; come funziona → steps; numeri → stats; recensioni → testimonianze; prezzi/piani → pacchetti; domande → faq o accordion; team → team; call to action → cta_banner; contatti → form_builder.${MENU_NOTE[entity_tipo] || ''}

ENTITÀ (contesto): Nome "${entity?.name || ''}", tipo ${TIPO_LABEL[entity_tipo] || entity_tipo}.

DOCUMENTO DEL CLIENTE:
"""
${documento}
"""

REGOLE:
- Primo blocco = hero_slider o hero col titolo/claim principale del documento.
- Ultimo blocco = form_builder se il documento accenna ai contatti.
- Testi in italiano, fedeli al documento (niente "Lorem ipsum" o placeholder).
- Rispetta ESATTAMENTE i nomi dei campi. button_url/cta1_url/form_token = "".
Rispondi ESCLUSIVAMENTE con JSON valido (nessun testo prima o dopo):
{"theme":{"secondaryColor":"#RRGGBB"},"blocks":[{"type":"...","data":{...},"style":{}}]}`
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { entity_tipo, entity_id, documento = '', template_id } = body
  if (!entity_tipo || !entity_id || !documento.trim()) {
    return NextResponse.json({ error: 'Parametri mancanti (documento vuoto)' }, { status: 400 })
  }

  const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
  if (response) return response

  const table = ENTITY_TABLES[entity_tipo]
  if (!table) return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })

  const { data: ent } = await supabaseAdmin.from(table).select('name, theme, minisito').eq('id', entity_id).single()

  const doc = documento.trim().slice(0, DOC_MAX)
  const prompt = buildPrompt({ entity: ent, entity_tipo, documento: doc })

  let parsed
  try {
    const raw = await callClaude(prompt, 8000)
    const m = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(m ? m[0] : raw)
  } catch (e) {
    console.error('[from-document] parse/AI error:', e?.message)
    return NextResponse.json({ error: 'Non sono riuscito a interpretare il documento (forse troppo lungo). Prova ad accorciarlo o riprova.' }, { status: 502 })
  }

  if (!Array.isArray(parsed.blocks) || !parsed.blocks.length) {
    return NextResponse.json({ error: 'Nessun blocco generato dal documento. Riprova.' }, { status: 502 })
  }

  const normalized = parsed.blocks.slice(0, 16).map(b =>
    b.type === 'contatti' ? { ...b, type: 'form_builder', data: { form_token: '', titolo_sezione: 'Contattaci', ...(b.data || {}) } } : b
  )
  const blocks = await resolveBlockImages(withIds(normalized), [])

  const { data: existing } = await supabaseAdmin.from('pagine').select('id')
    .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('slug', '__home__').maybeSingle()
  if (existing) {
    await supabaseAdmin.from('pagine').update({ blocks, status: 'pubblicata', titolo: 'Home' }).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('pagine').insert({
      entity_tipo, entity_id, titolo: 'Home', slug: '__home__', nel_menu: false, status: 'pubblicata', blocks, ordine: 0,
    })
  }

  // Look: tema del template scelto (se valido) + colore accento suggerito dall'AI; attiva il minisito.
  const tpl = template_id ? getTemplate(template_id) : null
  const secondary = typeof parsed.theme?.secondaryColor === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.theme.secondaryColor.trim())
    ? parsed.theme.secondaryColor.trim() : null
  const theme = { ...(ent?.theme || {}), ...(tpl?.theme || {}), ...(secondary ? { secondaryColor: secondary } : {}) }
  await supabaseAdmin.from(table).update({
    theme,
    minisito: { ...(ent?.minisito || {}), active: true },
  }).eq('id', entity_id)

  return NextResponse.json({ ok: true, blocks: blocks.length })
}
