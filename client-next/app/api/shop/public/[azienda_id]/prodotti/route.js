import { supabaseAdmin } from '@/lib/supabase-server'
import { prodottiInVendita } from '@/lib/prodotti-vendita'

export async function GET(request, props) {
  const params = await props.params;
  try {
    const { data, error } = await supabaseAdmin.from('prodotti')
      // Campi espliciti: una colonna nuova non finisce sul sito pubblico da sola.
      .select('id, nome, descrizione, prezzo, prezzo_scontato, immagini, stock, categoria, slug, ordine')
      .eq('azienda_id', params.azienda_id).eq('attivo', true)
      .order('ordine', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Lo scaffale è uno solo: quello che il cliente ha caricato nei Prodotti e
    // messo in vendita compare qui accanto a quello della vecchia tabella dello
    // shop. Chi compra non deve sapere che esistono due sorgenti.
    const dalCatalogo = await prodottiInVendita(params.azienda_id)
    return Response.json([...(data || []), ...dalCatalogo])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
