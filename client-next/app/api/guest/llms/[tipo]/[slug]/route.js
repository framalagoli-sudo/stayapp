import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { tipo, slug } = params
    const tableMap = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
    const table = tableMap[tipo]
    if (!table) return new Response('Tipo non valido', { status: 400 })

    const selectFields = tipo === 'ristorante'
      ? 'name, description, address, phone, email, schedule, minisito'
      : 'name, description, address, phone, email, schedule, services, minisito'
    const { data, error } = await supabaseAdmin.from(table).select(selectFields).eq('slug', slug).eq('active', true).single()
    if (error || !data) return new Response('Entità non trovata', { status: 404 })

    const mini = data.minisito || {}
    const lines = [`# ${data.name}`]
    const desc = mini.seo_description || data.description
    if (desc) lines.push(`\n> ${desc}`)

    if (data.address || data.phone || data.email) {
      lines.push('\n## Contatti')
      if (data.address) lines.push(`- Indirizzo: ${data.address}`)
      if (data.phone)   lines.push(`- Telefono: ${data.phone}`)
      if (data.email)   lines.push(`- Email: ${data.email}`)
    }
    if (data.schedule) { lines.push('\n## Orari'); lines.push(data.schedule) }

    const services = Array.isArray(data.services) ? data.services.filter(s => s.name) : []
    if (services.length) {
      lines.push('\n## Servizi')
      services.forEach(s => lines.push(`- ${s.name}${s.description ? ': ' + s.description : ''}`))
    }
    const faq = (mini.faq || []).filter(f => f.question && f.answer)
    if (faq.length) {
      lines.push('\n## Domande frequenti')
      faq.forEach(f => lines.push(`**${f.question}**\n${f.answer}`))
    }

    return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch (e) { return new Response(e.message, { status: 500 }) }
}
