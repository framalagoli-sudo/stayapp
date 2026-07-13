import { createHash } from 'crypto'
import { supabaseAdmin } from './supabase-server'
import { callClaude } from './ai-helpers'

// Fase 2 multilingua: traduzione automatica del CONTENUTO (non solo UI), cachata.
// Strategia: lazy + cache. Alla prima visita EN di un'entità estraggo i testi
// traducibili in una mappa piatta {percorso: testo}, una sola chiamata Haiku,
// salvo in entity_translations con hash del sorgente → ritraduco solo se il
// contenuto IT cambia. Su QUALSIASI errore ripiego sull'italiano (mai pagina rotta).

// Campi top-level traducibili per tipo. Limitarsi a questi evita di toccare
// dati sensibili/letterali (wifi_password, indirizzi, orari, telefoni…).
const TRANSLATABLE_FIELDS = {
  struttura:  ['description', 'rules', 'amenities', 'services', 'activities', 'excursions', 'minisito'],
  ristorante: ['description', 'menu', 'minisito'],
  attivita:   ['description', 'services', 'minisito'],
  pagina:     ['titolo', 'seo_title', 'seo_description', 'blocks'],
  articolo:   ['title', 'excerpt', 'content'],
  evento:     ['title', 'description', 'location', 'packages'],
  // Form builder: solo testo display-only. MAI 'opzioni' (sono valori inviati + display:
  // tradurli romperebbe le submission e la logica condizionale) né tipo/operatore/condizione.
  form:       ['descrizione', 'campi'],
}

// Chiavi che NON sono prosa (config, id, identificatori, riferimenti). Match su
// nome chiave (lowercase) esatto o come suffisso `_xxx` / che termina con xxx.
const CONFIG_KEYS = [
  'id', 'slug', 'url', 'href', 'src', 'icon', 'color', 'image', 'photo', 'video',
  'logo', 'cover', 'favicon', 'font', 'fontheading', 'fontbody', 'style', 'layout',
  'headerstyle', 'borderstyle', 'type', 'variant', 'status', 'key', 'token', 'hash',
  'lang', 'locale', 'tracking', 'verification', 'whatsapp', 'phone', 'telefono',
  'email', 'piva', 'vat', 'partita_iva', 'cf', 'rea', 'lat', 'lng', 'lon',
  'timezone', 'currency', 'value', 'schedule', 'hours', 'orari', 'price', 'prezzo',
  'width', 'height', 'size', 'order', 'position', 'align', 'section_order',
  'sections', 'parent_id', 'entity_id', 'entity_tipo', 'gridtemplate',
  // Identificatori/enum/valori-dato (form builder, blocchi): NON sono prosa.
  'tipo', 'opzioni', 'valore', 'operatore', 'condizione', 'step', 'campo_id', 'redirect_url',
  'query', 'image_query',  // termini di ricerca immagini (Unsplash), non prosa
]

function isConfigKey(key) {
  const k = String(key).toLowerCase()
  return CONFIG_KEYS.some(d => k === d || k.endsWith('_' + d) || k.endsWith(d))
}

// Valore stringa che NON va tradotto (url, colore hex, email, telefono, numero,
// uuid, data ISO, o stringa senza lettere).
function isNonText(v) {
  const s = v.trim()
  if (!s) return true
  if (/^https?:\/\//i.test(s) || /^\//.test(s) || /^www\./i.test(s)) return true
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return true
  if (/^\S+@\S+\.\S+$/.test(s)) return true
  if (/^[+\d][\d\s().\-]{5,}$/.test(s)) return true
  if (/^\d+([.,]\d+)?$/.test(s)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(s)) return true
  if (!/[a-zA-Z]/.test(s)) return true
  return false
}

// Raccoglie i testi traducibili in {percorso: testo}. I percorsi usano '.' e
// indicizzano gli array per numero (es. "minisito.highlights.0.text").
export function collectStrings(node, prefix, out) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      const p = prefix ? `${prefix}.${i}` : String(i)
      // Elementi stringa di un array (es. amenities ["Wi-Fi","Piscina"]) vanno raccolti.
      if (typeof v === 'string') { if (!isNonText(v)) out[p] = v }
      else if (v && typeof v === 'object') collectStrings(v, p, out)
    })
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      // Denylist a monte: salta le chiavi config anche se array/oggetto
      // (opzioni, section_order, condizione, sections…) → niente da tradurre lì.
      if (isConfigKey(k)) continue
      const path = prefix ? `${prefix}.${k}` : k
      if (typeof v === 'string') {
        if (!isNonText(v)) out[path] = v
      } else if (v && typeof v === 'object') {
        collectStrings(v, path, out)
      }
    }
  }
  return out
}

const UNSAFE_KEY = k => k === '__proto__' || k === 'constructor' || k === 'prototype'
function setByPath(root, path, value) {
  const segs = path.split('.')
  if (segs.some(UNSAFE_KEY)) return // anti prototype-pollution: mai scrivere su __proto__/constructor/prototype
  let cur = root
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur == null) return
    cur = cur[segs[i]]
  }
  if (cur != null) cur[segs[segs.length - 1]] = value
}

export function applyTranslations(obj, map) {
  const clone = JSON.parse(JSON.stringify(obj))
  for (const [path, value] of Object.entries(map)) setByPath(clone, path, value)
  return clone
}

// Bump quando cambiano le istruzioni di traduzione: invalida le cache esistenti
// (l'hash cambia → ri-traduzione alla prossima visita EN).
const PROMPT_VERSION = 'v4'

function hashSource(map) {
  const stable = JSON.stringify(Object.keys(map).sort().map(k => [k, map[k]]))
  return createHash('sha1').update(PROMPT_VERSION + '|' + stable).digest('hex')
}

// Traduce un singolo blocco di voci. Usa chiavi NUMERICHE (non le path lunghe) per
// non gonfiare l'output JSON → evita troncamenti/overflow di token.
async function translateChunk(entries, lang) {
  const target = lang === 'en' ? 'English' : lang
  const indexed = {}
  entries.forEach(([, v], i) => { indexed[i] = v })
  const prompt =
`Translate the following website texts from Italian to ${target}.
You receive a JSON object {number: text}. Return ONLY a JSON object with the SAME numeric keys and the translated values. No commentary, no markdown fences.
Rules:
- Keep unchanged: brand/business names, people's names, place names, and iconic Italian dish names (e.g. Carbonara, Tiramisù, Pizza Margherita, Amatriciana).
- TRANSLATE everything else, including dish DESCRIPTIONS and descriptive menu item names (e.g. "Tartare di salmone norvegese, avocado e cialda ai semi" → "Norwegian salmon tartare, avocado and seeded wafer").
- Translate descriptions, taglines, labels, feature names (e.g. "Piscina" → "Pool"), questions and answers.
- Keep any HTML tags, markdown and placeholders exactly as they are; translate only the visible text.
- Preserve tone and meaning. Do not add or remove text. Do not translate the keys.

JSON:
${JSON.stringify(indexed)}`

  const chars = entries.reduce((n, [, v]) => n + v.length, 0)
  const maxTokens = Math.min(8000, Math.max(1024, Math.ceil(chars / 1.4) + 800))
  const raw = await callClaude(prompt, maxTokens)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  const out = {}
  entries.forEach(([k], i) => {
    if (typeof parsed[i] === 'string' && parsed[i].trim()) out[k] = parsed[i]
  })
  return out
}

async function claudeTranslate(sourceMap, lang) {
  const entries = Object.entries(sourceMap)
  if (!entries.length) return {}
  // Chunking per ~2500 caratteri di valore: ogni chiamata resta ben sotto i limiti
  // di output → niente più fallback totale su menu/contenuti grandi.
  const chunks = []
  let cur = [], curChars = 0
  for (const e of entries) {
    cur.push(e); curChars += (e[1] || '').length
    if (curChars >= 2500) { chunks.push(cur); cur = []; curChars = 0 }
  }
  if (cur.length) chunks.push(cur)

  const result = {}
  for (const chunk of chunks) {
    // Resilienza: un blocco che fallisce non azzera la traduzione degli altri.
    try { Object.assign(result, await translateChunk(chunk, lang)) }
    catch (e) { console.error('[translate] blocco fallito:', e?.message) }
  }
  return result
}

async function getCachedOrTranslate(entityTipo, entityId, lang, sourceMap) {
  const sourceHash = hashSource(sourceMap)
  const { data: row } = await supabaseAdmin
    .from('entity_translations')
    .select('source_hash, translations, overrides')
    .eq('entity_tipo', entityTipo)
    .eq('entity_id', entityId)
    .eq('lang', lang)
    .maybeSingle()

  const overrides = row?.overrides || {}
  if (row && row.source_hash === sourceHash) {
    return { ...row.translations, ...overrides }  // override manuali (Fase 3) hanno priorità
  }

  const translations = await claudeTranslate(sourceMap, lang)
  await supabaseAdmin
    .from('entity_translations')
    .upsert({
      entity_tipo: entityTipo,
      entity_id: entityId,
      lang,
      source_hash: sourceHash,
      translations,
      overrides,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'entity_tipo,entity_id,lang' })

  return { ...translations, ...overrides }
}

// Mappa {percorso: testo IT} dei campi traducibili di un'entità/record.
// Usata sia dal motore di traduzione sia dall'editor admin (Fase 3).
export function getTranslatableSource(obj, entityTipo) {
  if (!obj) return {}
  const fields = TRANSLATABLE_FIELDS[entityTipo] || ['description', 'minisito']
  const subset = {}
  for (const f of fields) if (obj[f] != null) subset[f] = obj[f]
  return collectStrings(subset, '', {})
}

// Restituisce l'oggetto con i testi tradotti nella lingua richiesta.
// lang !== 'en' o errori → ritorna l'oggetto originale (italiano) invariato.
export async function localizeEntity(obj, entityTipo, lang) {
  if (lang !== 'en' || !obj || !obj.id) return obj
  try {
    const sourceMap = getTranslatableSource(obj, entityTipo)
    if (!Object.keys(sourceMap).length) return obj
    const translated = await getCachedOrTranslate(entityTipo, obj.id, lang, sourceMap)
    return applyTranslations(obj, translated)
  } catch (e) {
    console.error('[translate] localizeEntity fallita:', e?.message)
    return obj
  }
}
