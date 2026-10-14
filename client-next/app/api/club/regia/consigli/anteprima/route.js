import { requireSuperAdmin } from '@/lib/server-auth'
import { consiglioPulito } from '@/lib/consigli-segnali'
import { anteprima } from '@/lib/consigli'

// Su quali clienti scatterebbe oggi questo consiglio, e con quale frase. Non
// salva niente: serve alla regia prima di attivarlo. Solo il super_admin.
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const { consiglio, errore } = consiglioPulito(await request.json().catch(() => ({})))
    if (errore) return Response.json({ error: errore }, { status: 400 })
    return Response.json(await anteprima(consiglio))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
