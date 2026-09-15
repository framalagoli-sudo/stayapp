import { requireAuth } from '@/lib/server-auth'

export const maxDuration = 60
import { supabaseAdmin } from '@/lib/supabase-server'
import { chiamaAI, statoBudget, eBudgetEsaurito, rispostaBudgetEsaurito } from '@/lib/ai-consumi'

const CHANNEL_RULES = {
  instagram:       'Instagram: emoji appropriate sparse nel testo, 150-280 caratteri, 10-15 hashtag rilevanti alla fine',
  facebook:        'Facebook: testo coinvolgente 100-200 caratteri, call to action finale, max 3 hashtag',
  linkedin:        'LinkedIn: tono professionale e autorevole, 200-350 caratteri, max 3 hashtag, no emoji eccessive',
  tiktok:          'TikTok: tono giovane e diretto, 80-130 caratteri, hook d\'impatto nelle prime parole, trending',
  x:               'X (Twitter): max 250 caratteri, incisivo e diretto, max 2 hashtag',
  google_business: 'Google Business: informativo e locale, 100-150 caratteri, tono professionale, no hashtag',
}

// Chi paga l'AI è l'azienda di chi preme il pulsante; il super_admin non ha
// azienda e le sue chiamate si registrano come uso della piattaforma.
async function getProfilo(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id, role').eq('id', userId).single()
  return data
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { tema, tono = 'amichevole', nome_business, canale } = await request.json()
    if (!tema?.trim() || !canale) return Response.json({ error: 'tema e canale sono obbligatori' }, { status: 400 })

    const profilo = await getProfilo(user.id)
    const azienda_id = profilo?.azienda_id || null
    if (!azienda_id && profilo?.role !== 'super_admin') return Response.json({ error: 'Business non trovato' }, { status: 400 })

    const channelRule = CHANNEL_RULES[canale] || `${canale}: adatta la lunghezza e il tono al canale`
    const businessCtx = nome_business ? `per "${nome_business}"` : ''

    const prompt = `Sei un esperto di social media marketing. Scrivi un post ${businessCtx}.

Canale — ${channelRule}
Tema/brief: ${tema}
Tono: ${tono}
Lingua: italiano

Scrivi SOLO il testo del post, senza titoli, introduzioni, virgolette esterne o spiegazioni aggiuntive.`

    const testo = await chiamaAI({ azienda_id, funzione: 'social-post', prompt })
    const { percentuale } = await statoBudget(azienda_id)
    return Response.json({ testo, usage: { percentuale } })
  } catch (e) {
    if (eBudgetEsaurito(e)) return rispostaBudgetEsaurito()
    console.error('[AI social-post]', e.message)
    return Response.json({ error: 'Errore durante la generazione AI. Riprova tra qualche secondo.' }, { status: 500 })
  }
}
