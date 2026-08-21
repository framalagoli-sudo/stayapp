import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { logError } from '@/lib/observability'

// Notifiche di Meta: consegnato, letto, fallito, e i messaggi in arrivo.
//
// Questa route è PUBBLICA per forza (la chiama Meta), quindi la firma va
// verificata sempre: senza, chiunque conoscesse l'indirizzo potrebbe falsificare
// gli esiti delle campagne o riempire il registro di spazzatura.
export const dynamic = 'force-dynamic'

const APP_SECRET = process.env.META_APP_SECRET?.trim()
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_TOKEN?.trim()

// Meta chiama in GET una volta sola, per verificare che l'indirizzo sia nostro.
export async function GET(request) {
  const p = new URL(request.url).searchParams
  if (p.get('hub.mode') === 'subscribe' && VERIFY_TOKEN && p.get('hub.verify_token') === VERIFY_TOKEN) {
    return new Response(p.get('hub.challenge') || '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

function firmaValida(corpo, intestazione) {
  if (!APP_SECRET || !intestazione?.startsWith('sha256=')) return false
  const atteso = createHmac('sha256', APP_SECRET).update(corpo, 'utf8').digest('hex')
  const ricevuto = intestazione.slice(7)
  if (atteso.length !== ricevuto.length) return false
  // Confronto a tempo costante: un confronto normale lascia dedurre la firma
  // un carattere alla volta.
  return timingSafeEqual(Buffer.from(atteso), Buffer.from(ricevuto))
}

const QUANDO = { sent: 'inviato', delivered: 'consegnato', read: 'letto', failed: 'fallito' }

export async function POST(request) {
  try {
    const corpo = await request.text()
    if (!firmaValida(corpo, request.headers.get('x-hub-signature-256'))) {
      return new Response('Firma non valida', { status: 401 })
    }

    const evento = JSON.parse(corpo)
    for (const entry of evento.entry || []) {
      for (const change of entry.changes || []) {
        const v = change.value || {}

        // Esiti dei messaggi inviati
        for (const s of v.statuses || []) {
          const stato = QUANDO[s.status]
          if (!stato) continue

          const patch = { stato }
          if (stato === 'consegnato') patch.consegnato_il = new Date().toISOString()
          if (stato === 'letto') patch.letto_il = new Date().toISOString()
          if (stato === 'fallito') patch.errore = s.errors?.[0]?.title || s.errors?.[0]?.message || 'Invio fallito'

          const { data: msg } = await supabaseAdmin
            .from('whatsapp_messaggio')
            .update(patch)
            .eq('message_id_meta', s.id)
            .select('campagna_id, stato')
            .maybeSingle()

          if (msg?.campagna_id) await aggiornaContatori(msg.campagna_id)
        }

        // Messaggi in arrivo: per ora si registra solo chi ha scritto STOP, che
        // vale come revoca del consenso e va rispettata subito.
        for (const m of v.messages || []) {
          const testo = (m.text?.body || '').trim().toUpperCase()
          if (!['STOP', 'BASTA', 'CANCELLAMI', 'UNSUBSCRIBE'].includes(testo)) continue
          const numero = `+${String(m.from || '').replace(/\D/g, '')}`
          await supabaseAdmin
            .from('contatti')
            .update({ whatsapp_optin: false, whatsapp_optout_il: new Date().toISOString() })
            .eq('telefono', numero)
        }
      }
    }
    // A Meta si risponde sempre 200: un errore nostro non deve farle ritentare
    // all'infinito. I problemi finiscono nei log, non nella risposta.
    return Response.json({ ok: true })
  } catch (e) {
    await logError('whatsapp/webhook', e)
    return Response.json({ ok: true })
  }
}

// I contatori sulla campagna si ricalcolano dai messaggi: sommare a mano
// porterebbe fuori registro appena un webhook arriva due volte (e arriva).
async function aggiornaContatori(campagnaId) {
  const { data } = await supabaseAdmin.from('whatsapp_messaggio').select('stato').eq('campagna_id', campagnaId)
  const conta = s => (data || []).filter(m => m.stato === s).length
  await supabaseAdmin.from('whatsapp_campagna').update({
    inviati: (data || []).filter(m => m.stato !== 'in_coda' && m.stato !== 'fallito').length,
    consegnati: conta('consegnato') + conta('letto'),
    letti: conta('letto'),
    falliti: conta('fallito'),
    updated_at: new Date().toISOString(),
  }).eq('id', campagnaId)
}
