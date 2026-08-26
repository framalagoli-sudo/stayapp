import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { sendWebhooks } from '@/lib/send-webhooks'
import { emailTemplate } from '@/lib/email-template'
import { sendEmail } from '@/lib/send-email'

// La formula che chi prenota accetta. La decide il server, non il componente:
// e il server a scriverla nella prova del consenso, e se le due copie
// divergessero resterebbe salvata una frase che nessuno ha mai letto.
export const TESTO_CONSENSO =
  "Ho letto e accetto l'informativa sulla privacy. I miei dati saranno usati per gestire questa richiesta."

export async function POST(request) {
  try {
    const body = await request.json()
    const { property_id, room, type, message, nome, contatto, privacy_accettata, canale } = body
    if (!property_id || !type || !message) return Response.json({ error: 'property_id, type e message sono obbligatori' }, { status: 400 })

    // Chi prenota un'escursione o un'attività lascia il proprio nome e un
    // recapito. Prima non li chiedeva nessuno: il titolare riceveva
    // «Prenotazione escursione — 2 persone» e non poteva richiamare nessuno.
    // Una prenotazione senza un modo per rispondere non è una prenotazione.
    const conDati = ['escursione', 'attività', 'attivita'].includes(type)
    if (conDati) {
      if (!nome?.trim())    return Response.json({ error: 'Serve il tuo nome per poterti rispondere.' }, { status: 400 })
      if (!contatto?.trim()) return Response.json({ error: 'Serve un recapito: email o telefono.' }, { status: 400 })
      // Nome e recapito sono dati personali: senza consenso non si raccolgono.
      // La spunta nel modulo si toglie con due clic, quindi la condizione sta
      // qui — dove nessuno la può aggirare.
      if (privacy_accettata !== true)
        return Response.json({ error: 'Per prenotare serve il consenso al trattamento dei dati.' }, { status: 400 })
    }

    // I dati di chi prenota entrano nel messaggio, che è ciò che il titolare
    // legge nel pannello e nell'email.
    const messaggioCompleto = conDati
      ? [message, '', `Nome: ${nome.trim()}`, `Contatto: ${contatto.trim()}`,
         canale === 'whatsapp' ? 'Ha scelto di scriverti su WhatsApp.' : null].filter(x => x !== null).join('\n')
      : message

    const { data, error } = await supabaseAdmin.from('requests')
      .insert({ property_id, room: room || null, type, message: messaggioCompleto, status: 'open' }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // La prova del consenso, dove i dati personali ci sono davvero.
    if (conDati) {
      await supabaseAdmin.from('requests').update({
        privacy_accettata: true,
        privacy_accettata_il: new Date().toISOString(),
        privacy_testo: TESTO_CONSENSO,
      }).eq('id', data.id)
    }

    supabaseAdmin.from('entita').select('name, email, azienda_id').eq('id', property_id).single().then(({ data: prop }) => {
      if (prop?.azienda_id) sendWebhooks(prop.azienda_id, 'nuova_richiesta', { richiesta_id: data.id, property_id, tipo: type, messaggio: message })
      if (!prop?.email || !process.env.RESEND_API_KEY) return
      sendEmail({
        _ctx: 'richiesta', fromName: prop.name,
        from: (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>',
        to: prop.email,
        subject: `[${prop.name}] Nuova richiesta: ${type}`,
        html: emailTemplate({
          title: 'Nuova richiesta ospite', entityName: prop.name,
          rows: [
            { label: 'Tipo', value: type },
            ...(room ? [{ label: 'Camera', value: room }] : []),
            ...(conDati ? [{ label: 'Nome', value: nome.trim() }, { label: 'Contatto', value: contatto.trim() }] : []),
            { label: 'Messaggio', value: messaggioCompleto.replace(/\n/g, '<br>') },
            // Se l'ospite ha scelto WhatsApp può aprire la chat e non inviare:
            // il titolare deve saperlo, così se il messaggio non arriva scrive lui.
            ...(canale === 'whatsapp'
              ? [{ label: 'Attenzione', value: 'Ha scelto di scriverti su <strong>WhatsApp</strong>. Se il messaggio non arriva, il suo recapito è qui sopra.' }]
              : []),
          ],
          appUrl: (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com',
        }),
      }).catch(() => {})
    }).catch(() => {})

    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id, property_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let query = supabaseAdmin.from('requests').select('*').order('created_at', { ascending: false })

    if (['admin_struttura', 'staff'].includes(profile.role)) {
      if (!profile.property_id) return Response.json([])
      query = query.eq('property_id', profile.property_id)
    } else if (profile.role === 'admin_azienda') {
      if (!profile.azienda_id) return Response.json([])
      const { data: props } = await supabaseAdmin.from('entita').select('id').eq('azienda_id', profile.azienda_id)
      const ids = props?.map(p => p.id) || []
      if (!ids.length) return Response.json([])
      query = query.in('property_id', ids)
    } else if (profile.role === 'super_admin' && searchParams.get('azienda_id')) {
      const { data: props } = await supabaseAdmin.from('entita').select('id').eq('azienda_id', searchParams.get('azienda_id'))
      const ids = props?.map(p => p.id) || []
      if (!ids.length) return Response.json([])
      query = query.in('property_id', ids)
    }

    if (searchParams.get('property_id')) query = query.eq('property_id', searchParams.get('property_id'))
    if (searchParams.get('status')) query = query.eq('status', searchParams.get('status'))
    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Il nome dell'entità arriva da una lettura sua, non da un join. Il join
    // passava dalla chiave esterna verso `properties`, dove stanno solo le
    // strutture: le richieste dei ristoranti e delle attività comparivano nel
    // pannello senza nome. Il pannello legge `properties.name` da sempre — si
    // cambia da dove arriva il dato, non come si chiama.
    const ids = [...new Set((data || []).map(r => r.property_id).filter(Boolean))]
    let nomi = {}
    if (ids.length) {
      const { data: ent } = await supabaseAdmin.from('entita').select('id, name').in('id', ids)
      nomi = Object.fromEntries((ent || []).map(e => [e.id, e.name]))
    }
    return Response.json((data || []).map(r => ({ ...r, properties: { name: nomi[r.property_id] || null } })))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
