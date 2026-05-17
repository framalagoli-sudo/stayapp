import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── Helper: saldo punti per contatto ────────────────────────────────────────
async function getSaldo(aziendaId, contattoId) {
  const { data } = await supabase.from('loyalty_points')
    .select('punti').eq('azienda_id', aziendaId).eq('contatto_id', contattoId)
  return (data || []).reduce((sum, r) => sum + r.punti, 0)
}

// ─── Programma ────────────────────────────────────────────────────────────────

// GET /api/loyalty/program
router.get('/program', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase.from('loyalty_programs')
      .select('*').eq('azienda_id', req.user.azienda_id).single()
    res.json(data || null)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/loyalty/program — crea o aggiorna
router.put('/program', requireAuth, async (req, res) => {
  try {
    const { nome, attivo, punti_per_euro, valore_punto, soglia_riscatto } = req.body
    const { data: existing } = await supabase.from('loyalty_programs')
      .select('id').eq('azienda_id', req.user.azienda_id).single()

    const payload = {
      azienda_id: req.user.azienda_id,
      nome: nome || 'Programma fedeltà',
      attivo: attivo ?? true,
      punti_per_euro: punti_per_euro ?? 10,
      valore_punto:   valore_punto ?? 0.01,
      soglia_riscatto: soglia_riscatto ?? 100,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existing?.id) {
      result = await supabase.from('loyalty_programs').update(payload).eq('id', existing.id).select().single()
    } else {
      result = await supabase.from('loyalty_programs').insert(payload).select().single()
    }
    if (result.error) return res.status(500).json({ error: result.error.message })
    res.json(result.data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Punti per contatto ───────────────────────────────────────────────────────

// GET /api/loyalty/contatto/:id
router.get('/contatto/:id', requireAuth, async (req, res) => {
  try {
    const { data: movimenti, error } = await supabase.from('loyalty_points')
      .select('*').eq('azienda_id', req.user.azienda_id).eq('contatto_id', req.params.id)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    const saldo = (movimenti || []).reduce((sum, r) => sum + r.punti, 0)
    res.json({ saldo, movimenti: movimenti || [] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/loyalty/assegna — assegna/rimuovi punti manualmente
router.post('/assegna', requireAuth, async (req, res) => {
  try {
    const { contatto_id, punti, note } = req.body
    if (!contatto_id || punti == null) return res.status(400).json({ error: 'contatto_id e punti obbligatori' })
    const { data, error } = await supabase.from('loyalty_points').insert({
      azienda_id: req.user.azienda_id,
      contatto_id,
      punti: parseInt(punti),
      tipo: 'manuale',
      note: note || '',
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    const saldo = await getSaldo(req.user.azienda_id, contatto_id)
    res.json({ movimento: data, saldo })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/loyalty/classifica — top contatti per punti
router.get('/classifica', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase.from('loyalty_points')
      .select('contatto_id, punti').eq('azienda_id', req.user.azienda_id)

    const saldi = {}
    for (const r of data || []) {
      saldi[r.contatto_id] = (saldi[r.contatto_id] || 0) + r.punti
    }

    const topIds = Object.entries(saldi)
      .filter(([, p]) => p > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([id]) => id)

    if (!topIds.length) return res.json([])

    const { data: contatti } = await supabase.from('contatti')
      .select('id, nome, email').in('id', topIds)

    const result = topIds.map(id => ({
      contatto: contatti?.find(c => c.id === id) || { id, nome: '—', email: '' },
      saldo: saldi[id],
    }))
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Gift Card ────────────────────────────────────────────────────────────────

// GET /api/loyalty/gift-cards
router.get('/gift-cards', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('gift_cards')
      .select('*').eq('azienda_id', req.user.azienda_id)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/loyalty/gift-cards
router.post('/gift-cards', requireAuth, async (req, res) => {
  try {
    const { codice, valore, intestatario_nome, intestatario_email, scadenza } = req.body
    if (!valore || valore <= 0) return res.status(400).json({ error: 'Valore obbligatorio' })

    const codiceFinale = (codice || '').trim().toUpperCase() ||
      Math.random().toString(36).substring(2, 10).toUpperCase()

    const { data, error } = await supabase.from('gift_cards').insert({
      azienda_id: req.user.azienda_id,
      codice: codiceFinale,
      valore_iniziale: valore,
      valore_residuo: valore,
      intestatario_nome: intestatario_nome || '',
      intestatario_email: intestatario_email || '',
      scadenza: scadenza || null,
    }).select().single()

    if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.message })
    res.status(201).json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PATCH /api/loyalty/gift-cards/:id
router.patch('/gift-cards/:id', requireAuth, async (req, res) => {
  try {
    const allowed = ['attiva', 'intestatario_nome', 'intestatario_email', 'scadenza']
    const payload = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
    payload.updated_at = new Date().toISOString()
    const { data, error } = await supabase.from('gift_cards').update(payload)
      .eq('id', req.params.id).eq('azienda_id', req.user.azienda_id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/loyalty/gift-cards/:id
router.delete('/gift-cards/:id', requireAuth, async (req, res) => {
  try {
    await supabase.from('gift_cards').delete()
      .eq('id', req.params.id).eq('azienda_id', req.user.azienda_id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Endpoint pubblici (usati da ShopWidget) ──────────────────────────────────

// GET /api/loyalty/public/:aziendaId/saldo?email=
router.get('/public/:aziendaId/saldo', async (req, res) => {
  try {
    const { aziendaId } = req.params
    const { email } = req.query
    if (!email) return res.json({ saldo: 0, programma: null })

    const [{ data: prog }, { data: contatto }] = await Promise.all([
      supabase.from('loyalty_programs').select('*').eq('azienda_id', aziendaId).eq('attivo', true).single(),
      supabase.from('contatti').select('id').eq('azienda_id', aziendaId).eq('email', email.toLowerCase()).single(),
    ])

    if (!prog || !contatto) return res.json({ saldo: 0, programma: prog || null })

    const saldo = await getSaldo(aziendaId, contatto.id)
    res.json({
      saldo,
      saldo_euro: saldo >= prog.soglia_riscatto ? +(saldo * prog.valore_punto).toFixed(2) : 0,
      programma: { nome: prog.nome, valore_punto: prog.valore_punto, soglia_riscatto: prog.soglia_riscatto },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/loyalty/public/:aziendaId/gift-card?codice=
router.get('/public/:aziendaId/gift-card', async (req, res) => {
  try {
    const { aziendaId } = req.params
    const { codice } = req.query
    if (!codice) return res.status(400).json({ error: 'Codice obbligatorio' })

    const { data, error } = await supabase.from('gift_cards')
      .select('id, codice, valore_residuo, scadenza, attiva')
      .eq('azienda_id', aziendaId).eq('codice', codice.toUpperCase()).single()

    if (error || !data) return res.status(404).json({ error: 'Gift card non trovata' })
    if (!data.attiva) return res.status(400).json({ error: 'Gift card non attiva' })
    if (data.scadenza && new Date(data.scadenza) < new Date()) return res.status(400).json({ error: 'Gift card scaduta' })
    if (data.valore_residuo <= 0) return res.status(400).json({ error: 'Gift card esaurita' })

    res.json({ id: data.id, codice: data.codice, valore_residuo: data.valore_residuo })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router

// ─── Named export: assegna punti dopo ordine shop ────────────────────────────
export async function assegnaPuntiOrdine(aziendaId, emailCliente, ordineId, totaleEffettivo) {
  try {
    const { data: prog } = await supabase.from('loyalty_programs')
      .select('*').eq('azienda_id', aziendaId).eq('attivo', true).single()
    if (!prog) return

    const { data: contatto } = await supabase.from('contatti')
      .select('id').eq('azienda_id', aziendaId).eq('email', emailCliente.toLowerCase()).single()
    if (!contatto) return

    const punti = Math.floor(totaleEffettivo * prog.punti_per_euro)
    if (punti <= 0) return

    await supabase.from('loyalty_points').insert({
      azienda_id: aziendaId,
      contatto_id: contatto.id,
      punti,
      tipo: 'acquisto',
      riferimento_id: ordineId,
      note: `Ordine shop`,
    })
  } catch (e) { console.error('[loyalty] assegnaPuntiOrdine:', e.message) }
}

// ─── Named export: riscatta punti + gift card (chiamato da shop.js) ───────────
export async function applicaLoyaltyOrdine(aziendaId, emailCliente, { punti_da_usare, codice_gift_card }, totale) {
  let scontoLoyalty = 0
  let scontoGiftCard = 0
  let giftCardId = null
  let contattoId = null

  const { data: prog } = await supabase.from('loyalty_programs')
    .select('*').eq('azienda_id', aziendaId).eq('attivo', true).single()

  // Punti
  if (prog && punti_da_usare > 0) {
    const { data: contatto } = await supabase.from('contatti')
      .select('id').eq('azienda_id', aziendaId).eq('email', emailCliente.toLowerCase()).single()
    if (contatto) {
      const saldo = await getSaldo(aziendaId, contatto.id)
      const puntiUsabili = Math.min(punti_da_usare, saldo >= prog.soglia_riscatto ? saldo : 0)
      scontoLoyalty = +(puntiUsabili * prog.valore_punto).toFixed(2)
      contattoId = contatto.id
    }
  }

  // Gift card
  if (codice_gift_card) {
    const { data: gc } = await supabase.from('gift_cards')
      .select('id, valore_residuo').eq('azienda_id', aziendaId)
      .eq('codice', codice_gift_card.toUpperCase()).eq('attiva', true).single()
    if (gc && gc.valore_residuo > 0) {
      scontoGiftCard = Math.min(gc.valore_residuo, totale - scontoLoyalty)
      giftCardId = gc.id
    }
  }

  return { scontoLoyalty, scontoGiftCard, giftCardId, contattoId, punti_da_usare }
}

// ─── Named export: registra riscatto dopo insert ordine ──────────────────────
export async function registraRiscatto(aziendaId, ordineId, { contattoId, punti_da_usare, scontoLoyalty, giftCardId, scontoGiftCard }) {
  try {
    if (contattoId && punti_da_usare > 0 && scontoLoyalty > 0) {
      const { data: prog } = await supabase.from('loyalty_programs')
        .select('valore_punto').eq('azienda_id', aziendaId).single()
      const puntiRiscattati = prog ? Math.round(scontoLoyalty / prog.valore_punto) : punti_da_usare
      await supabase.from('loyalty_points').insert({
        azienda_id: aziendaId, contatto_id: contattoId,
        punti: -puntiRiscattati, tipo: 'riscatto',
        riferimento_id: ordineId, note: `Riscatto ordine`,
      })
    }
    if (giftCardId && scontoGiftCard > 0) {
      const { data: gc } = await supabase.from('gift_cards').select('valore_residuo').eq('id', giftCardId).single()
      if (gc) {
        await supabase.from('gift_cards').update({
          valore_residuo: Math.max(0, gc.valore_residuo - scontoGiftCard),
          updated_at: new Date().toISOString(),
        }).eq('id', giftCardId)
      }
    }
  } catch (e) { console.error('[loyalty] registraRiscatto:', e.message) }
}
