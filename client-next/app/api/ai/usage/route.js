import { requireAuth } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getRemainingCredits, MONTHLY_LIMIT } from '@/lib/ai-helpers'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id, role').eq('id', userId).single()
  if (data?.azienda_id) return data.azienda_id
  if (data?.role === 'super_admin') return userId
  return null
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ remaining: MONTHLY_LIMIT, limit: MONTHLY_LIMIT })
    return Response.json({ remaining: getRemainingCredits(azienda_id), limit: MONTHLY_LIMIT })
  } catch (e) { return Response.json({ remaining: MONTHLY_LIMIT, limit: MONTHLY_LIMIT }) }
}
