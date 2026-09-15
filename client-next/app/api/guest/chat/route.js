import { supabaseAdmin } from '@/lib/supabase-server'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { chiamaAI, eBudgetEsaurito } from '@/lib/ai-consumi'

export async function POST(request) {
  try {
    // Endpoint pubblico che consuma crediti Anthropic → rate-limit anti cost-abuse.
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'guest-chat', limit: 40, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

    const { entity_tipo, entity_id, messages } = await request.json()
    if (!entity_tipo || !entity_id || !Array.isArray(messages) || messages.length === 0)
      return Response.json({ error: 'entity_tipo, entity_id, messages obbligatori' }, { status: 400 })

    // Prima le tre tabelle avevano colonne diverse — `properties` senza
    // `schedule`, `ristoranti` senza `services` — e chiederle tutte a tutte
    // faceva fallire la query: il chatbot rispondeva "Entità non trovata" a
    // qualsiasi domanda, muto su due verticali su tre. Con la tabella unificata
    // il problema non può più esistere: i campi sono gli stessi per chiunque.
    //
    // Restano elencati a mano perché qui NON deve entrare `wifi_password`, che
    // finirebbe dritta nel prompt del modello.
    if (!['struttura', 'ristorante', 'attivita'].includes(entity_tipo)) {
      return Response.json({ error: 'entity_tipo non valido' }, { status: 400 })
    }
    const { data: entity, error } = await supabaseAdmin.from('entita')
      .select('azienda_id, name, description, address, phone, email, schedule, services, menu, minisito')
      .eq('id', entity_id).eq('tipo', entity_tipo).maybeSingle()
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

    const chatMessages = messages.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 800),
    }))

    // Il chatbot consuma il credito AI dell'azienda come ogni altra funzione:
    // il limite per IP ferma un singolo visitatore, non cento visitatori diversi.
    let reply
    try {
      reply = await chiamaAI({ azienda_id: entity.azienda_id, funzione: 'chatbot', system, messages: chatMessages, maxTokens: 300 })
    } catch (e) {
      // Il visitatore non deve leggere di crediti né di errori: gli si dice a
      // chi rivolgersi, con i contatti che il sito ha già.
      if (eBudgetEsaurito(e)) {
        const contatto = [entity.phone, entity.email].filter(Boolean).join(' · ')
        return Response.json({ reply: `In questo momento l'assistente non è disponibile. Per informazioni contatta direttamente ${entity.name}${contatto ? `: ${contatto}` : '.'}` })
      }
      return Response.json({ error: 'Servizio AI temporaneamente non disponibile.' }, { status: 500 })
    }
    return Response.json({ reply: reply || 'Mi dispiace, non riesco a rispondere in questo momento.' })
  } catch (e) { return Response.json({ error: 'Errore del servizio. Riprova tra qualche istante.' }, { status: 500 }) }
}
