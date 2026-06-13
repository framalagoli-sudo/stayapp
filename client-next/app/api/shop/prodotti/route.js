import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/[àáâ]/g, 'a').replace(/[èéê]/g, 'e').replace(/[ìí]/g, 'i')
    .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prodotto'
}

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id || null
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    const { data, error } = await supabaseAdmin.from('prodotti').select('*')
      .eq('azienda_id', azienda_id)
      .order('ordine', { ascending: true }).order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    const { nome, descrizione, prezzo, prezzo_scontato, immagini, stock, categoria, attivo, slug, ordine } = await request.json()
    const { data, error } = await supabaseAdmin.from('prodotti').insert({
      azienda_id, nome: nome || '', descrizione: descrizione || '',
      prezzo: prezzo || 0, prezzo_scontato: prezzo_scontato || null,
      immagini: immagini || [], stock: stock ?? null,
      categoria: categoria || '', attivo: attivo !== false,
      slug: slug || slugify(nome || ''), ordine: ordine || 0,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
