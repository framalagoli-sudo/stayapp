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
  struttura:  ['description', 'rules', 'services', 'activities', 'excursions', 'minisito'],
  ristorante: ['description', 'menu', 'minisito'],
  attivita:   ['description', 'services', 'minisito'],
  pagina:     ['titolo', 'seo_title', 'seo_description', 'blocks'],
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
function collectStrings(node, prefix, out) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => collectStrings(v, prefix ? `${prefix}.${i}` : String(i), out))
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k
      if (typeof v === 'string') {
        if (!isConfigKey(k) && !isNonText(v)) out[path] = v
      } else if (v && typeof v === 'object') {
        collectStrings(v, path, out)
      }
    }
  }
  return out
}

function setByPath(root, path, value) {
  const segs = path.split('.')
  let cur = root
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur == null) return
    cur = cur[segs[i]]
  }
  if (cur != null) cur[segs[segs.length - 1]] = value
}

function applyTranslations(obj, map) {
  const clone = JSON.parse(JSON.stringify(obj))
  for (const [path, value] of Object.entries(map)) setByPath(clone, path, value)
  return clone
}

function hashSource(map) {
  const stable = JSON.stringify(Object.keys(map).sort().map(k => [k, map[k]]))
  return createHash('sha1').update(stable).digest('hex')
}

async function claudeTranslate(sourceMap, lang) {
  const entries = Object.entries(sourceMap)
  if (!entries.length) return {}
  const target = lang === 'en' ? 'English' : lang
  const prompt =
`Translate the following website texts from Italian to ${target}.
You receive a JSON object {key: text}. Return ONLY a JSON object with the SAME keys and the translated values. No commentary, no markdown fences.
Rules:
- Keep proper nouns unchanged: brand/business names, people's names, dish/menu item names, place names.
- Translate descriptions, taglines, labels, feature names (e.g. "Piscina" → "Pool"), questions and answers.
- Preserve tone and meaning. Do not add or remove text. Do not translate the keys.

JSON:
${JSON.stringify(sourceMap)}`

  // Stima token output: ~ caratteri/2 + margine; cap a 8000.
  const chars = entries.reduce((n, [, v]) => n + v.length, 0)
  const maxTokens = Math.min(8000, Math.max(1024, Math.ceil(chars / 2) + 512))

  const raw = await callClaude(prompt, maxTokens)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  // Tieni solo le chiavi note e con valore stringa (difesa da output sporco).
  const result = {}
  for (const [k] of entries) {
    if (typeof parsed[k] === 'string' && parsed[k].trim()) result[k] = parsed[k]
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

// Restituisce l'oggetto con i testi tradotti nella lingua richiesta.
// lang !== 'en' o errori → ritorna l'oggetto originale (italiano) invariato.
export async function localizeEntity(obj, entityTipo, lang) {
  if (lang !== 'en' || !obj || !obj.id) return obj
  try {
    const fields = TRANSLATABLE_FIELDS[entityTipo] || ['description', 'minisito']
    const subset = {}
    for (const f of fields) if (obj[f] != null) subset[f] = obj[f]
    const sourceMap = collectStrings(subset, '', {})
    if (!Object.keys(sourceMap).length) return obj
    const translated = await getCachedOrTranslate(entityTipo, obj.id, lang, sourceMap)
    return applyTranslations(obj, translated)
  } catch (e) {
    console.error('[translate] localizeEntity fallita:', e?.message)
    return obj
  }
}
