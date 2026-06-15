import { requireAuth } from '@/lib/server-auth'

export const maxDuration = 60
import { supabaseAdmin } from '@/lib/supabase-server'
import { callClaude, getRemainingCredits, consumeCredit, MONTHLY_LIMIT } from '@/lib/ai-helpers'

const CHANNEL_RULES = {
  instagram:       'Instagram: emoji appropriate sparse nel testo, 150-280 caratteri, 10-15 hashtag rilevanti alla fine',
  facebook:        'Facebook: testo coinvolgente 100-200 caratteri, call to action finale, max 3 hashtag',
  linkedin:        'LinkedIn: tono professionale e autorevole, 200-350 caratteri, max 3 hashtag, no emoji eccessive',
  tiktok:          'TikTok: tono giovane e diretto, 80-130 caratteri, hook d\'impatto nelle prime parole, trending',
  x:               'X (Twitter): max 250 caratteri, incisivo e diretto, max 2 hashtag',
  google_business: 'Google Business: informativo e locale, 100-150 caratteri, tono professionale, no hashtag',
}

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id, role').eq('id', userId).single()
  if (data?.azienda_id) return data.azienda_id
  if (data?.role === 'super_admin') return userId
  return null
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { tema, tono = 'amichevole', nome_business, canale } = await request.json()
    if (!tema?.trim() || !canale) return Response.json({ error: 'tema e canale sono obbligatori' }, { status: 400 })

    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Business non trovato' }, { status: 400 })

    const remaining = getRemainingCredits(azienda_id)
    if (remaining <= 0)
      return Response.json({ error: `Limite mensile raggiunto (${MONTHLY_LIMIT} generazioni/mese). Si rinnova il mese prossimo.` }, { status: 429 })

    const channelRule = CHANNEL_RULES[canale] || `${canale}: adatta la lunghezza e il tono al canale`
    const businessCtx = nome_business ? `per "${nome_business}"` : ''

    const prompt = `Sei un esperto di social media marketing. Scrivi un post ${businessCtx}.

Canale — ${channelRule}
Tema/brief: ${tema}
Tono: ${tono}
Lingua: italiano

Scrivi SOLO il testo del post, senza titoli, introduzioni, virgolette esterne o spiegazioni aggiuntive.`

    const testo = await callClaude(prompt)
    const leftAfter = consumeCredit(azienda_id)
    return Response.json({ testo, usage: { remaining: leftAfter, limit: MONTHLY_LIMIT } })
  } catch (e) {
    console.error('[AI social-post]', e.message)
    return Response.json({ error: 'Errore durante la generazione AI. Riprova tra qualche secondo.' }, { status: 500 })
  }
}
