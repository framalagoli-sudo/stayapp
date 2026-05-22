import { Router } from 'express'
import { applicaLoyaltyOrdine, registraRiscatto, assegnaPuntiOrdine } from './loyalty.js'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { Resend } from 'resend'

const router = Router()
const resend = new Resend(process.env.RESEND_API_KEY)

async function getAziendaId(userId) {
  const { data } = await supabase.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id || null
}

// ── Prodotti admin ─────────────────────────────────────────────────────────────

router.get('/prodotti', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { data, error } = await supabase
      .from('prodotti')
      .select('*')
      .eq('azienda_id', azienda_id)
      .order('ordine', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/prodotti/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { data, error } = await supabase
      .from('prodotti').select('*')
      .eq('id', req.params.id).eq('azienda_id', azienda_id).single()
    if (error) return res.status(404).json({ error: 'Non trovato' })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/prodotti', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { nome, descrizione, prezzo, prezzo_scontato, immagini, stock, categoria, attivo, slug, ordine } = req.body
    const { data, error } = await supabase.from('prodotti').insert({
      azienda_id, nome: nome || '', descrizione: descrizione || '',
      prezzo: prezzo || 0, prezzo_scontato: prezzo_scontato || null,
      immagini: immagini || [], stock: stock ?? null,
      categoria: categoria || '', attivo: attivo !== false,
      slug: slug || slugify(nome || ''), ordine: ordine || 0,
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/prodotti/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const allowed = ['nome','descrizione','prezzo','prezzo_scontato','immagini','stock','categoria','attivo','slug','ordine']
    const patch = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k]
    const { data, error } = await supabase.from('prodotti')
      .update(patch).eq('id', req.params.id).eq('azienda_id', azienda_id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/prodotti/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { error } = await supabase.from('prodotti')
      .delete().eq('id', req.params.id).eq('azienda_id', azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Ordini admin ───────────────────────────────────────────────────────────────

router.get('/ordini', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    let q = supabase.from('ordini').select('*').eq('azienda_id', azienda_id)
      .order('created_at', { ascending: false })
    if (req.query.stato) q = q.eq('stato', req.query.stato)
    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/ordini/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { data, error } = await supabase.from('ordini').select('*')
      .eq('id', req.params.id).eq('azienda_id', azienda_id).single()
    if (error) return res.status(404).json({ error: 'Non trovato' })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/ordini/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const allowed = ['stato','note_admin','tracking_url']
    const patch = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k]
    const { data, error } = await supabase.from('ordini')
      .update(patch).eq('id', req.params.id).eq('azienda_id', azienda_id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Public shop ────────────────────────────────────────────────────────────────

// GET /api/shop/public/:azienda_id/prodotti
router.get('/public/:azienda_id/prodotti', async (req, res) => {
  try {
    const { data, error } = await supabase.from('prodotti').select('*')
      .eq('azienda_id', req.params.azienda_id).eq('attivo', true)
      .order('ordine', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/shop/public/:azienda_id/ordine  — crea ordine (COD o pre-Stripe)
router.post('/public/:azienda_id/ordine', async (req, res) => {
  try {
    const { azienda_id } = req.params
    const { email_cliente, nome_cliente, telefono_cliente, indirizzo, voci, note_cliente, punti_da_usare, codice_gift_card } = req.body

    if (!email_cliente || !voci?.length) {
      return res.status(400).json({ error: 'email e voci sono obbligatori' })
    }

    // Ricarica prezzi dal DB per sicurezza
    const ids = voci.map(v => v.prodotto_id)
    const { data: prodotti } = await supabase.from('prodotti').select('id,nome,prezzo,prezzo_scontato,stock')
      .in('id', ids).eq('azienda_id', azienda_id).eq('attivo', true)

    if (!prodotti?.length) return res.status(400).json({ error: 'Prodotti non trovati' })

    const vociSicure = []
    let totale = 0
    for (const v of voci) {
      const p = prodotti.find(x => x.id === v.prodotto_id)
      if (!p) return res.status(400).json({ error: `Prodotto ${v.prodotto_id} non trovato` })
      const prezzoUnitario = p.prezzo_scontato ?? p.prezzo
      const qty = Math.max(1, parseInt(v.qty) || 1)
      vociSicure.push({ prodotto_id: p.id, nome: p.nome, prezzo: prezzoUnitario, qty, immagine: v.immagine || '' })
      totale += prezzoUnitario * qty
    }

    // Loyalty: calcola sconti punti + gift card
    const loyalty = await applicaLoyaltyOrdine(azienda_id, email_cliente,
      { punti_da_usare: parseInt(punti_da_usare) || 0, codice_gift_card: codice_gift_card || '' }, totale)
    const totaleFinale = Math.max(0, totale - loyalty.scontoLoyalty - loyalty.scontoGiftCard)

    // Gestione Stripe (opzionale)
    const stripeKey = process.env.STRIPE_SECRET_KEY
    let stripe_session_id = null
    let checkout_url = null

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

          success_url: `${process.env.CLIENT_URL}/checkout/successo?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.CLIENT_URL}/checkout/annullato`,
          metadata: { azienda_id },
        })
        stripe_session_id = session.id
        checkout_url = session.url
      } catch (stripeErr) {
        console.error('[Shop] Stripe error:', stripeErr.message)
        // continua senza Stripe
      }
    }

    const { data: ordine, error } = await supabase.from('ordini').insert({
      azienda_id, email_cliente, nome_cliente: nome_cliente || '',
      telefono_cliente: telefono_cliente || '', indirizzo: indirizzo || {},
      voci: vociSicure, totale: totaleFinale, note_cliente: note_cliente || '',
      stato: 'in_attesa',
      stripe_session_id,
      punti_riscattati: loyalty.punti_da_usare || 0,
      sconto_loyalty:   loyalty.scontoLoyalty,
      codice_gift_card: codice_gift_card || null,
      sconto_gift_card: loyalty.scontoGiftCard,
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })

    // Registra riscatto loyalty + assegna punti per acquisto (fire-and-forget)
    registraRiscatto(azienda_id, ordine.id, loyalty)
    assegnaPuntiOrdine(azienda_id, email_cliente, ordine.id, totaleFinale)

    // Email conferma al cliente
    try {
      const righeProdotti = vociSicure.map(v =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${v.nome}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${v.qty}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">€${(v.prezzo * v.qty).toFixed(2)}</td></tr>`
      ).join('')
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'noreply@oltrenova.com',
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
    } catch (mailErr) {
      console.error('[Shop] Email error:', mailErr.message)
    }

    res.status(201).json({ ordine, checkout_url })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/shop/webhook/stripe — Stripe webhook
router.post('/webhook/stripe', async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeKey) return res.json({ ok: true })

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)
    const sig = req.headers['stripe-signature']
    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature failed: ${err.message}` })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      await supabase.from('ordini')
        .update({ stato: 'pagato', stripe_payment_intent: session.payment_intent, updated_at: new Date().toISOString() })
        .eq('stripe_session_id', session.id)
    }
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/[àáâ]/g,'a').replace(/[èéê]/g,'e').replace(/[ìí]/g,'i')
    .replace(/[òó]/g,'o').replace(/[ùú]/g,'u')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'prodotto'
}

export default router
