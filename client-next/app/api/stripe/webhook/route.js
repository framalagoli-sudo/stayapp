import { supabaseAdmin } from '@/lib/supabase-server'
import { stripeConnect, stripeConfigurato } from '@/lib/stripe-connect'
import { finalizzaLoyaltyOrdine } from '@/lib/loyalty-helpers'
import { logError } from '@/lib/observability'

// «Ha pagato?» — la risposta arriva da qui, non dal browser.
//
// Il pagamento avviene **su Stripe**. Chi paga potrebbe chiudere la finestra
// prima di tornare indietro, o pagare con un metodo che si conferma dopo giorni:
// se aspettassimo il ritorno del browser, quell'ordine resterebbe «in attesa»
// per sempre e nessuno saprebbe che i soldi sono arrivati.
//
// ⚠️ Con gli addebiti diretti l'evento nasce sull'account del **cliente**, non
// sul nostro. Su Stripe questo indirizzo va registrato scegliendo «eventi da
// account connessi»: un endpoint registrato per il solo account della
// piattaforma non riceverebbe **niente**, e il guasto sarebbe silenzioso —
// nessun errore, solo ordini che non diventano mai pagati.
//
// L'account su cui è avvenuto il pagamento arriva in `event.account`.

// Il corpo va letto grezzo: la firma si calcola sui byte esatti, e qualsiasi
// rimaneggiamento la invalida.
export const dynamic = 'force-dynamic'

export async function POST(request) {
  if (!stripeConfigurato()) return Response.json({ ok: true })

  const segreto = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim()
  if (!segreto) {
    // Senza segreto non si può verificare chi ci sta scrivendo: meglio rifiutare
    // che fidarsi di chiunque conosca l'indirizzo.
    await logError('stripe/webhook', new Error('STRIPE_WEBHOOK_SECRET non configurato'), { alert: true })
    return Response.json({ error: 'webhook non configurato' }, { status: 500 })
  }

  let evento
  try {
    const corpo = await request.text()
    const firma = request.headers.get('stripe-signature')
    evento = stripeConnect().webhooks.constructEvent(corpo, firma, segreto)
  } catch (e) {
    // ⛔ Firma non valida = non è Stripe. Si risponde 400 e non si tocca niente:
    // senza questo controllo, chiunque potrebbe dichiarare pagato un ordine.
    return Response.json({ error: `firma non valida: ${e.message}` }, { status: 400 })
  }

  try {
    switch (evento.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await segnaPagato(evento.data.object)
        break

      // Un pagamento differito può fallire giorni dopo: chi lo aspettava deve
      // sapere che non arriverà, invece di restare in un limbo.
      case 'checkout.session.async_payment_failed':
        await segnaFallito(evento.data.object)
        break

      default:
        break
    }
    return Response.json({ ok: true })
  } catch (e) {
    // ⚠️ Un errore qui non deve restare in un log che nessuno legge: se un
    // pagamento non si registra, il cliente ha pagato e il titolare non lo sa.
    await logError('stripe/webhook', e, { alert: true })
    // Si risponde 500 di proposito: Stripe riprova, ed è quello che vogliamo.
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// Quello che è stato pagato può essere un ordine, una prenotazione o un evento.
//
// Si cerca in ordine, e ci si ferma al primo che risponde: la sessione è la
// stessa, cambia solo dove è annotata. Così aggiungere un quarto punto in cui si
// incassa non richiede un webhook nuovo.
async function segnaPagato(sessione) {
  const sid = sessione.id
  const pagamentoId = sessione.payment_intent || sid

  // 1. Un ordine dello shop
  const { data: ordini } = await supabaseAdmin.from('ordini')
    .update({ stato: 'pagato', pagamento_stato: 'pagato', stripe_payment_intent: pagamentoId, updated_at: new Date().toISOString() })
    // ⚠️ Il `neq` fa da scambio atomico: Stripe rispedisce lo stesso evento in
    // caso di dubbio, e senza questo i punti fedeltà verrebbero accreditati due
    // volte. Il valore si consuma una volta sola.
    .eq('stripe_session_id', sid).neq('stato', 'pagato')
    .select('id, azienda_id, email_cliente, totale, sconto_loyalty, sconto_gift_card, codice_gift_card, punti_riscattati')
  if (ordini?.length) { await finalizzaLoyaltyOrdine(ordini[0]); return }

  // 2. Una prenotazione (booking)
  const { data: pren } = await supabaseAdmin.from('prenotazioni')
    .update({ pagamento_stato: 'pagato', updated_at: new Date().toISOString() })
    .eq('pagamento_id', sid).neq('pagamento_stato', 'pagato').select('id')
  if (pren?.length) return

  // 3. Una prenotazione di un evento
  const { data: ev } = await supabaseAdmin.from('event_bookings')
    .update({ pagamento_stato: 'pagato' })
    .eq('pagamento_id', sid).neq('pagamento_stato', 'pagato').select('id')
  if (ev?.length) return

  // Nessuno dei tre: va detto. Un pagamento incassato che non corrisponde a
  // niente da noi è denaro di un cliente senza una riga che lo spieghi.
  await logError('stripe/webhook', new Error(`pagamento senza riscontro: ${sid}`), { alert: true })
}

async function segnaFallito(sessione) {
  const sid = sessione.id
  await supabaseAdmin.from('ordini').update({ pagamento_stato: 'non_pagato' }).eq('stripe_session_id', sid)
  await supabaseAdmin.from('prenotazioni').update({ pagamento_stato: 'non_pagato' }).eq('pagamento_id', sid)
  await supabaseAdmin.from('event_bookings').update({ pagamento_stato: 'non_pagato' }).eq('pagamento_id', sid)
}
