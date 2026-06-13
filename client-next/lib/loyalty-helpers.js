import { supabaseAdmin } from '@/lib/supabase-server'

export async function getSaldo(aziendaId, contattoId) {
  const { data } = await supabaseAdmin.from('loyalty_points')
    .select('punti').eq('azienda_id', aziendaId).eq('contatto_id', contattoId)
  return (data || []).reduce((sum, r) => sum + r.punti, 0)
}

export async function assegnaPuntiOrdine(aziendaId, emailCliente, ordineId, totaleEffettivo) {
  try {
    const { data: prog } = await supabaseAdmin.from('loyalty_programs')
      .select('*').eq('azienda_id', aziendaId).eq('attivo', true).single()
    if (!prog) return
    const { data: contatto } = await supabaseAdmin.from('contatti')
      .select('id').eq('azienda_id', aziendaId).eq('email', emailCliente.toLowerCase()).single()
    if (!contatto) return
    const punti = Math.floor(totaleEffettivo * prog.punti_per_euro)
    if (punti <= 0) return
    await supabaseAdmin.from('loyalty_points').insert({
      azienda_id: aziendaId, contatto_id: contatto.id, punti,
      tipo: 'acquisto', riferimento_id: ordineId, note: 'Ordine shop',
    })
  } catch (e) { console.error('[loyalty] assegnaPuntiOrdine:', e.message) }
}

export async function applicaLoyaltyOrdine(aziendaId, emailCliente, { punti_da_usare, codice_gift_card }, totale) {
  let scontoLoyalty = 0, scontoGiftCard = 0, giftCardId = null, contattoId = null

  const { data: prog } = await supabaseAdmin.from('loyalty_programs')
    .select('*').eq('azienda_id', aziendaId).eq('attivo', true).single()

  if (prog && punti_da_usare > 0) {
    const { data: contatto } = await supabaseAdmin.from('contatti')
      .select('id').eq('azienda_id', aziendaId).eq('email', emailCliente.toLowerCase()).single()
    if (contatto) {
      const saldo = await getSaldo(aziendaId, contatto.id)
      const puntiUsabili = Math.min(punti_da_usare, saldo >= prog.soglia_riscatto ? saldo : 0)
      scontoLoyalty = +(puntiUsabili * prog.valore_punto).toFixed(2)
      contattoId = contatto.id
    }
  }

  if (codice_gift_card) {
    const { data: gc } = await supabaseAdmin.from('gift_cards')
      .select('id, valore_residuo').eq('azienda_id', aziendaId)
      .eq('codice', codice_gift_card.toUpperCase()).eq('attiva', true).single()
    if (gc && gc.valore_residuo > 0) {
      scontoGiftCard = Math.min(gc.valore_residuo, totale - scontoLoyalty)
      giftCardId = gc.id
    }
  }

  return { scontoLoyalty, scontoGiftCard, giftCardId, contattoId, punti_da_usare }
}

export async function registraRiscatto(aziendaId, ordineId, { contattoId, punti_da_usare, scontoLoyalty, giftCardId, scontoGiftCard }) {
  try {
    if (contattoId && punti_da_usare > 0 && scontoLoyalty > 0) {
      const { data: prog } = await supabaseAdmin.from('loyalty_programs').select('valore_punto').eq('azienda_id', aziendaId).single()
      const puntiRiscattati = prog ? Math.round(scontoLoyalty / prog.valore_punto) : punti_da_usare
      await supabaseAdmin.from('loyalty_points').insert({
        azienda_id: aziendaId, contatto_id: contattoId,
        punti: -puntiRiscattati, tipo: 'riscatto',
        riferimento_id: ordineId, note: 'Riscatto ordine',
      })
    }
    if (giftCardId && scontoGiftCard > 0) {
      const { data: gc } = await supabaseAdmin.from('gift_cards').select('valore_residuo').eq('id', giftCardId).single()
      if (gc) {
        await supabaseAdmin.from('gift_cards').update({
          valore_residuo: Math.max(0, gc.valore_residuo - scontoGiftCard),
          updated_at: new Date().toISOString(),
        }).eq('id', giftCardId)
      }
    }
  } catch (e) { console.error('[loyalty] registraRiscatto:', e.message) }
}
