import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess, ENTITY_TABLES } from '@/lib/server-auth'
import { getTemplate } from '@/lib/siteTemplates'
import { callClaude } from '@/lib/ai-helpers'
import { resolveBlockImages } from '@/lib/unsplash'
import { AI_BLOCKS_SCHEMA, AI_IMAGE_RULE, AI_BG_RULE, AI_ICONS } from '@/lib/ai-blocks'

export const maxDuration = 300  // Sonnet su doc grandi + output multi-pagina è lento; usiamo il max Vercel Pro (l'abort di callClaude è alzato a 285s sotto)

// "Ho già i contenuti": l'utente incolla un documento (es. generato con ChatGPT)
// con le sezioni già scritte. L'AI lo converte nei NOSTRI blocchi PRESERVANDO la
// struttura/testi del documento (non riempie un template fisso). Il look (tema)
// viene dal template scelto, la struttura+testi dal documento.
// `multipagina`: false → una one-page (home); true → l'AI spezza in più pagine
// SEGUENDO le sezioni del documento (home + chi-siamo/servizi/contatti…).

const TIPO_LABEL = { struttura: 'struttura ricettiva', ristorante: 'ristorante / locale', attivita: 'attività / servizio' }
const MENU_NOTE  = { ristorante: ' Se il documento parla del menù, includi un blocco "menu".' }
const DOC_MAX = 40000  // il doc si legge una volta per lo split; ogni pagina è poi una chiamata a sé (bounded)

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

// Esegue fn su ogni item con al massimo `limit` chiamate in parallelo (gentile sui
// rate-limit dell'API, ma molto più veloce che sequenziale).
async function mapPool(items, limit, fn) {
  const results = new Array(items.length)
  let idx = 0
  async function worker() {
    while (idx < items.length) { const i = idx++; results[i] = await fn(items[i], i) }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// Sezioni "componente" in fondo al documento (riassunti/blocchi riusabili): non sono
// pagine e non vanno duplicate nelle pagine → segnano la fine dell'ultima pagina.
const SUMMARY_RE = /^[ \t]*(TITOLO E CLAIM|CHI SIAMO BREVE|SERVIZI RIASSUNTO|PERCH[EÉ] SCEGLIERCI|COME FUNZIONA|NUMERI|RECENSIONI|PREZZI|FAQ|DOMANDE FREQUENTI|TEAM|FOOTER|NOTE SEO)/im

// Spezza un documento multi-pagina sui marcatori "PAGINA <NOME>" a inizio riga.
// Ritorna [{ name, content }] oppure null se non è un doc a pagine esplicite.
function splitPages(doc) {
  const re = /^[ \t]*PAGINA[ \t:>-]+(.+?)[ \t]*$/gim
  const marks = []
  let m
  while ((m = re.exec(doc)) !== null) marks.push({ name: m[1].trim(), start: m.index, bodyStart: re.lastIndex })
  if (marks.length < 2) return null
  // Il blocco "componenti riusabili" in fondo (recensioni/faq/team/numeri/prezzi) inizia
  // al primo marcatore riassunto dopo l'ultima pagina: le pagine si fermano lì.
  const lastBody = doc.slice(marks[marks.length - 1].bodyStart)
  const sm = lastBody.match(SUMMARY_RE)
  const summaryStart = sm ? marks[marks.length - 1].bodyStart + sm.index : doc.length
  const summary = doc.slice(summaryStart).trim()
  const pages = marks.map((mk, i) => {
    const to = i + 1 < marks.length ? marks[i + 1].start : summaryStart
    return { name: mk.name, content: doc.slice(mk.bodyStart, to).trim() }
  }).filter(p => p.content)
  // I componenti riusabili → sulla HOME, una volta sola (recensioni/faq/team/numeri/prezzi).
  if (summary && pages[0]) pages[0].content += `\n\n--- SEZIONI RIUSABILI (per la HOME) ---\n${summary}`
  return pages
}

function toTitle(s) {
  return (s || '').toLowerCase().replace(/\b\p{L}/gu, c => c.toUpperCase())
}

// Stile condiviso da TUTTE le pagine → coerenza visiva (ogni pagina è una chiamata a sé).
const STYLE_GUIDE = `STILE COERENTE (identico su TUTTE le pagine): sfondo di sezione CHIARO di default; usa 'dark'/'primary' SOLO per stats e cta_banner; hero/hero_slider con immagine di sfondo + overlay. Non variare lo stile pagina per pagina: stesso ritmo visivo ovunque.`

// Prompt per UNA pagina: output piccolo (niente troncamento), stile coerente, SEO dal doc.
function buildPagePrompt({ entity, entity_tipo, name, content, isHome }) {
  return `Sei un assistente che TRASCRIVE il contenuto di UNA pagina di un sito nei NOSTRI blocchi, INTEGRALMENTE, senza riassumere o saltare nulla.

⚠️ FEDELTÀ: riporta TUTTI i testi della pagina; usa quanti blocchi servono; gli ELENCHI (servizi, punti di forza, step, FAQ, numeri) → blocchi STRUTTURATI (highlights/paragrafi/steps/faq/stats), NON testo piatto; separa i paragrafi lunghi con una riga vuota (\\n\\n).

${AI_BLOCKS_SCHEMA}

${AI_IMAGE_RULE}

${AI_BG_RULE}

${AI_ICONS}

${STYLE_GUIDE}

MAPPATURA: apertura/claim → hero o hero_slider; chi siamo/storia → about o foto_testo; servizi/benefici → paragrafi/highlights/colonne; come funziona → steps; numeri → stats; recensioni → testimonianze; prezzi → pacchetti; domande → faq o accordion; team → team; call to action → cta_banner; contatti → form_builder; mappa/dove siamo → show_map o embed.${MENU_NOTE[entity_tipo] || ''}

${isHome ? 'Questa è la HOME: il PRIMO blocco = hero o hero_slider col claim/titolo principale. In fondo al contenuto potresti trovare "SEZIONI RIUSABILI": rendi RECENSIONI→testimonianze, FAQ/DOMANDE→faq, TEAM→team, NUMERI→stats, PREZZI→pacchetti. IGNORA invece eventuali sezioni "BREVE"/"RIASSUNTO", FOOTER e NOTE SEO (sono ripetizioni o istruzioni, NON contenuti da mostrare).' : `Questa è la pagina "${toTitle(name)}".`}

ENTITÀ (contesto): "${entity?.name || ''}" (${TIPO_LABEL[entity_tipo] || entity_tipo}).

CONTENUTO DELLA PAGINA:
"""
${content}
"""

Rispondi ESCLUSIVAMENTE con JSON valido (nessun testo prima o dopo). Popola seo_title e seo_description se il documento li indica (righe "SEO title"/"Meta description"):
${isHome
    ? '{"titolo":"...","seo_title":"...","seo_description":"...","theme":{"secondaryColor":"#RRGGBB"},"blocks":[{"type":"...","data":{...},"style":{}}]}'
    : '{"titolo":"...","seo_title":"...","seo_description":"...","blocks":[{"type":"...","data":{...},"style":{}}]}'}
Regole campi: rispetta ESATTAMENTE i nomi; button_url/cta1_url/form_token = "".`
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

  // ── Elenco pagine da generare ─────────────────────────────────────────────
  // Multi-pagina con marcatori "PAGINA X" → UNA chiamata AI per pagina (in parallelo
  // con pool): niente troncamento, stile coerente, nessun doppione. Altrimenti
  // fallback single-call (one-page, o multi senza marcatori espliciti).
  let pages = []   // { titolo, slug, nel_menu, seo_title, seo_description, blocks }
  let secondary = null

  const chunks = multi ? splitPages(doc) : null
  if (chunks && chunks.length >= 2) {
    const gen = await mapPool(chunks.slice(0, 15), 4, async (pc, i) => {
      const isHome = i === 0
      try {
        const raw = await callClaude(buildPagePrompt({ entity: ent, entity_tipo, name: pc.name, content: pc.content, isHome }), 6000, 'claude-sonnet-4-6', 120_000)
        const m = raw.match(/\{[\s\S]*\}/)
        const parsed = JSON.parse(m ? m[0] : raw)
        if (!Array.isArray(parsed.blocks) || !parsed.blocks.length) return null
        if (isHome && typeof parsed.theme?.secondaryColor === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.theme.secondaryColor.trim())) secondary = parsed.theme.secondaryColor.trim()
        return {
          titolo: (parsed.titolo || toTitle(pc.name)).slice(0, 120),
          slug: isHome ? '__home__' : slugify(pc.name).slice(0, 80),
          nel_menu: !isHome,
          seo_title: (parsed.seo_title || '').slice(0, 160),
          seo_description: (parsed.seo_description || '').slice(0, 300),
          blocks: parsed.blocks,
        }
      } catch (e) {
        console.error(`[from-document] pagina "${pc.name}" fallita:`, e?.message)
        return null
      }
    })
    pages = gen.filter(Boolean)
    if (!pages.length) return NextResponse.json({ error: 'Non sono riuscito a generare le pagine dal documento. Riprova.' }, { status: 502 })
  } else {
    let parsed
    try {
      const raw = await callClaude(buildPrompt({ entity: ent, entity_tipo, documento: doc, multi }), 16000, 'claude-sonnet-4-6', 285_000)
      const m = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(m ? m[0] : raw)
    } catch (e) {
      console.error('[from-document] parse/AI error:', e?.message)
      const aborted = /abort/i.test(e?.message || '')
      return NextResponse.json({
        error: aborted
          ? 'La generazione ha richiesto troppo tempo. Con documenti grandi conviene la modalità "una pagina", oppure riprova.'
          : 'Non sono riuscito a interpretare il documento. Riprova, o accorcialo un po\'.',
      }, { status: 502 })
    }
    if (typeof parsed.theme?.secondaryColor === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.theme.secondaryColor.trim())) secondary = parsed.theme.secondaryColor.trim()
    if (multi) {
      if (!Array.isArray(parsed.pages) || !parsed.pages.length) return NextResponse.json({ error: 'Nessuna pagina generata dal documento. Riprova.' }, { status: 502 })
      pages = parsed.pages.slice(0, 8).map((pg, i) => ({
        titolo: (pg.titolo || (i === 0 ? 'Home' : 'Pagina')).slice(0, 120),
        slug: (i === 0 || pg.slug === '__home__') ? '__home__' : slugify(pg.slug || pg.titolo).slice(0, 80),
        nel_menu: i !== 0 && pg.nel_menu !== false,
        seo_title: '', seo_description: '',
        blocks: Array.isArray(pg.blocks) ? pg.blocks : [],
      })).filter(p => p.blocks.length)
    } else {
      if (!Array.isArray(parsed.blocks) || !parsed.blocks.length) return NextResponse.json({ error: 'Nessun blocco generato dal documento. Riprova.' }, { status: 502 })
      pages = [{ titolo: 'Home', slug: '__home__', nel_menu: false, seo_title: '', seo_description: '', blocks: parsed.blocks }]
    }
  }

  // dedup per slug (tiene la prima occorrenza)
  const seen = new Set()
  pages = pages.filter(p => (seen.has(p.slug) ? false : (seen.add(p.slug), true)))

  // ── Scrittura con UPSERT per slug (rigenerare rimpiazza, NON duplica) ──────
  let created = 0
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i]
    const blocks = await resolveBlockImages(withIds(normalizeBlocks(pg.blocks)), [])
    const row = {
      titolo: pg.titolo, nel_menu: pg.nel_menu, status: 'pubblicata', blocks, ordine: i,
      ...(pg.seo_title ? { seo_title: pg.seo_title } : {}),
      ...(pg.seo_description ? { seo_description: pg.seo_description } : {}),
    }
    const { data: existing } = await supabaseAdmin.from('pagine').select('id')
      .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('slug', pg.slug).maybeSingle()
    if (existing) await supabaseAdmin.from('pagine').update(row).eq('id', existing.id)
    else await supabaseAdmin.from('pagine').insert({ entity_tipo, entity_id, slug: pg.slug, ...row })
    created++
  }

  // Tema: template scelto + accento suggerito dall'AI; attiva il minisito.
  const tpl = template_id ? getTemplate(template_id) : null
  const theme = { ...(ent?.theme || {}), ...(tpl?.theme || {}), ...(secondary ? { secondaryColor: secondary } : {}) }
  await supabaseAdmin.from(table).update({ theme, minisito: { ...(ent?.minisito || {}), active: true } }).eq('id', entity_id)

  return NextResponse.json({ ok: true, pages: created })
}
