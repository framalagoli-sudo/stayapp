import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess, ENTITY_TABLES } from '@/lib/server-auth'
import { getTemplate } from '@/lib/siteTemplates'
import { collectStrings, applyTranslations } from '@/lib/translate'
import { callClaude } from '@/lib/ai-helpers'

export const maxDuration = 60

// Fase B galleria template: l'AI riempie il template coi dati del business.
// Riscrive SOLO i testi (collectStrings di translate.js esclude già immagini/icone/
// valori/url) mantenendo struttura, stile e immagini placeholder del template.
// Due modalità: 'uguale' (adatta i testi-esempio) | 'traccia' (contenuti originali).
// Su qualsiasi errore AI ripiega sui testi d'esempio (mai bloccare la creazione).

function addIdsToData(data) {
  const out = { ...(data || {}) }
  if (Array.isArray(out.items)) out.items = out.items.map(it => ({ id: randomUUID(), ...it }))
  return out
}
function withIds(blocks) {
  return (blocks || []).map(b => ({ ...b, id: randomUUID(), data: addIdsToData(b.data) }))
}

const TIPO_LABEL = { struttura: 'struttura ricettiva', ristorante: 'ristorante / locale', attivita: 'attività / servizio' }

async function fillTexts(blocks, business, modalita) {
  const source = collectStrings(blocks, '', {})       // { path: testoEsempio }
  const entries = Object.entries(source)
  if (!entries.length) return blocks

  const indexed = {}
  entries.forEach(([, v], i) => { indexed[i] = v })

  const istruzione = modalita === 'traccia'
    ? 'Usa i testi d’esempio solo come TRACCIA: scrivi contenuti originali, specifici e convincenti per QUESTO business, mantenendo la funzione di ogni sezione. Puoi discostarti dalle parole d’esempio.'
    : 'Adatta ogni testo d’esempio a QUESTO business, mantenendo lunghezza, tono e funzione simili all’esempio.'

  const prompt =
`Sei un copywriter web. Ricevi i testi-segnaposto di un template di sito (in italiano) come oggetto JSON {numero: testo}.
${istruzione}
Restituisci SOLO un oggetto JSON con le STESSE chiavi numeriche e i testi riscritti in italiano. Niente commenti, niente markdown.
Regole:
- Scrivi in italiano naturale, professionale, concreto. Niente testo segnaposto tipo "descrivi qui".
- Mantieni la stessa funzione di ogni voce (titolo resta titolo breve, tagline breve, descrizione più ampia, voce FAQ resta domanda/risposta, label statistica breve).
- Non aggiungere né togliere voci. Non tradurre, scrivi in italiano. Non includere il nome del business se suona ripetitivo.

Dati del business:
${business}

JSON:
${JSON.stringify(indexed)}`

  const chars = entries.reduce((n, [, v]) => n + v.length, 0)
  const maxTokens = Math.min(8000, Math.max(1024, Math.ceil(chars / 1.4) + 1200))
  const raw = await callClaude(prompt, maxTokens)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)

  const map = {}
  entries.forEach(([path], i) => {
    if (typeof parsed[i] === 'string' && parsed[i].trim()) map[path] = parsed[i].trim()
  })
  return applyTranslations(blocks, map)
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { entity_tipo, entity_id, template_id, modalita = 'uguale', brief = '' } = body
  if (!entity_tipo || !entity_id || !template_id) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }

  const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
  if (response) return response

  const table = ENTITY_TABLES[entity_tipo]
  if (!table) return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })

  const tpl = getTemplate(template_id)
  if (!tpl) return NextResponse.json({ error: 'Template non trovato' }, { status: 404 })

  const { data: ent } = await supabaseAdmin.from(table)
    .select('name, description, theme, minisito').eq('id', entity_id).single()

  const business = [
    `Nome: ${ent?.name || '(senza nome)'}`,
    `Tipo: ${TIPO_LABEL[entity_tipo] || entity_tipo}`,
    `Descrizione: ${(brief && brief.trim()) || ent?.description || '(non fornita — usa un tono generico adatto al tipo)'}`,
  ].join('\n')

  // Riempi i testi via AI; su errore ripiega sui testi d'esempio del template.
  let filledBlocks = tpl.blocks
  let aiUsed = true
  try {
    filledBlocks = await fillTexts(tpl.blocks, business, modalita)
  } catch (e) {
    console.error('[ai-fill] AI fallita, uso testi esempio:', e?.message)
    aiUsed = false
  }

  const blocks = withIds(filledBlocks)

  const { data: existing } = await supabaseAdmin.from('pagine').select('id')
    .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('slug', '__home__').maybeSingle()
  if (existing) {
    await supabaseAdmin.from('pagine').update({ blocks, status: 'pubblicata', updated_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('pagine').insert({
      entity_tipo, entity_id, titolo: 'Home', slug: '__home__', nel_menu: false,
      status: 'pubblicata', blocks, ordine: 0,
    })
  }

  await supabaseAdmin.from(table).update({
    theme: { ...(ent?.theme || {}), ...tpl.theme },
    minisito: { ...(ent?.minisito || {}), active: true },
  }).eq('id', entity_id)

  return NextResponse.json({ ok: true, blocks: blocks.length, ai: aiUsed })
}
