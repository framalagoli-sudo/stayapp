import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
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
      await supabaseAdmin.from('ordini')
        .update({ stato: 'pagato', stripe_payment_intent: session.payment_intent, updated_at: new Date().toISOString() })
        .eq('stripe_session_id', session.id)
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
