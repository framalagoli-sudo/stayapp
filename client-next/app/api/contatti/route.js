import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'
import { sendWebhooks } from '@/lib/send-webhooks'
import { normalizzaTelefono } from '@/lib/contatti-import'

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let aziendaId = null
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      aziendaId = profile.azienda_id
    } else if (searchParams.get('azienda_id')) {
      aziendaId = searchParams.get('azienda_id')
    }
    // Sanitizza i metacaratteri PostgREST (,()\\*) per evitare filter-injection nella .or().
    const cerca = (searchParams.get('search') || '').replace(/[,()\\*]/g, '').trim()
    // La query si ricostruisce a ogni pagina: lo stesso costruttore riusato
    // porterebbe con sé l'intervallo della pagina precedente.
    const query = () => {
      let q = supabaseAdmin.from('contatti').select('*').order('created_at', { ascending: false }).order('id')
      if (aziendaId) q = q.eq('azienda_id', aziendaId)
      if (searchParams.get('tag')) q = q.contains('tags', [searchParams.get('tag')])
      if (searchParams.get('newsletter') === 'true') q = q.eq('iscritto_newsletter', true)
      if (cerca) q = q.or(`nome.ilike.%${cerca}%,email.ilike.%${cerca}%,telefono.ilike.%${cerca}%`)
      return q
    }
    // ⚠️ A pagine: PostgREST restituisce al massimo mille righe, e oltre quella
    // soglia i contatti più vecchi sparivano dall'elenco senza nessun errore.
    const data = []
    for (let da = 0; ; da += 1000) {
      const { data: pagina, error } = await query().range(da, da + 999)
      if (error) return Response.json({ error: error.message }, { status: 500 })
      data.push(...(pagina || []))
      if (!pagina || pagina.length < 1000) break
    }
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const body = await request.json()
    const { nome, email, telefono, tags, note, iscritto_newsletter, whatsapp_optin } = body
    const azienda_id = resolveAziendaId(profile, body.azienda_id)
    if (!azienda_id || !nome?.trim()) return Response.json({ error: 'azienda_id e nome obbligatori' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('contatti').insert({
      azienda_id, nome: nome.trim(),
      email: email?.trim() || null, telefono: telefono?.trim() || null,
      // La forma internazionale del numero: è la chiave con cui si riconosce
      // la stessa persona quando poi prenota o scrive su WhatsApp.
      telefono_e164: normalizzaTelefono(telefono),
      tags: tags || [], note: note || null,
      iscritto_newsletter: !!iscritto_newsletter, fonte: 'manuale',
      // Data e provenienza del consenso: servono a dimostrarlo se qualcuno contesta.
      whatsapp_optin: !!whatsapp_optin,
      whatsapp_optin_il: whatsapp_optin ? new Date().toISOString() : null,
      whatsapp_optin_fonte: whatsapp_optin ? 'inserimento manuale' : null,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    sendWebhooks(data.azienda_id, 'nuovo_contatto', { contatto_id: data.id, nome: data.nome, email: data.email, telefono: data.telefono })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
