import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { entity_tipo, entity_id, messages } = await request.json()
    if (!entity_tipo || !entity_id || !Array.isArray(messages) || messages.length === 0)
      return Response.json({ error: 'entity_tipo, entity_id, messages obbligatori' }, { status: 400 })

    const tableMap = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
    const table = tableMap[entity_tipo]
    if (!table) return Response.json({ error: 'entity_tipo non valido' }, { status: 400 })

    const { data: entity, error } = await supabaseAdmin.from(table)
      .select('name, description, address, phone, email, schedule, services, minisito')
      .eq('id', entity_id).single()
    if (error || !entity) return Response.json({ error: 'Entità non trovata' }, { status: 404 })

    const mini = entity.minisito || {}
    const services = Array.isArray(entity.services) ? entity.services.filter(s => s.name) : []
    const faq = Array.isArray(mini.faq) ? mini.faq.filter(f => f.question && f.answer) : []

    let system = `Sei l'assistente virtuale di "${entity.name}". Rispondi sempre in italiano, in modo cordiale e conciso (max 2-3 frasi). Usa solo le informazioni fornite — non inventare. Se non sai rispondere, suggerisci di contattare direttamente il business.\n\nInformazioni:\n- Nome: ${entity.name}\n- Tipo: ${entity_tipo}`
    if (entity.description) system += `\n- Descrizione: ${entity.description}`
    if (entity.address)     system += `\n- Indirizzo: ${entity.address}`
    if (entity.phone)       system += `\n- Telefono: ${entity.phone}`
    if (entity.email)       system += `\n- Email: ${entity.email}`
    if (entity.schedule)    system += `\n- Orari: ${entity.schedule}`
    if (mini.booking_url)   system += `\n- Prenotazioni: ${mini.booking_url}`
    if (services.length)    system += '\n\nServizi:\n' + services.map(s => `- ${s.name}${s.description ? ': ' + s.description : ''}`).join('\n')
    if (faq.length)         system += '\n\nFAQ:\n' + faq.map(f => `D: ${f.question}\nR: ${f.answer}`).join('\n\n')

    const apiKey = (process.env.ANTHROPIC_API_KEY ?? '').trim()
    if (!apiKey) return Response.json({ error: 'Servizio AI non configurato' }, { status: 500 })

    const chatMessages = messages.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 800),
    }))

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 300, system, messages: chatMessages }),
    })

    if (!apiRes.ok) return Response.json({ error: 'Servizio AI temporaneamente non disponibile.' }, { status: 500 })
    const aiData = await apiRes.json()
    const reply = aiData.content?.[0]?.text?.trim() || 'Mi dispiace, non riesco a rispondere in questo momento.'
    return Response.json({ reply })
  } catch (e) { return Response.json({ error: 'Errore del servizio. Riprova tra qualche istante.' }, { status: 500 }) }
}
