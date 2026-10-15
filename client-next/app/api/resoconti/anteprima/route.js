import { supabaseAdmin } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/server-auth'
import { resocontoDi, vuoto } from '@/lib/resoconti'
import { TIPI_RESOCONTO } from '@/lib/resoconti-regole'
import { sendEmail } from '@/lib/send-email'

// Il resoconto di un'azienda per l'ultimo periodo concluso, come lo
// riceverebbe il titolare. Solo per il proprietario della piattaforma.
// GET  → l'anteprima (oggetto e HTML) · POST → la stessa email, mandata
// SOLO a chi la chiede: mai al titolare, che la riceverà col giro vero.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function leggi(azienda_id, tipo) {
  if (!UUID.test(String(azienda_id || ''))) return { errore: 'Azienda non valida' }
  if (!TIPI_RESOCONTO.includes(tipo)) return { errore: 'Tipo non valido' }
  const { data: az } = await supabaseAdmin.from('aziende').select('id').eq('id', azienda_id).maybeSingle()
  if (!az) return { errore: 'Azienda non trovata' }
  return { r: await resocontoDi(azienda_id, tipo) }
}

export async function GET(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const u = new URL(request.url)
    const { errore, r } = await leggi(u.searchParams.get('azienda_id'), u.searchParams.get('tipo'))
    if (errore) return Response.json({ error: errore }, { status: 400 })
    return Response.json({
      oggetto: r.oggetto, html: r.html, periodo: r.periodo.etichetta,
      // Lo dice, invece di lasciarlo scoprire: questa settimana non partirebbe.
      saltato: r.periodo.tipo === 'settimanale' && vuoto(r.dati),
      senza_entita: !r.entita,
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireSuperAdmin(request)
    if (response) return response
    const body = await request.json().catch(() => ({}))
    const { errore, r } = await leggi(body?.azienda_id, body?.tipo)
    if (errore) return Response.json({ error: errore }, { status: 400 })
    if (!user.email) return Response.json({ error: 'Il tuo account non ha un indirizzo email' }, { status: 400 })
    const esito = await sendEmail({ _ctx: 'resoconto-prova', to: user.email, subject: `[Prova] ${r.oggetto}`, html: r.html })
    if (esito?.error) return Response.json({ error: esito.error.message }, { status: 502 })
    return Response.json({ inviata_a: user.email })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
