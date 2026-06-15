import { supabaseAdmin } from '@/lib/supabase-server'
import { Resend } from 'resend'

export async function GET(request, { params }) {
  try {
    const { data, error } = await supabaseAdmin.from('recensioni')
      .select('id, autore, entity_tipo, entity_id, pubblica').eq('token', params.token).single()
    if (error || !data) return Response.json({ error: 'Link non valido o già utilizzato' }, { status: 404 })
    if (data.pubblica) return Response.json({ error: 'Recensione già inviata' }, { status: 410 })

    const table = data.entity_tipo === 'struttura' ? 'properties' : data.entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
    const { data: entity } = await supabaseAdmin.from(table).select('name, logo_url, theme, minisito').eq('id', data.entity_id).single()
    return Response.json({
      autore: data.autore,
      entity_name: entity?.name || '',
      entity_logo: entity?.logo_url || null,
      primary: entity?.theme?.primaryColor || '#1a1a2e',
      redirect_url: entity?.minisito?.recensioni_redirect_url || null,
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request, { params }) {
  try {
    const { autore, stelle, testo } = await request.json()
    if (!stelle || stelle < 1 || stelle > 5) return Response.json({ error: 'stelle obbligatorie (1-5)' }, { status: 400 })

    const { data: rec, error: fe } = await supabaseAdmin.from('recensioni')
      .select('id, pubblica, entity_tipo, entity_id, azienda_id').eq('token', params.token).single()
    if (fe || !rec) return Response.json({ error: 'Link non valido' }, { status: 404 })
    if (rec.pubblica) return Response.json({ error: 'Recensione già inviata' }, { status: 410 })

    const table = rec.entity_tipo === 'struttura' ? 'properties' : rec.entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
    const { data: entity } = await supabaseAdmin.from(table).select('minisito').eq('id', rec.entity_id).single()
    const redirectUrl = entity?.minisito?.recensioni_redirect_url || null
    const isPositive = Number(stelle) >= 4

    await supabaseAdmin.from('recensioni').update({
      autore: autore?.trim() || rec.autore || 'Anonimo',
      stelle: Number(stelle), testo: testo?.trim() || '',
      verificata: true, pubblica: isPositive, updated_at: new Date().toISOString(),
    }).eq('id', rec.id)

    if (!isPositive && process.env.RESEND_API_KEY) {
      const { data: az } = await supabaseAdmin.from('aziende').select('email').eq('id', rec.azienda_id).single()
      if (az?.email) {
        const stars = '★'.repeat(Number(stelle)) + '☆'.repeat(5 - Number(stelle))
        new Resend((process.env.RESEND_API_KEY ?? '').trim()).emails.send({
          from: (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>',
          to: az.email,
          subject: `[OltreNova] Nuova recensione ${stars} da ${autore?.trim() || 'Anonimo'}`,
          html: `<p>Hai ricevuto una recensione privata (${stelle}/5 stelle) da <strong>${autore?.trim() || 'Anonimo'}</strong>.</p><p>${testo?.trim() || ''}</p><p>Accedi al pannello admin per visualizzarla e rispondere.</p>`,
        }).catch(() => {})
      }
    }
    return Response.json({ ok: true, redirect: isPositive && redirectUrl ? redirectUrl : null })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
