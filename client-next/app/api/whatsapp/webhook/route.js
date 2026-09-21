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

        // ── Eventi sull'account del cliente ──────────────────────────────────
        // ⚠️ `account_update` è **obbligatorio** per l'Embedded Signup: è così
        // che Meta dice che un cliente ha finito il collegamento. Ma soprattutto
        // è l'unico modo per sapere che un account si è **staccato** — e con la
        // coesistenza succede da solo dopo ~14 giorni che il cliente non apre
        // l'app. Senza, per lui sarebbe «WhatsApp non funziona più» e la colpa
        // sarebbe nostra.
        if (change.field === 'account_update') {
          await gestisciAccount(entry.id, v)
          continue
        }

        // ── Esito dei modelli ────────────────────────────────────────────────
        // Un modello si manda a Meta e si aspetta: senza questo il cliente lo
        // crea e resta a guardare il vuoto, perché l'approvazione arriva solo
        // di qui.
        if (change.field === 'message_template_status_update') {
          await gestisciModello(v)
          continue
        }

        // ── Messaggi scritti dal cliente dalla SUA app (coesistenza) ─────────
        // Arrivano come `smb_message_echoes`. Oggi si accettano e basta: il
        // pannello non ha ancora una casella delle conversazioni, e salvarli
        // senza un posto dove leggerli sarebbe accumulare dati che non servono
        // a nessuno. Quando la casella ci sarà, è qui che si entra.
        if (change.field === 'smb_message_echoes') continue

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

// Gli eventi che dicono «questo account non può più mandare messaggi». I nomi
// sono quelli della documentazione di Meta, non inventati: un evento che non
// conosciamo si registra e basta, non si tratta come un guasto.
const EVENTI_BRUTTI = [
  'ACCOUNT_DELETED',        // l'account non c'è più
  'ACCOUNT_RESTRICTION',    // limitato per violazioni
  'ACCOUNT_VIOLATION',      // violazione delle policy
  'DISABLED_UPDATE',        // disabilitato
  'PARTNER_REMOVED',        // il cliente ci ha tolto l'accesso
  'PARTNER_APP_UNINSTALLED',
  'ACCOUNT_OFFBOARDED',     // numero/dispositivo disattivato — il caso della coesistenza
]

async function gestisciAccount(wabaId, v) {
  if (!wabaId) return
  const tipo = v.event || 'SCONOSCIUTO'
  const brutto = EVENTI_BRUTTI.includes(tipo)
  const riconnesso = tipo === 'ACCOUNT_RECONNECTED'

  // Un WABA può avere più numeri (migration 122): l'evento riguarda l'account,
  // quindi tocca tutte le righe che ne dipendono.
  const { data: righe } = await supabaseAdmin.from('whatsapp_account')
    .select('id, azienda_id, dettaglio, stato').eq('waba_id', wabaId)

  for (const r of righe || []) {
    const patch = {
      dettaglio: { ...(r.dettaglio || {}), ultimo_evento: { tipo, quando: new Date().toISOString(), dati: v } },
      updated_at: new Date().toISOString(),
    }
    // Lo stato si tocca solo quando l'evento lo dice davvero: un evento
    // informativo non deve spegnere un numero che funziona.
    if (brutto) patch.stato = 'sospeso'
    if (riconnesso && r.stato === 'sospeso') patch.stato = 'attivo'
    await supabaseAdmin.from('whatsapp_account').update(patch).eq('id', r.id)
  }

  // Un account che si stacca è la cosa che il cliente scoprirebbe da solo, nel
  // modo peggiore: scrivendo e non ricevendo risposta. Meglio saperlo noi.
  if (brutto) {
    await logError('whatsapp/account', new Error(`WhatsApp: ${tipo} sull'account ${wabaId}`), { alert: true })
  }
}

// Meta → nostro vocabolario. Gli stati che non mappiamo (PENDING e simili) non
// cambiano niente: il modello resta come sta.
const STATO_MODELLO = {
  APPROVED: 'approvato',
  REJECTED: 'rifiutato',
  PAUSED: 'disabilitato',
  DISABLED: 'disabilitato',
}

async function gestisciModello(v) {
  const stato = STATO_MODELLO[v.event]
  if (!stato) return
  const patch = { stato, updated_at: new Date().toISOString() }
  if (stato === 'rifiutato') patch.motivo_rifiuto = v.reason || 'Rifiutato da Meta'

  // L'id di Meta è il riferimento buono; il nome è il ripiego per i modelli
  // creati prima che lo salvassimo.
  if (v.message_template_id) {
    await supabaseAdmin.from('whatsapp_template').update(patch).eq('template_meta_id', String(v.message_template_id))
  } else if (v.message_template_name) {
    await supabaseAdmin.from('whatsapp_template').update(patch).eq('nome_meta', v.message_template_name)
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
