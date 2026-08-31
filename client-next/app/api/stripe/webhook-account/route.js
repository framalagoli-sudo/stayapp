import { supabaseAdmin } from '@/lib/supabase-server'
import { stripeConnect, stripeConfigurato } from '@/lib/stripe-connect'
import { logError } from '@/lib/observability'

// «Il conto del cliente funziona ancora?»
//
// Stripe può chiedere documenti nuovi **mesi dopo** l'attivazione, perché
// cambiano le regole dei circuiti o dei regolatori. Se nessuno ascolta, il
// cliente scopre di essere bloccato dal primo pagamento rifiutato — cioè da un
// suo cliente che non riesce a comprare.
//
// ⚠️ Questi sono **thin events**, un formato diverso dagli altri: nel corpo
// arriva quasi solo un id, e l'evento vero va poi richiesto. È voluto da Stripe
// (meno dati sensibili in transito) ed è il motivo per cui questo endpoint è
// separato dall'altro: `constructEvent` e `parseThinEvent` non sono la stessa
// funzione, e mescolarli significa che uno dei due smette di funzionare.
//
// Su Stripe va registrato scegliendo **«eventi da account connessi»** e stile
// payload **«Thin»**.

export const dynamic = 'force-dynamic'

export async function POST(request) {
  if (!stripeConfigurato()) return Response.json({ ok: true })

  const segreto = (process.env.STRIPE_ACCOUNT_WEBHOOK_SECRET ?? '').trim()
  if (!segreto) {
    await logError('stripe/webhook-account', new Error('STRIPE_ACCOUNT_WEBHOOK_SECRET non configurato'), { alert: true })
    return Response.json({ error: 'webhook non configurato' }, { status: 500 })
  }

  const stripe = stripeConnect()
  let thin
  try {
    const corpo = await request.text()
    const firma = request.headers.get('stripe-signature')
    thin = stripe.parseThinEvent(corpo, firma, segreto)
  } catch (e) {
    return Response.json({ error: `firma non valida: ${e.message}` }, { status: 400 })
  }

  try {
    // Il corpo non basta: l'evento completo si va a prendere.
    const evento = await stripe.v2.core.events.retrieve(thin.id)
    const accountId = evento.related_object?.id || thin.related_object?.id

    if (!accountId) return Response.json({ ok: true })

    // Di chi è questo conto? Se non lo riconosciamo non c'è niente da avvisare.
    const { data: az } = await supabaseAdmin.from('aziende')
      .select('id, ragione_sociale').eq('stripe_account_id', accountId).maybeSingle()
    if (!az) return Response.json({ ok: true })

    // ⚠️ Non si scrive uno stato nel nostro database: lo stato si chiede sempre
    // all'API, ed è una regola che vale anche qui. Questo evento serve ad
    // **accorgersi**, non a ricordare.
    //
    // Un cliente bloccato che non lo sa è un guasto silenzioso, e in questo
    // progetto i guasti silenziosi si fanno gridare.
    const richiede = /requirements/.test(evento.type || '')
    const capacita = /capability_status_updated/.test(evento.type || '')

    if (richiede || capacita) {
      const stato = await statoSintetico(accountId)
      if (stato?.bloccato) {
        await logError('stripe/account',
          new Error(`«${az.ragione_sociale}» non può più incassare: Stripe chiede altri dati (${accountId})`),
          { alert: true })
      }
    }

    return Response.json({ ok: true })
  } catch (e) {
    await logError('stripe/webhook-account', e, { alert: true })
    return Response.json({ error: e.message }, { status: 500 })
  }
}

async function statoSintetico(accountId) {
  try {
    const a = await stripeConnect().v2.core.accounts.retrieve(accountId, {
      include: ['configuration.merchant', 'requirements'],
    }, { apiVersion: '2026-08-26.dahlia' })
    const carte = a.configuration?.merchant?.capabilities?.card_payments?.status
    const scadenza = a.requirements?.summary?.minimum_deadline?.status
    return { bloccato: carte !== 'active' || scadenza === 'past_due' }
  } catch { return null }
}
