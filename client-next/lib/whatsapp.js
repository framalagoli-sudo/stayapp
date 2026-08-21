import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import { definizioneMeta, nomeMeta } from './whatsapp-catalogo'

// Unico punto di contatto con l'API di Meta, come lib/vercel-domains.js lo è per
// Vercel: nessun'altra parte del codice deve parlare con Graph. Se un giorno
// cambiasse il fornitore (o si passasse a un intermediario), si riscrive solo qui.
const GRAPH = 'https://graph.facebook.com/v21.0'

const META_APP_ID     = process.env.META_APP_ID?.trim()
const META_APP_SECRET = process.env.META_APP_SECRET?.trim()
// Chiave con cui cifriamo i token dei clienti. Senza, il modulo resta spento:
// meglio non funzionare che tenere in chiaro un token che dà accesso completo
// all'account WhatsApp di un cliente.
const CHIAVE = process.env.WHATSAPP_TOKEN_KEY?.trim()

export function whatsappConfigurato() {
  return !!(META_APP_ID && META_APP_SECRET && CHIAVE)
}

// ── Cifratura del token ───────────────────────────────────────────────────────
// AES-256-GCM: oltre a cifrare, garantisce che il testo non sia stato manomesso.
const chiaveBuffer = () => createHash('sha256').update(String(CHIAVE)).digest()

export function cifra(testo) {
  if (!testo) return null
  if (!CHIAVE) throw new Error('WHATSAPP_TOKEN_KEY non configurata: impossibile custodire il token')
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', chiaveBuffer(), iv)
  const dati = Buffer.concat([c.update(String(testo), 'utf8'), c.final()])
  return [iv.toString('base64'), c.getAuthTag().toString('base64'), dati.toString('base64')].join('.')
}

export function decifra(pacchetto) {
  if (!pacchetto || !CHIAVE) return null
  try {
    const [iv, tag, dati] = String(pacchetto).split('.')
    const d = createDecipheriv('aes-256-gcm', chiaveBuffer(), Buffer.from(iv, 'base64'))
    d.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([d.update(Buffer.from(dati, 'base64')), d.final()]).toString('utf8')
  } catch {
    return null
  }
}

// ── Chiamate ──────────────────────────────────────────────────────────────────
// Non lancia mai: { ok, data, error } così le route restano leggibili e un guasto
// di Meta non diventa un 500 opaco per il cliente.
async function graph(path, { method = 'GET', token, body, query } = {}) {
  try {
    const url = new URL(`${GRAPH}${path}`)
    for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v)
    const res = await fetch(url, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json().catch(() => null)
    if (data?.error) return { ok: false, status: res.status, data, error: messaggioMeta(data.error) }
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : `Meta HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e.name === 'TimeoutError' ? 'Meta non risponde' : e.message }
  }
}

// Gli errori di Meta sono in inglese e parlano di oggetti tecnici: al cliente
// serve sapere cosa fare lui.
function messaggioMeta(err) {
  const t = `${err?.message || ''} ${err?.error_user_msg || ''}`.trim()
  if (/rate limit|too many/i.test(t)) return 'Troppe richieste verso WhatsApp: riprova tra qualche minuto.'
  if (/permission|OAuth|token/i.test(t)) return 'Il collegamento con WhatsApp non è più valido: ricollega il numero.'
  if (/payment|billing/i.test(t)) return 'WhatsApp segnala un problema con il metodo di pagamento sull’account Meta del cliente.'
  return err?.error_user_msg || err?.message || 'Errore da Meta'
}

// ── Collegamento del numero ───────────────────────────────────────────────────
// Embedded Signup restituisce un codice: si scambia con un token di accesso
// duraturo, che è quello che custodiamo cifrato.
export async function scambiaCodice(code) {
  const r = await graph('/oauth/access_token', {
    query: { client_id: META_APP_ID, client_secret: META_APP_SECRET, code },
  })
  return r.ok ? { ok: true, token: r.data?.access_token } : r
}

// Quali account e numeri ha collegato il cliente.
export async function leggiAccount(token) {
  return await graph('/debug_token', { token, query: { input_token: token } })
}

export async function leggiNumeri(wabaId, token) {
  return await graph(`/${wabaId}/phone_numbers`, { token, query: { fields: 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier' } })
}

// ── Template ──────────────────────────────────────────────────────────────────
export async function creaTemplate(wabaId, token, definizione) {
  const r = await graph(`/${wabaId}/message_templates`, { method: 'POST', token, body: definizione })
  // Un template già presente non è un errore: capita ricollegando un numero.
  if (!r.ok && /already exists/i.test(r.error || '')) return { ok: true, data: { esistente: true } }
  return r
}

export async function statoTemplate(wabaId, token, nome) {
  const r = await graph(`/${wabaId}/message_templates`, { token, query: { name: nome, fields: 'id,name,status,rejected_reason,category' } })
  if (!r.ok) return r
  const t = (r.data?.data || [])[0]
  return { ok: true, data: t || null }
}

// Crea sull'account del cliente tutti i template del nostro catalogo.
export async function creaCatalogo(wabaId, token, catalogo) {
  const esiti = []
  for (const t of catalogo) {
    const r = await creaTemplate(wabaId, token, definizioneMeta(t))
    esiti.push({
      key: t.key,
      versione: t.versione,
      nome_meta: nomeMeta(t.key, t.versione),
      ok: r.ok,
      template_meta_id: r.data?.id || null,
      errore: r.ok ? null : r.error,
    })
  }
  return esiti
}

// ── Invio ─────────────────────────────────────────────────────────────────────
// Un messaggio template a un destinatario. I valori vanno nell'ordine in cui
// compaiono nel testo: {{1}}, {{2}}, …
export async function inviaTemplate({ phoneNumberId, token, a, nomeTemplate, valori = [] }) {
  return await graph(`/${phoneNumberId}/messages`, {
    method: 'POST',
    token,
    body: {
      messaging_product: 'whatsapp',
      to: a.replace('+', ''),
      type: 'template',
      template: {
        name: nomeTemplate,
        language: { code: 'it' },
        ...(valori.length
          ? { components: [{ type: 'body', parameters: valori.map(v => ({ type: 'text', text: String(v ?? '') })) }] }
          : {}),
      },
    },
  })
}

// ── Costo ─────────────────────────────────────────────────────────────────────
// Tariffe indicative usate SOLO per mostrare una stima prima dell'invio: il conto
// vero lo fa Meta sull'account del cliente. Vanno riviste quando Meta le cambia.
const TARIFFE = { MARKETING: 0.0570, UTILITY: 0.0250 }

export function stimaCosto(categoria, destinatari) {
  const tariffa = TARIFFE[categoria] ?? TARIFFE.MARKETING
  return Math.round(tariffa * Number(destinatari || 0) * 100) / 100
}

// Il numero va scritto come lo vuole WhatsApp: cifre, senza segni.
export const numeroValido = n => /^\+\d{8,15}$/.test(String(n || '').trim())
