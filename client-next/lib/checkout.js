import { supabaseAdmin } from '@/lib/supabase-server'
import { stripeConnect, stripeConfigurato } from '@/lib/stripe-connect'

// Far pagare qualcosa. **Un posto solo, per tutta la piattaforma.**
//
// Si incassa in più punti — il negozio, le prenotazioni, gli eventi — e ogni
// volta la domanda è la stessa: *questo cliente, questo importo, sul conto di
// chi?* Scrivere tre volte la stessa risposta significa che al primo
// cambiamento due restano indietro: è già successo con le tre tabelle delle
// entità e con le tre liste di campi modificabili.
//
// ── Le due regole che non si toccano ───────────────────────────────────────
//
// 1. **Il pagamento nasce sul conto del cliente**, non sul nostro. Basta
//    l'opzione `stripeAccount`: da lì l'incasso è suo, la pagina di pagamento
//    porta il suo logo e le contestazioni sono fra lui e chi ha comprato.
//
// 2. **Nessuna `application_fee_amount`.** OltreNova non trattiene niente.
//    Non è una dimenticanza: è la scelta di Francesco, ed è anche la ragione
//    per cui il rischio non è nostro. Se un giorno si volesse cambiare idea, va
//    cambiato qui e in nessun altro posto — e va riletto quello che comporta.
//
// ⚠️ Gli importi **non arrivano mai dal client**. Chi chiama passa righe già
// calcolate leggendo il proprio database: un totale che viene dal browser è un
// totale che chi compra può riscrivere.

// Catalogo chiuso: la valuta non finisce grezza in una chiamata a Stripe.
const VALUTE = new Set(['eur', 'usd', 'gbp', 'chf'])
const valutaValida = v => VALUTE.has(String(v || '').toLowerCase()) ? String(v).toLowerCase() : 'eur'

// Il conto su cui incassa questa azienda. `null` se non l'ha ancora collegato.
export async function contoDi(aziendaId) {
  if (!aziendaId) return null
  const { data } = await supabaseAdmin.from('aziende')
    .select('stripe_account_id').eq('id', aziendaId).maybeSingle()
  return data?.stripe_account_id || null
}

// Può questa azienda incassare online? Serve al pannello e alle pagine
// pubbliche per non mostrare un pulsante che poi non funziona.
export async function puoIncassare(aziendaId) {
  return stripeConfigurato() && !!(await contoDi(aziendaId))
}

/**
 * Crea la pagina di pagamento sul conto del cliente.
 *
 * @param aziendaId  di chi è l'incasso
 * @param righe      [{ nome, importo (in euro), quantita, immagine }] — già calcolate da chi chiama
 * @param successUrl dove torna chi ha pagato
 * @param cancelUrl  dove torna chi rinuncia
 * @param email      di chi compra, per precompilare (facoltativo)
 * @param riferimento come ritrovare l'ordine/prenotazione quando arriva il webhook
 * @param valuta     'eur' se non detto
 */
export async function creaCheckout({ aziendaId, righe, successUrl, cancelUrl, email = null, riferimento = null, valuta = 'eur', sconto = 0, scontoNome = 'Sconto' }) {
  const conto = await contoDi(aziendaId)
  // ⚠️ Errori espliciti, non un ritorno vuoto: è così che lo shop è rimasto
  // mesi senza pagamenti senza che nessuno se ne accorgesse.
  if (!stripeConfigurato()) throw new Error('Stripe non è configurato su questo ambiente')
  if (!conto) throw new Error('Questa attività non ha ancora collegato un conto per gli incassi')
  if (!righe?.length) throw new Error('Niente da pagare')

  const cur = valutaValida(valuta)
  const line_items = righe.map(r => {
    // I centesimi si arrotondano una volta sola, qui: farlo in tre posti
    // diversi è il modo di ritrovarsi un centesimo di differenza fra quello che
    // si mostra e quello che si addebita.
    const centesimi = Math.round((Number(r.importo) || 0) * 100)
    if (centesimi <= 0) throw new Error(`Importo non valido per «${r.nome || 'voce'}»`)
    return {
      quantity: Math.max(1, parseInt(r.quantita) || 1),
      price_data: {
        currency: cur,
        unit_amount: centesimi,
        product_data: {
          name: String(r.nome || 'Voce').slice(0, 250),
          ...(r.immagine ? { images: [String(r.immagine)] } : {}),
        },
      },
    }
  })

  // Lo sconto deve arrivare **anche alla cassa**: senza, chi compra paga il
  // pieno e si vede consumare punti e gift card lo stesso.
  //
  // ⚠️ Il coupon si crea **sul conto del cliente**, non sul nostro. Con gli
  // addebiti diretti il pagamento vive lì, e un coupon creato sulla piattaforma
  // semplicemente non esisterebbe per quella sessione: Stripe risponderebbe
  // «No such coupon». È il tipo di dettaglio che si scopre solo provando.
  let discounts
  const scontoCent = Math.round((Number(sconto) || 0) * 100)
  if (scontoCent > 0) {
    const coupon = await stripeConnect().coupons.create({
      amount_off: scontoCent, currency: cur, duration: 'once',
      name: String(scontoNome).slice(0, 40),
    }, { stripeAccount: conto })
    discounts = [{ coupon: coupon.id }]
  }

  const sessione = await stripeConnect().checkout.sessions.create({
    mode: 'payment',
    line_items,
    ...(discounts ? { discounts } : {}),
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(email ? { customer_email: email } : {}),
    // Torna indietro nel webhook: è così che si ritrova cosa è stato pagato,
    // senza doverlo dedurre dagli importi.
    ...(riferimento ? { client_reference_id: String(riferimento).slice(0, 200) } : {}),
    // ⛔ Nessuna `payment_intent_data.application_fee_amount`: non tratteniamo nulla.
  }, {
    // ⛔ Questa riga è tutto il modello: il pagamento nasce sul conto del
    // cliente. Toglierla lo farebbe nascere sul nostro, e con esso i soldi, le
    // commissioni e le contestazioni.
    stripeAccount: conto,
  })

  return { url: sessione.url, sessionId: sessione.id, conto }
}
