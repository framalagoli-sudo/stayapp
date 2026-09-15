import { requireAuth } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { statoBudget } from '@/lib/ai-consumi'

// Quanto credito AI ha usato l'azienda questo mese, in percentuale.
// Niente dollari al cliente: non paga l'AI a consumo.
export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profilo } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    const { percentuale, esaurito } = await statoBudget(profilo?.azienda_id || null)
    return Response.json({ percentuale, esaurito })
  } catch (e) {
    return Response.json({ error: 'Lettura del credito AI non riuscita' }, { status: 500 })
  }
}
