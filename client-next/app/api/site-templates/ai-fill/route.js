import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess, ENTITY_TABLES } from '@/lib/server-auth'
import { getTemplate } from '@/lib/siteTemplates'
import { collectStrings, applyTranslations } from '@/lib/translate'
import { callClaude } from '@/lib/ai-helpers'
import { resolveBlockImages } from '@/lib/unsplash'
import { entityDataSummary } from '@/lib/ai-entity-context'

export const maxDuration = 60

// Termine di settore accodato alle query immagine per renderle pertinenti.
const SECTOR_TERM = { struttura: 'hotel', ristorante: 'restaurant', attivita: '' }

// Fase B galleria template: l'AI riempie il template coi dati del business.
// Riscrive SOLO i testi (collectStrings di translate.js esclude già immagini/icone/
// valori/url) mantenendo struttura, stile e immagini placeholder del template.
// Due modalità: 'uguale' (adatta i testi-esempio) | 'traccia' (contenuti originali).
// Su qualsiasi errore AI ripiega sui testi d'esempio (mai bloccare la creazione).

function addIdsToData(data) {
  const out = { ...(data || {}) }
  if (Array.isArray(out.items)) out.items = out.items.map(it => ({ id: randomUUID(), ...it }))
  if (Array.isArray(out.slides)) out.slides = out.slides.map(s => ({ id: randomUUID(), ...s }))
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

// L'AI genera una query foto (in inglese) mirata al business per ogni slot
// immagine del template, così le foto sono pertinenti al cliente e non generiche.
// Lavora su una copia; fallback: se l'AI fallisce o salta uno slot resta la query
// del template. Slot: hero.image_query, foto_testo/immagine.image_query,
// hero_slider slides[].image_query, carosello items[].image_query.
async function aiImageQueries(blocks, business) {
  const clone = JSON.parse(JSON.stringify(blocks))
  const refs = []
  for (const b of clone) {
    const d = b.data || {}
    if ((b.type === 'hero' || b.type === 'foto_testo' || b.type === 'immagine') && d.image_query) refs.push(d)
    if (b.type === 'hero_slider' && Array.isArray(d.slides)) for (const s of d.slides) if (s.image_query) refs.push(s)
    if (b.type === 'carosello'  && Array.isArray(d.items))  for (const it of d.items) if (it.image_query) refs.push(it)
  }
  if (!refs.length) return blocks

  const indexed = {}
  refs.forEach((r, i) => { indexed[i] = r.image_query })
  const prompt =
`Sei un esperto di stock photography (Unsplash). Per questo business, riscrivi ogni "soggetto immagine" come una query di ricerca foto in INGLESE: breve (2-5 parole), concreta e specifica per QUESTO business, mantenendo lo stesso ruolo/tipo di soggetto dell'originale (es. hero resta un'ambientazione, un piatto resta un piatto).
Restituisci SOLO un oggetto JSON con le STESSE chiavi numeriche: {"0":"query", ...}. Niente markdown, niente commenti.

Business:
${business}

Soggetti attuali (JSON {numero: soggetto}):
${JSON.stringify(indexed)}`

  const raw = await callClaude(prompt, 700)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  refs.forEach((r, i) => {
    const q = parsed[i]
    if (typeof q === 'string' && q.trim()) r.image_query = q.trim().slice(0, 80)
  })
  return clone
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { entity_tipo, entity_id, template_id, modalita = 'uguale', brief = '', answers = {} } = body
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
    .select('*').eq('id', entity_id).single()

  // Profilo business per l'AI: i dati raccolti nel wizard (settore/servizi/punti
  // forza/tono/target/obiettivo) — più ne arrivano, più i testi sono su misura.
  const a = answers || {}
  const business = [
    `Nome: ${ent?.name || '(senza nome)'}`,
    `Tipo: ${TIPO_LABEL[entity_tipo] || entity_tipo}`,
    a.settore     && `Settore: ${a.settore}`,
    `Descrizione: ${(a.descrizione && a.descrizione.trim()) || (brief && brief.trim()) || ent?.description || '(non fornita — usa un tono generico adatto al tipo)'}`,
    a.servizi     && `Servizi/prodotti principali:\n${a.servizi}`,
    a.punti_forza && `Punti di forza / cosa lo distingue:\n${a.punti_forza}`,
    a.obiettivo   && `Obiettivo del sito: ${a.obiettivo}`,
    a.tono        && `Tono di comunicazione: ${a.tono}`,
    a.target      && `Target principale: ${a.target}`,
    a.cta_text    && `Call to action preferita: ${a.cta_text}`,
  ].filter(Boolean).join('\n')

  // Aggancia i DATI REALI già inseriti (servizi, menu, attività, dotazioni, orari,
  // punti forza…): l'AI scrive testi fedeli a ciò che offre davvero, non generici.
  const entityData = entityDataSummary(ent, entity_tipo)
  const businessFull = entityData
    ? `${business}\n\n— DATI GIÀ INSERITI dall'utente (contenuti reali: usali per testi fedeli e per capire cosa offre davvero) —\n${entityData}`
    : business

  // Riempi i testi via AI; su errore ripiega sui testi d'esempio del template.
  let filledBlocks = tpl.blocks
  let aiUsed = true
  try {
    filledBlocks = await fillTexts(tpl.blocks, businessFull, modalita)
  } catch (e) {
    console.error('[ai-fill] AI fallita, uso testi esempio:', e?.message)
    aiUsed = false
  }

  // L'AI sceglie soggetti foto mirati al business; fallback: query template + settore.
  let imgAiOk = true
  try {
    filledBlocks = await aiImageQueries(filledBlocks, businessFull)
  } catch (e) {
    console.error('[ai-fill] query immagini AI fallite, uso quelle del template:', e?.message)
    imgAiOk = false
  }
  const terms = imgAiOk ? [] : [SECTOR_TERM[entity_tipo]].filter(Boolean)
  const blocks = await resolveBlockImages(withIds(filledBlocks), terms)

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
