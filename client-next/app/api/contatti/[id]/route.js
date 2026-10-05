import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { sendWebhooks } from '@/lib/send-webhooks'
import { normalizzaTelefono } from '@/lib/contatti-import'
import { STADI_TRATTATIVA as STADI } from '@/lib/contatti-regole'
import { FONTI_REVOCA } from '@/lib/disiscrizione'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function PATCH(request, props) {
  const params = await props.params;
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const body = await request.json()
    const allowed = ['nome', 'email', 'telefono', 'tags', 'note', 'iscritto_newsletter', 'pipeline_stage', 'whatsapp_optin']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    // Quando il consenso WhatsApp cambia si annota il momento: concesso o revocato
    // che sia, deve restarne traccia.
    if (body.whatsapp_optin !== undefined) {
      if (body.whatsapp_optin) {
        updates.whatsapp_optin_il = new Date().toISOString()
        updates.whatsapp_optin_fonte = body.whatsapp_optin_fonte || 'inserimento manuale'
        updates.whatsapp_optout_il = null
      } else {
        updates.whatsapp_optout_il = new Date().toISOString()
      }
    }
    // Se cambia il numero cambia anche la sua chiave: lasciarla al numero
    // vecchio farebbe riconoscere questa persona come un'altra.
    if ('telefono' in updates) updates.telefono_e164 = normalizzaTelefono(updates.telefono)
    // Lo stadio arriva dal client e finiva nella colonna com'era: una parola
    // inventata faceva sparire il contatto da ogni colonna. Catalogo chiuso;
    // vuoto = fuori dalle trattative.
    if ('pipeline_stage' in updates) {
      if (updates.pipeline_stage === '' || updates.pipeline_stage == null) updates.pipeline_stage = null
      else if (!STADI.includes(updates.pipeline_stage)) return Response.json({ error: 'Stadio non valido' }, { status: 400 })
    }
    // Il consenso alle email cambiato a mano lascia traccia di quando e come.
    if (body.iscritto_newsletter === true || body.iscritto_newsletter === false) {
      const { data: prima } = await supabaseAdmin.from('contatti').select('iscritto_newsletter').eq('id', params.id).maybeSingle()
      if (prima && !prima.iscritto_newsletter && body.iscritto_newsletter === true) {
        Object.assign(updates, { marketing_consenso_il: new Date().toISOString(), marketing_consenso_fonte: 'inserimento manuale', marketing_revoca_il: null, marketing_revoca_fonte: null })
      }
      // Tolta a mano: resta scritto quando, come per chi si toglie da solo.
      if (prima?.iscritto_newsletter && body.iscritto_newsletter === false) {
        Object.assign(updates, { marketing_revoca_il: new Date().toISOString(), marketing_revoca_fonte: FONTI_REVOCA.titolare })
      }
    }
    updates.updated_at = new Date().toISOString()

    let q = supabaseAdmin.from('contatti').update(updates).eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data, error } = await q.select().single()
    if (error) return Response.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
    if (updates.pipeline_stage) sendWebhooks(data.azienda_id, 'cambio_stage_pipeline', { contatto_id: data.id, nome: data.nome, email: data.email, stage: updates.pipeline_stage })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, props) {
  const params = await props.params;
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    let q = supabaseAdmin.from('contatti').delete().eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
