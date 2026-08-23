import { supabaseAdmin } from '@/lib/supabase-server'
import { finalizzaLoyaltyOrdine } from '@/lib/loyalty-helpers'

export async function POST(request) {
  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim()
  if (!stripeKey) return Response.json({ ok: true })

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)
    const rawBody = await request.text()
    const sig = request.headers.get('stripe-signature')

    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err) {
      return Response.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      // Stripe rispedisce lo stesso evento in caso di errore: il `neq` fa da
      // scambio atomico, così l'ordine passa a "pagato" una volta sola e i
      // punti non vengono accreditati due volte.
      const { data: aggiornati } = await supabaseAdmin.from('ordini')
        .update({ stato: 'pagato', stripe_payment_intent: session.payment_intent, updated_at: new Date().toISOString() })
        .eq('stripe_session_id', session.id).neq('stato', 'pagato')
        .select('id, azienda_id, email_cliente, totale, sconto_loyalty, sconto_gift_card, codice_gift_card, punti_riscattati')
      if (aggiornati?.length) await finalizzaLoyaltyOrdine(aggiornati[0])
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
