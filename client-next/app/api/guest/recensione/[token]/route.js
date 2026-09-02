import { supabaseAdmin } from '@/lib/supabase-server'
import { urlEsterno } from '@/lib/url-esterno'
import { sendEmail } from '@/lib/send-email'
import { emailTemplate } from '@/lib/email-template'

export async function GET(request, props) {
  const params = await props.params;
  try {
    const { data, error } = await supabaseAdmin.from('recensioni')
      .select('id, autore, entity_tipo, entity_id, pubblica').eq('token', params.token).single()
    if (error || !data) return Response.json({ error: 'Link non valido o già utilizzato' }, { status: 404 })
    if (data.pubblica) return Response.json({ error: 'Recensione già inviata' }, { status: 410 })

    // ⚠️ Leggeva da properties/ristoranti/attivita, ferme dalla migration 079:
    // per un'entità creata dopo l'unificazione lì non c'è niente, quindi la
    // pagina della recensione usciva senza nome, senza logo e — soprattutto —
    // senza il collegamento a Google, che è il motivo per cui esiste.
    const { data: entity } = await supabaseAdmin.from('entita')
      .select('name, logo_url, theme, minisito').eq('id', data.entity_id).maybeSingle()
    return Response.json({
      autore: data.autore,
      entity_name: entity?.name || '',
      entity_logo: entity?.logo_url || null,
      primary: entity?.theme?.primaryColor || '#1a1a2e',
      // 🔒 L'indirizzo lo scrive il cliente nel pannello e il browser ci va da
      // solo, senza che nessuno clicchi: se non è http o https non esce di qui.
      redirect_url: urlEsterno(entity?.minisito?.recensioni_redirect_url),
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request, props) {
  const params = await props.params;
  try {
    const { autore, stelle, testo } = await request.json()
    if (!stelle || stelle < 1 || stelle > 5) return Response.json({ error: 'stelle obbligatorie (1-5)' }, { status: 400 })

    const { data: rec, error: fe } = await supabaseAdmin.from('recensioni')
      .select('id, autore, pubblica, verificata, entity_tipo, entity_id, azienda_id').eq('token', params.token).single()
    if (fe || !rec) return Response.json({ error: 'Link non valido' }, { status: 404 })
    // La guardia va su `verificata`, non su `pubblica`: una recensione negativa
    // resta non pubblica, quindi con `pubblica` si poteva reinviare all'infinito
    // e ogni invio spediva un'altra email al titolare.
    if (rec.verificata || rec.pubblica) return Response.json({ error: 'Recensione già inviata' }, { status: 410 })

    // Stessa lettura di sopra: dalla tabella viva, e con l'indirizzo validato.
    const { data: entity } = await supabaseAdmin.from('entita')
      .select('minisito').eq('id', rec.entity_id).maybeSingle()
    const redirectUrl = urlEsterno(entity?.minisito?.recensioni_redirect_url)
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
        sendEmail({ _ctx: 'recensione-privata',
          to: az.email,
          subject: `[OltreNova] Nuova recensione ${stars} da ${autore?.trim() || 'Anonimo'}`,
          html: emailTemplate({
            title: `Nuova recensione ${stars}`, entityName: 'OltreNova',
            rows: [
              { label: 'Autore', value: autore?.trim() || 'Anonimo' },
              { label: 'Voto', value: `${stelle}/5 stelle` },
              { label: 'Recensione', value: (testo?.trim() || '—').replace(/\n/g, '<br>') },
            ],
            appUrl: (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com',
          }),
        }).catch(() => {})
      }
    }
    return Response.json({ ok: true, redirect: isPositive && redirectUrl ? redirectUrl : null })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
