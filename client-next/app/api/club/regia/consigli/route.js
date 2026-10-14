import { supabaseAdmin } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/server-auth'
import { SEGNALI, AZIONI_CONSIGLIO, consiglioPulito } from '@/lib/consigli-segnali'

// I consigli personali nella regia del Club: solo il super_admin (404 agli altri).
export const dynamic = 'force-dynamic'

// Il catalogo dei segnali come lo legge il pannello: senza le funzioni.
const catalogo = () => Object.entries(SEGNALI).map(([chiave, s]) => ({
  chiave, nome: s.nome, descrizione: s.descrizione, parametri: s.parametri, segnaposti: s.segnaposti,
}))

export async function GET(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const { data, error } = await supabaseAdmin.from('club_consigli')
      .select('id, segnale, parametri, mestieri, titolo, perche, azione, stato, ordine, updated_at')
      .order('ordine').order('created_at')
    if (error) throw new Error(error.message)
    return Response.json({
      consigli: data || [], segnali: catalogo(),
      azioni: Object.entries(AZIONI_CONSIGLIO).map(([chiave, a]) => ({ chiave, testo: a.testo })),
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const { consiglio, errore } = consiglioPulito(await request.json().catch(() => ({})))
    if (errore) return Response.json({ error: errore }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('club_consigli').insert(consiglio).select('id').single()
    if (error) throw new Error(error.message)
    return Response.json({ id: data.id })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
