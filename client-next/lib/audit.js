import { supabaseAdmin } from './supabase-server'
import { getClientIp } from './rate-limit'

// Registro delle azioni amministrative: chi ha fatto cosa, quando e da dove.
// Serve dopo, non prima: se una sessione viene rubata, è l'unico modo per
// ricostruire cosa ha toccato l'intruso. Il registro si era fermato il 9/6/2026,
// quando la migrazione a Next ha lasciato indietro il middleware che lo scriveva.
//
// Si registrano solo le MUTAZIONI: le letture sarebbero un volume enorme senza
// aggiungere nulla a "chi ha cambiato cosa".
const METODI_TRACCIATI = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

// Campi che non devono finire in chiaro in un registro conservato a lungo.
const CAMPI_SENSIBILI = /password|secret|token|api[_-]?key|service[_-]?role|authorization|credential|otp|code$/i

// Un payload può essere enorme (il menù di un ristorante è centinaia di KB): il
// registro deve dire cosa è stato toccato, non archiviare i dati.
const PAYLOAD_MAX = 4000

function redigi(valore, profondita = 0) {
  if (valore === null || typeof valore !== 'object' || profondita > 4) return valore
  if (Array.isArray(valore)) {
    // Delle liste lunghe interessa la dimensione, non ogni elemento.
    if (valore.length > 10) return `[${valore.length} elementi]`
    return valore.map(v => redigi(v, profondita + 1))
  }
  const out = {}
  for (const [k, v] of Object.entries(valore)) {
    out[k] = CAMPI_SENSIBILI.test(k) ? '[REDACTED]' : redigi(v, profondita + 1)
  }
  return out
}

// Il body va letto da un clone: la route deve poterlo leggere a sua volta.
async function estraiPayload(request) {
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) return null
    const body = await request.clone().json()
    const redatto = redigi(body)
    const testo = JSON.stringify(redatto)
    return testo.length > PAYLOAD_MAX
      ? { _troncato: true, _dimensione: testo.length, campi: Object.keys(body || {}) }
      : redatto
  } catch { return null }
}

// /api/properties/{id}/qualcosa → { entity_tipo: 'properties', entity_id: '{id}' }
function entitaDalPath(pathname) {
  const parti = pathname.replace(/^\/api\//, '').split('/').filter(Boolean)
  const uuid = parti.find(p => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p))
  return { entity_tipo: parti[0] || null, entity_id: uuid || null }
}

// Non lancia mai e non blocca la risposta: un registro che rompe l'applicazione
// verrebbe disattivato al primo incidente, ed è esattamente quando serve.
export async function registraAudit(request, { user, statusCode = null } = {}) {
  try {
    if (!METODI_TRACCIATI.has(request.method)) return
    const url = new URL(request.url)
    const { entity_tipo, entity_id } = entitaDalPath(url.pathname)

    await supabaseAdmin.from('audit_log').insert({
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      method: request.method,
      path: url.pathname,
      entity_tipo,
      entity_id,
      payload: await estraiPayload(request),
      ip: getClientIp(request),
      status_code: statusCode,
    })
  } catch (e) {
    console.error('[audit]', e.message)
  }
}
