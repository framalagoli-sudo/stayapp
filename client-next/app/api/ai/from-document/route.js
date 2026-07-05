import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess, ENTITY_TABLES } from '@/lib/server-auth'
import { getTemplate } from '@/lib/siteTemplates'
import { callClaude } from '@/lib/ai-helpers'
import { resolveBlockImages } from '@/lib/unsplash'
import { AI_BLOCKS_SCHEMA, AI_IMAGE_RULE, AI_BG_RULE, AI_ICONS } from '@/lib/ai-blocks'

export const maxDuration = 120  // Sonnet + output ampio può superare i 60s (callClaude aborta a 90s)

// "Ho già i contenuti": l'utente incolla un documento (es. generato con ChatGPT)
// con le sezioni già scritte. L'AI lo converte nei NOSTRI blocchi PRESERVANDO la
// struttura/testi del documento (non riempie un template fisso). Il look (tema)
// viene dal template scelto, la struttura+testi dal documento.
// `multipagina`: false → una one-page (home); true → l'AI spezza in più pagine
// SEGUENDO le sezioni del documento (home + chi-siamo/servizi/contatti…).

const TIPO_LABEL = { struttura: 'struttura ricettiva', ristorante: 'ristorante / locale', attivita: 'attività / servizio' }
const MENU_NOTE  = { ristorante: ' Se il documento parla del menù, includi un blocco "menu".' }
const DOC_MAX = 25000  // limite input (MVP: no chunking; doc più lunghi → v2 chunking)

function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pagina'
}
function addIdsToData(data) {
  const out = { ...(data || {}) }
  for (const k of Object.keys(out)) {
    if (Array.isArray(out[k])) out[k] = out[k].map(it => (it && typeof it === 'object' ? { id: randomUUID(), ...it } : it))
  }
  return out
}
function withIds(blocks) { return (blocks || []).map(b => ({ ...b, id: randomUUID(), data: addIdsToData(b.data) })) }

function normalizeBlocks(blocks) {
  return (blocks || []).slice(0, 40).map(b =>
    b.type === 'contatti' ? { ...b, type: 'form_builder', data: { form_token: '', titolo_sezione: 'Contattaci', ...(b.data || {}) } } : b
  )
}

function buildPrompt({ entity, entity_tipo, documento, multi }) {
  const output = multi
    ? `Il documento può prevedere PIÙ PAGINE. Crea le pagine SEGUENDO la struttura del documento: la 1ª è la Home (slug "__home__", nel_menu false); le altre sono pagine tematiche (es. chi-siamo, servizi, contatti) con slug breve e nel_menu true. Se il documento indica PAGINE esplicite (es. "PAGINA 1: HOME", "PAGINA 2: CHI SIAMO", "PAGINA 3: ..."), crea UNA pagina per ciascuna con quel titolo e quei contenuti. NON creare pagine che il documento non suggerisce — meglio poche pagine piene che tante vuote. Massimo 5 pagine.
Rispondi ESCLUSIVAMENTE con JSON valido (nessun testo prima o dopo):
{"theme":{"secondaryColor":"#RRGGBB"},"pages":[{"titolo":"...","slug":"...","nel_menu":false,"blocks":[{"type":"...","data":{...},"style":{}}]}]}`
    : `Convertilo in UNA SOLA pagina (one-page): tutte le sezioni impilate nella home.
Rispondi ESCLUSIVAMENTE con JSON valido (nessun testo prima o dopo):
{"theme":{"secondaryColor":"#RRGGBB"},"blocks":[{"type":"...","data":{...},"style":{}}]}`

  return `Sei un assistente che TRASCRIVE un documento in una struttura di blocchi per un sito web. Un cliente ti dà un DOCUMENTO coi contenuti del suo sito (sezioni, titoli, testi). Devi riportare INTEGRALMENTE tutti i contenuti nei NOSTRI blocchi.

⚠️ REGOLE DI FEDELTÀ (le più importanti, prima di tutto):
- NON riassumere, NON accorciare, NON accorpare, NON saltare nulla. OGNI sezione, paragrafo e testo del documento deve finire in un blocco.
- Usa QUANTI BLOCCHI SERVONO (anche 20-30): è meglio avere molti blocchi che perdere contenuti. Se un contenuto non ha un blocco dedicato, mettilo comunque in 'about', 'foto_testo' o 'paragrafi' — MAI scartarlo.
- Mantieni i testi del cliente il più fedeli possibile: puoi solo adattare la forma per il web (titoli, elenchi), NON tagliare il contenuto.
- NON inventare sezioni che nel documento non ci sono.
- L'INPUT PUÒ ARRIVARE NON FORMATTATO (titoli attaccati al testo tipo "INVESTMENTSTRUTTURA", doppi spazi al posto degli a-capo). RICOSTRUISCI TU la struttura: riconosci i titoli di sezione (di solito in MAIUSCOLO o seguiti da ":", es. TITOLO E CLAIM, CHI SIAMO, PERCHÉ SCEGLIERCI, NUMERI, SERVIZI, COME FUNZIONA, TEAM, DOMANDE FREQUENTI, CONTATTI, COSA FARE ORA) e usali per scegliere i blocchi.
- Trasforma gli ELENCHI (punti di forza, servizi, fasi/step, FAQ, numeri) in blocchi STRUTTURATI (highlights, paragrafi, steps, faq, stats) — NON in un unico testo piatto.

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
- Ribadisco: riporta TUTTO il documento, non perdere nessuna sezione né dettaglio (è l'errore più grave).
- Nei testi lunghi (es. about, foto_testo) SEPARA i paragrafi con una RIGA VUOTA (doppio a-capo \\n\\n): non incollare più paragrafi in un unico blocco senza stacchi, altrimenti sul sito il testo appare tutto attaccato.
- Il primo blocco della Home = hero_slider o hero col titolo/claim principale del documento.
- Metti un form_builder (contatti) dove il documento accenna ai contatti.
- Testi in italiano, fedeli al documento (niente "Lorem ipsum" o placeholder).
- Rispetta ESATTAMENTE i nomi dei campi. button_url/cta1_url/form_token = "".
${output}`
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { entity_tipo, entity_id, documento = '', template_id, multipagina = false } = body
  if (!entity_tipo || !entity_id || !documento.trim()) {
    return NextResponse.json({ error: 'Parametri mancanti (documento vuoto)' }, { status: 400 })
  }

  const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
  if (response) return response

  const table = ENTITY_TABLES[entity_tipo]
  if (!table) return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })

  const { data: ent } = await supabaseAdmin.from(table).select('name, theme, minisito').eq('id', entity_id).single()

  const doc = documento.trim().slice(0, DOC_MAX)
  const multi = !!multipagina
  const prompt = buildPrompt({ entity: ent, entity_tipo, documento: doc, multi })

  let parsed
  try {
    // Sonnet (più fedele di Haiku) + output ampio: serve trascrivere, non riassumere.
    const raw = await callClaude(prompt, 16000, 'claude-sonnet-4-6')
    const m = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(m ? m[0] : raw)
  } catch (e) {
    console.error('[from-document] parse/AI error:', e?.message)
    return NextResponse.json({ error: 'Non sono riuscito a interpretare il documento (forse troppo lungo). Prova ad accorciarlo o riprova.' }, { status: 502 })
  }

  // Normalizza in un array di pagine (one-page = 1 sola pagina home).
  let pages
  if (multi) {
    if (!Array.isArray(parsed.pages) || !parsed.pages.length) {
      return NextResponse.json({ error: 'Nessuna pagina generata dal documento. Riprova.' }, { status: 502 })
    }
    pages = parsed.pages.slice(0, 5)
  } else {
    if (!Array.isArray(parsed.blocks) || !parsed.blocks.length) {
      return NextResponse.json({ error: 'Nessun blocco generato dal documento. Riprova.' }, { status: 502 })
    }
    pages = [{ titolo: 'Home', slug: '__home__', nel_menu: false, blocks: parsed.blocks }]
  }

  let created = 0
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i]
    const isHome = i === 0 || pg.slug === '__home__'
    const blocks = await resolveBlockImages(withIds(normalizeBlocks(pg.blocks)), [])

    if (isHome) {
      const { data: existing } = await supabaseAdmin.from('pagine').select('id')
        .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('slug', '__home__').maybeSingle()
      if (existing) {
        await supabaseAdmin.from('pagine').update({ blocks, status: 'pubblicata', titolo: pg.titolo || 'Home', nel_menu: false }).eq('id', existing.id)
      } else {
        await supabaseAdmin.from('pagine').insert({
          entity_tipo, entity_id, titolo: pg.titolo || 'Home', slug: '__home__', nel_menu: false, status: 'pubblicata', blocks, ordine: 0,
        })
      }
    } else {
      let slug = slugify(pg.slug || pg.titolo).slice(0, 80)
      const { count } = await supabaseAdmin.from('pagine').select('id', { count: 'exact', head: true })
        .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('slug', slug)
      if (count > 0) slug = `${slug}-${Date.now().toString(36)}`
      await supabaseAdmin.from('pagine').insert({
        entity_tipo, entity_id, titolo: pg.titolo || 'Pagina', slug, nel_menu: pg.nel_menu !== false, status: 'pubblicata', blocks, ordine: i,
      })
    }
    created++
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

  return NextResponse.json({ ok: true, pages: created })
}
