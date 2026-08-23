import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

// Una gift card vale denaro: il codice dev'essere imprevedibile, quindi
// generatore crittografico e non Math.random(). Alfabeto senza caratteri
// ambigui (0/O, 1/I) perché è un codice che la gente legge e digita a mano.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generaCodice(lunghezza = 12) {
  const b = crypto.randomBytes(lunghezza)
  let out = ''
  for (let i = 0; i < lunghezza; i++) out += ALFABETO[b[i] % ALFABETO.length]
  return out
}

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const { data, error } = await supabaseAdmin.from('gift_cards').select('*')
      .eq('azienda_id', azienda_id).order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    const { codice, valore, intestatario_nome, intestatario_email, scadenza } = await request.json()
    if (!valore || valore <= 0) return Response.json({ error: 'Valore obbligatorio' }, { status: 400 })

    const codiceFinale = (codice || '').trim().toUpperCase() || generaCodice()

    const { data, error } = await supabaseAdmin.from('gift_cards').insert({
      azienda_id, codice: codiceFinale,
      valore_iniziale: valore, valore_residuo: valore,
      intestatario_nome: intestatario_nome || '',
      intestatario_email: intestatario_email || '',
      scadenza: scadenza || null,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: error.code === '23505' ? 409 : 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
