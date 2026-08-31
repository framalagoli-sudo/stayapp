import { supabaseAdmin } from '@/lib/supabase-server'
import { prodottiInVenditaPerId } from '@/lib/prodotti-vendita'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { applicaLoyaltyOrdine } from '@/lib/loyalty-helpers'
import { sendEmail } from '@/lib/send-email'
import { guestEmailTemplate } from '@/lib/email-template'
import { logError } from '@/lib/observability'
import { creaCheckout } from '@/lib/checkout'

export async function POST(request, props) {
  const params = await props.params;
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'shop-ordine', limit: 15, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()
    const { azienda_id } = params
    const { email_cliente, nome_cliente, telefono_cliente, indirizzo, voci, note_cliente, punti_da_usare, codice_gift_card } = await request.json()

    if (!email_cliente || !voci?.length)
      return Response.json({ error: 'email e voci sono obbligatori' }, { status: 400 })

    const ids = voci.map(v => v.prodotto_id)
    const { data: dellaTabella } = await supabaseAdmin.from('prodotti').select('id,nome,prezzo,prezzo_scontato,stock')
      .in('id', ids).eq('azienda_id', azienda_id).eq('attivo', true)

    // Anche i prodotti messi in vendita dal catalogo. Il prezzo si rilegge
    // sempre dalla fonte, mai dal carrello: quello che arriva dal client dice
    // *cosa* si compra, non *quanto* costa.
    const dalCatalogo = await prodottiInVenditaPerId(azienda_id, ids)
    const prodotti = [...(dellaTabella || []), ...dalCatalogo]
    if (!prodotti.length) return Response.json({ error: 'Prodotti non trovati' }, { status: 400 })

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
    const scontoTotale = +(totale - totaleFinale).toFixed(2)

    let stripe_session_id = null
    let checkout_url = null
    // ⚠️ Il pagamento nasce sul conto del CLIENTE, non sul nostro: lo decide
    // `creaCheckout`, che è l'unico punto della piattaforma che parla con la
    // cassa. Prima qui c'era una copia del codice che incassava sul conto di
    // OltreNova — con i soldi, le commissioni e le contestazioni.
    //
    // Un checkout da zero euro Stripe non lo accetta: se lo sconto copre tutto,
    // l'ordine resta da confermare a mano dal titolare.
    if (totaleFinale > 0) {
      try {
        const base = (process.env.CLIENT_URL ?? '').trim()
        const esito = await creaCheckout({
          aziendaId: azienda_id,
          righe: vociSicure.map(v => ({ nome: v.nome, importo: v.prezzo, quantita: v.qty, immagine: v.immagine })),
          sconto: scontoTotale, scontoNome: 'Sconto fedeltà',
          email: email_cliente,
          successUrl: `${base}/checkout/successo?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${base}/checkout/annullato`,
        })
        stripe_session_id = esito.sessionId
        checkout_url = esito.url
      } catch (e) {
        // L'ordine si salva comunque: chi ha comprato non deve perdere il
        // carrello perché il pagamento non è disponibile. Ma il motivo va
        // scritto, non ingoiato — è così che nessuno si è accorto per mesi che
        // lo shop non incassava.
        console.error('[Shop] checkout non creato:', e.message)
      }
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

    // Punti e gift card NON si toccano qui: l'ordine è ancora solo un'intenzione.
    // Si consumano e si accreditano quando risulta pagato — vedi
    // finalizzaLoyaltyOrdine, chiamata dal webhook Stripe e dalla conferma manuale.

    if (process.env.RESEND_API_KEY) {
      try {
        const righeProdotti =vociSicure.map(v =>
          `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${v.nome}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${v.qty}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">€${(v.prezzo * v.qty).toFixed(2)}</td></tr>`
        ).join('')
        const { data: azShop } = await supabaseAdmin.from('aziende').select('ragione_sociale, partita_iva, indirizzo, citta, cap, provincia').eq('id', azienda_id).single()
        // Lo shop è azienda-level → per il link privacy uso la prima entità attiva dell'azienda.
        const shopAppUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
        // Con la tabella unificata basta una interrogazione sola, invece di
        // provarne tre in fila finché una risponde.
        let shopPrivacyUrl = null
        const { data: entPrivacy } = await supabaseAdmin.from('entita')
          .select('slug, tipo').eq('azienda_id', azienda_id).eq('active', true).limit(1).maybeSingle()
        if (entPrivacy?.slug) {
          const prefisso = { struttura: 's', ristorante: 'r', attivita: 'a' }[entPrivacy.tipo] || 'a'
          shopPrivacyUrl = `${shopAppUrl}/${prefisso}/${entPrivacy.slug}/privacy`
        }
        const tabellaOrdine = `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px">
            <thead><tr style="background:#f5f5f5">
              <th style="padding:8px;text-align:left;font-size:13px">Prodotto</th>
              <th style="padding:8px;text-align:center;font-size:13px">Qtà</th>
              <th style="padding:8px;text-align:right;font-size:13px">Prezzo</th>
            </tr></thead>
            <tbody>${righeProdotti}</tbody>
            <tfoot><tr><td colspan="2" style="padding:8px;font-weight:700">Totale</td>
              <td style="padding:8px;text-align:right;font-weight:700">€${totale.toFixed(2)}</td></tr></tfoot>
          </table>
          <p style="color:#888;font-size:13px;margin:0">Riceverai aggiornamenti sullo stato del tuo ordine via email.</p>`
        await sendEmail({
          _ctx: 'shop-ordine', fromName: azShop?.ragione_sociale,
          to: email_cliente,
          subject: `Ordine #${ordine.numero} ricevuto`,
          html: guestEmailTemplate({
            entityName: azShop?.ragione_sociale || 'Il tuo ordine',
            title: 'Grazie per il tuo ordine!',
            intro: `Ciao ${nome_cliente || ''}, abbiamo ricevuto il tuo ordine <strong>#${ordine.numero}</strong>.`,
            bodyHtml: tabellaOrdine, legale: azShop, privacyUrl: shopPrivacyUrl,
          }),
        })
      } catch (mailErr) { console.error('[Shop] Email error:', mailErr.message) }
    }

    return Response.json({ ordine, checkout_url }, { status: 201 })
  } catch (e) { await logError('shop/ordine', e, { alert: true }); return Response.json({ error: e.message }, { status: 500 }) }
}
