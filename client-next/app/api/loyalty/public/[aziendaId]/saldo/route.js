import { supabaseAdmin } from '@/lib/supabase-server'
import { getSaldo } from '@/lib/loyalty-helpers'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'

export async function GET(request, { params }) {
  try {
    // Anti enumerazione clientela / email.
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'loyalty-saldo', limit: 20, windowSec: 600, ip })
    if (!rl.allowed) return tooManyRequests()

    const { aziendaId } = params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return Response.json({ saldo: 0, programma: null })

    const [{ data: prog }, { data: contatto }] = await Promise.all([
      supabaseAdmin.from('loyalty_programs').select('*').eq('azienda_id', aziendaId).eq('attivo', true).single(),
      supabaseAdmin.from('contatti').select('id').eq('azienda_id', aziendaId).eq('email', email.toLowerCase()).single(),
    ])

    if (!prog || !contatto) return Response.json({ saldo: 0, programma: prog || null })

    const saldo = await getSaldo(aziendaId, contatto.id)
    return Response.json({
      saldo,
      saldo_euro: saldo >= prog.soglia_riscatto ? +(saldo * prog.valore_punto).toFixed(2) : 0,
      programma: { nome: prog.nome, valore_punto: prog.valore_punto, soglia_riscatto: prog.soglia_riscatto },
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
