import { requireAuth } from '@/lib/server-auth'

export const maxDuration = 60
import { supabaseAdmin } from '@/lib/supabase-server'
import { callClaude, getRemainingCredits, consumeCredit, MONTHLY_LIMIT } from '@/lib/ai-helpers'

const TIPO_PROMPTS = {
  blog_titolo: ({ tema, nome_business }) =>
    `Sei un copywriter esperto. Genera 1 titolo accattivante per un articolo di blog${nome_business ? ` per "${nome_business}"` : ''}.
Tema: ${tema}
Lingua: italiano
Rispondi SOLO con il titolo, senza virgolette o spiegazioni.`,

  blog_corpo: ({ tema, contesto, nome_business, tono }) =>
    `Sei un copywriter esperto. Scrivi il corpo di un articolo di blog${nome_business ? ` per "${nome_business}"` : ''}.
Titolo/tema: ${tema}${contesto ? `\nBrief: ${contesto}` : ''}
Tono: ${tono || 'professionale e coinvolgente'}
Lingua: italiano
Scrivi articolo completo con paragrafi. Solo il corpo, niente titoli extra o virgolette esterne.`,

  risposta_recensione: ({ tema, nome_business }) =>
    `Sei il responsabile di "${nome_business || 'un business'}". Scrivi una risposta professionale e cortese a questa recensione.
${tema}
Lingua: italiano. Tono: professionale, grato, personalizzato.
Scrivi SOLO il testo della risposta, senza prefissi o spiegazioni.`,

  email_corpo: ({ tema, contesto, nome_business, tono }) =>
    `Sei un email marketing specialist. Scrivi il corpo di una email automatica${nome_business ? ` per "${nome_business}"` : ''}.
Brief: ${tema}${contesto ? `\nVariabili disponibili: ${contesto}` : ''}
Tono: ${tono || 'amichevole e professionale'}
Lingua: italiano
Scrivi SOLO il corpo (no oggetto, no firma). Puoi usare {{nome}}, {{data}}, {{servizio}} ecc.`,

  preventivo_note: ({ tema, nome_business }) =>
    `Sei un professionista. Scrivi una nota introduttiva per un preventivo${nome_business ? ` per "${nome_business}"` : ''}.
Brief: ${tema}
Lingua: italiano
Scrivi 2-4 frasi per le note del preventivo. Solo il testo, niente virgolette.`,

  newsletter_oggetto: ({ tema, nome_business }) =>
    `Sei un email marketer esperto. Genera 1 oggetto email accattivante per una newsletter${nome_business ? ` di "${nome_business}"` : ''}.
Tema: ${tema}
Lingua: italiano. Max 60 caratteri. Rispondi SOLO con l'oggetto, senza virgolette.`,

  newsletter_corpo: ({ tema, contesto, nome_business, tono }) =>
    `Sei un copywriter esperto. Scrivi il corpo di una newsletter${nome_business ? ` per "${nome_business}"` : ''}.
Tema: ${tema}${contesto ? `\nDettagli: ${contesto}` : ''}
Tono: ${tono || 'coinvolgente e professionale'}
Lingua: italiano
Scrivi il testo della newsletter con paragrafi ben strutturati. Niente virgolette esterne.`,

  minisito_tagline: ({ tema, nome_business }) =>
    `Sei un copywriter esperto. Scrivi 1 tagline breve e memorabile${nome_business ? ` per "${nome_business}"` : ''}.
Brief: ${tema}
Lingua: italiano. Max 10 parole. Solo la tagline, senza virgolette.`,

  minisito_about: ({ tema, nome_business }) =>
    `Sei un copywriter esperto. Scrivi una sezione "Chi siamo" per il sito di "${nome_business || 'un business'}".
Brief: ${tema}
Lingua: italiano. 3-5 frasi coinvolgenti. Solo il testo, senza titoli o virgolette esterne.`,
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
    const { tipo, tema, tono, contesto, nome_business } = await request.json()
    if (!tipo || !tema?.trim()) return Response.json({ error: 'tipo e tema sono obbligatori' }, { status: 400 })
    if (!TIPO_PROMPTS[tipo]) return Response.json({ error: `tipo non supportato: ${tipo}` }, { status: 400 })

    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Business non trovato' }, { status: 400 })

    const remaining = getRemainingCredits(azienda_id)
    if (remaining <= 0)
      return Response.json({ error: `Limite mensile raggiunto (${MONTHLY_LIMIT} generazioni/mese). Si rinnova il mese prossimo.` }, { status: 429 })

    const prompt = TIPO_PROMPTS[tipo]({ tema, tono, contesto, nome_business })
    const maxTokens = ['blog_corpo', 'newsletter_corpo'].includes(tipo) ? 1500 : 400
    const testo = await callClaude(prompt, maxTokens)
    const leftAfter = consumeCredit(azienda_id)
    return Response.json({ testo, usage: { remaining: leftAfter, limit: MONTHLY_LIMIT } })
  } catch (e) {
    console.error('[AI genera]', e.message)
    return Response.json({ error: 'Errore durante la generazione AI. Riprova tra qualche secondo.' }, { status: 500 })
  }
}
