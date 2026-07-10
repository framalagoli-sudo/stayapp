import { supabaseAdmin } from '@/lib/supabase-server'
import { applicaLoyaltyOrdine, registraRiscatto, assegnaPuntiOrdine } from '@/lib/loyalty-helpers'
import { sendEmail } from '@/lib/send-email'

export async function POST(request, { params }) {
  try {
    const { azienda_id } = params
    const { email_cliente, nome_cliente, telefono_cliente, indirizzo, voci, note_cliente, punti_da_usare, codice_gift_card } = await request.json()

    if (!email_cliente || !voci?.length)
      return Response.json({ error: 'email e voci sono obbligatori' }, { status: 400 })

    const ids = voci.map(v => v.prodotto_id)
    const { data: prodotti } = await supabaseAdmin.from('prodotti').select('id,nome,prezzo,prezzo_scontato,stock')
      .in('id', ids).eq('azienda_id', azienda_id).eq('attivo', true)
    if (!prodotti?.length) return Response.json({ error: 'Prodotti non trovati' }, { status: 400 })

    const vociSicure = []
    let totale = 0
    for (const v of voci) {
      const p = prodotti.find(x => x.id === v.prodotto_id)
      if (!p) return Response.json({ error: `Prodotto ${v.prodotto_id} non trovato` }, { status: 400 })
      const prezzoUnitario = p.prezzo_scontato ?? p.prezzo
      const qty = Math.max(1, parseInt(v.qty) || 1)
      vociSicure.push({ prodotto_id: p.id, nome: p.nome, prezzo: prezzoUnitario, qty, immagine: v.immagine || '' })
      totale += prezzoUnitario * qty
    }

    const loyalty = await applicaLoyaltyOrdine(azienda_id, email_cliente,
      { punti_da_usare: parseInt(punti_da_usare) || 0, codice_gift_card: codice_gift_card || '' }, totale)
    const totaleFinale = Math.max(0, totale - loyalty.scontoLoyalty - loyalty.scontoGiftCard)

    let stripe_session_id = null
    let checkout_url = null
    const stripeKey = (process.env.STRIPE_SECRET_KEY ?? '').trim()
    if (stripeKey) {
      try {
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(stripeKey)
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          line_items: vociSicure.map(v => ({
            price_data: {
              currency: 'eur',
              product_data: { name: v.nome, images: v.immagine ? [v.immagine] : [] },
              unit_amount: Math.round(v.prezzo * 100),
            },
            quantity: v.qty,
          })),
          customer_email: email_cliente,
          success_url: `${(process.env.CLIENT_URL ?? '').trim()}/checkout/successo?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${(process.env.CLIENT_URL ?? '').trim()}/checkout/annullato`,
          metadata: { azienda_id },
        })
        stripe_session_id = session.id
        checkout_url = session.url
      } catch (e) { console.error('[Shop] Stripe error:', e.message) }
    }

    const { data: ordine, error } = await supabaseAdmin.from('ordini').insert({
      azienda_id, email_cliente, nome_cliente: nome_cliente || '',
      telefono_cliente: telefono_cliente || '', indirizzo: indirizzo || {},
      voci: vociSicure, totale: totaleFinale, note_cliente: note_cliente || '',
      stato: 'in_attesa', stripe_session_id,
      punti_riscattati: loyalty.punti_da_usare || 0,
      sconto_loyalty: loyalty.scontoLoyalty,
      codice_gift_card: codice_gift_card || null,
      sconto_gift_card: loyalty.scontoGiftCard,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    registraRiscatto(azienda_id, ordine.id, loyalty)
    assegnaPuntiOrdine(azienda_id, email_cliente, ordine.id, totaleFinale)

    if (process.env.RESEND_API_KEY) {
      try {
        const righeProdotti =vociSicure.map(v =>
          `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${v.nome}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${v.qty}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">€${(v.prezzo * v.qty).toFixed(2)}</td></tr>`
        ).join('')
        await sendEmail({
          _ctx: 'shop-ordine',
          from: (process.env.RESEND_FROM ?? '').trim() || 'noreply@oltrenova.com',
          to: email_cliente,
          subject: `Ordine #${ordine.numero} ricevuto`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="color:#1a1a2e">Grazie per il tuo ordine!</h2>
            <p>Ciao ${nome_cliente || ''}, abbiamo ricevuto il tuo ordine <strong>#${ordine.numero}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <thead><tr style="background:#f5f5f5">
                <th style="padding:8px;text-align:left">Prodotto</th>
                <th style="padding:8px;text-align:center">Qtà</th>
                <th style="padding:8px;text-align:right">Prezzo</th>
              </tr></thead>
              <tbody>${righeProdotti}</tbody>
              <tfoot><tr><td colspan="2" style="padding:8px;font-weight:700">Totale</td>
                <td style="padding:8px;text-align:right;font-weight:700">€${totale.toFixed(2)}</td></tr></tfoot>
            </table>
            <p style="color:#888;font-size:13px">Riceverai aggiornamenti sullo stato del tuo ordine via email.</p>
          </div>`,
        })
      } catch (mailErr) { console.error('[Shop] Email error:', mailErr.message) }
    }

    return Response.json({ ordine, checkout_url }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
