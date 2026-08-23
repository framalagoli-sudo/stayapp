import { supabaseAdmin } from '@/lib/supabase-server'

// Punti e gift card sono denaro: si consumano e si accreditano SOLO su un
// ordine effettivamente pagato. Finché l'ordine è in attesa, l'intenzione
// ("vorrei usare 500 punti") resta scritta sull'ordine e non tocca nulla —
// altrimenti chi ordina senza mai pagare fabbrica sconti dal nulla e può
// bruciare la gift card di un altro conoscendone il codice.
const MAX_PUNTI_MOVIMENTO = 1_000_000

export async function getSaldo(aziendaId, contattoId) {
  const { data } = await supabaseAdmin.from('loyalty_points')
    .select('punti').eq('azienda_id', aziendaId).eq('contatto_id', contattoId)
  return (data || []).reduce((sum, r) => sum + r.punti, 0)
}

// Quanto sconto spetterebbe a questo ordine. Solo calcolo: non scrive niente.
export async function applicaLoyaltyOrdine(aziendaId, emailCliente, { punti_da_usare, codice_gift_card }, totale) {
  let scontoLoyalty = 0, scontoGiftCard = 0, giftCardId = null, contattoId = null
  const puntiChiesti = Math.min(Math.max(0, parseInt(punti_da_usare) || 0), MAX_PUNTI_MOVIMENTO)

  const { data: prog } = await supabaseAdmin.from('loyalty_programs')
    .select('*').eq('azienda_id', aziendaId).eq('attivo', true).maybeSingle()

  if (prog && puntiChiesti > 0) {
    const { data: contatto } = await supabaseAdmin.from('contatti')
      .select('id').eq('azienda_id', aziendaId).eq('email', emailCliente.toLowerCase()).maybeSingle()
    if (contatto) {
      const saldo = await getSaldo(aziendaId, contatto.id)
      const puntiUsabili = Math.min(puntiChiesti, saldo >= prog.soglia_riscatto ? saldo : 0)
      scontoLoyalty = +(puntiUsabili * prog.valore_punto).toFixed(2)
      contattoId = contatto.id
    }
  }

  if (codice_gift_card) {
    const { data: gc } = await supabaseAdmin.from('gift_cards')
      .select('id, valore_residuo').eq('azienda_id', aziendaId)
      .eq('codice', String(codice_gift_card).toUpperCase()).eq('attiva', true).maybeSingle()
    if (gc && gc.valore_residuo > 0) {
      scontoGiftCard = Math.min(gc.valore_residuo, totale - scontoLoyalty)
      giftCardId = gc.id
    }
  }

  // Lo sconto non può superare il totale: nessun ordine a credito.
  const tetto = Math.max(0, totale)
  if (scontoLoyalty > tetto) scontoLoyalty = tetto
  if (scontoLoyalty + scontoGiftCard > tetto) scontoGiftCard = Math.max(0, tetto - scontoLoyalty)

  return { scontoLoyalty, scontoGiftCard, giftCardId, contattoId, punti_da_usare: puntiChiesti }
}

// Chiamata quando l'ordine risulta PAGATO (webhook Stripe o conferma del
// titolare). Idempotente: se i movimenti di questo ordine esistono già, esce.
// Ricalcola su ciò che è davvero disponibile ora, perché fra l'ordine e il
// pagamento il saldo può essere cambiato.
export async function finalizzaLoyaltyOrdine(ordine) {
  try {
    if (!ordine?.id) return
    const { azienda_id, id: ordineId, email_cliente, totale } = ordine

    const { data: gia } = await supabaseAdmin.from('loyalty_points')
      .select('id').eq('riferimento_id', ordineId).limit(1)
    if (gia?.length) return // già finalizzato

    const { data: contatto } = email_cliente ? await supabaseAdmin.from('contatti')
      .select('id').eq('azienda_id', azienda_id).eq('email', email_cliente.toLowerCase()).maybeSingle() : { data: null }

    // 1. Riscatto punti — mai oltre il saldo reale al momento del pagamento.
    if (contatto && ordine.sconto_loyalty > 0) {
      const { data: prog } = await supabaseAdmin.from('loyalty_programs')
        .select('valore_punto').eq('azienda_id', azienda_id).maybeSingle()
      const valore = prog?.valore_punto || 0
      const previsti = valore > 0 ? Math.round(ordine.sconto_loyalty / valore) : (ordine.punti_riscattati || 0)
      const saldo = await getSaldo(azienda_id, contatto.id)
      const daScalare = Math.min(previsti, Math.max(0, saldo))
      if (daScalare > 0) {
        await supabaseAdmin.from('loyalty_points').insert({
          azienda_id, contatto_id: contatto.id, punti: -daScalare,
          tipo: 'riscatto', riferimento_id: ordineId, note: 'Riscatto ordine',
        })
      }
    }

    // 2. Gift card — si scala solo ora, e mai sotto zero.
    if (ordine.codice_gift_card && ordine.sconto_gift_card > 0) {
      const { data: gc } = await supabaseAdmin.from('gift_cards')
        .select('id, valore_residuo').eq('azienda_id', azienda_id)
        .eq('codice', String(ordine.codice_gift_card).toUpperCase()).maybeSingle()
      if (gc) {
        await supabaseAdmin.from('gift_cards').update({
          valore_residuo: Math.max(0, gc.valore_residuo - ordine.sconto_gift_card),
          updated_at: new Date().toISOString(),
        }).eq('id', gc.id)
      }
    }

    // 3. Punti guadagnati — sull'importo davvero incassato.
    const { data: prog } = await supabaseAdmin.from('loyalty_programs')
      .select('punti_per_euro').eq('azienda_id', azienda_id).eq('attivo', true).maybeSingle()
    if (prog && contatto) {
      const punti = Math.min(Math.floor((totale || 0) * prog.punti_per_euro), MAX_PUNTI_MOVIMENTO)
      if (punti > 0) {
        await supabaseAdmin.from('loyalty_points').insert({
          azienda_id, contatto_id: contatto.id, punti,
          tipo: 'acquisto', riferimento_id: ordineId, note: 'Ordine shop',
        })
      }
    }
  } catch (e) { console.error('[loyalty] finalizzaLoyaltyOrdine:', e.message) }
}
