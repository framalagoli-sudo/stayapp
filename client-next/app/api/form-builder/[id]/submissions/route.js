import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { registraContatto } from '@/lib/crm'

// Le risposte di un modulo. Le sospette (migration 147, lib/spam-moduli.js) si
// leggono a parte: `?spam=1`. La risposta porta sempre i due conteggi, così il
// pannello dice quante ce ne sono in ciascuna linguetta.

async function moduloDiChiChiede(request, id) {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
  if (!profile) return { response: Response.json({ error: 'Profilo non trovato' }, { status: 403 }) }
  // Il modulo deve essere dell'azienda di chi chiede (il super_admin vede tutti).
  let q = supabaseAdmin.from('form_builder').select('id, azienda_id, nome, campi').eq('id', id)
  if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
  const { data: form } = await q.maybeSingle()
  if (!form) return { response: Response.json({ error: 'Accesso negato' }, { status: 403 }) }
  return { form }
}

const conta = async (formId, spam) => (await supabaseAdmin.from('form_submissions')
  .select('id', { count: 'exact', head: true }).eq('form_id', formId).eq('possibile_spam', spam)).count || 0

export async function GET(request, props) {
  const params = await props.params
  try {
    const { form, response } = await moduloDiChiChiede(request, params.id)
    if (response) return response

    const { searchParams } = new URL(request.url)
    const limit  = Math.min(Number(searchParams.get('limit') || '50'), 200)
    const offset = Math.max(Number(searchParams.get('offset') || '0'), 0)
    const spam = searchParams.get('spam') === '1'

    const { data, count, error } = await supabaseAdmin.from('form_submissions')
      .select('*', { count: 'exact' }).eq('form_id', form.id).eq('possibile_spam', spam)
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data, count, limit, offset, conteggi: { richieste: await conta(form.id, false), spam: await conta(form.id, true) } })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

// «Segna come spam» / «Non è spam». Il corpo dice QUALE risposta e cosa: la
// risposta deve essere di questo modulo, e il modulo dell'azienda di chi chiede.
export async function PATCH(request, props) {
  const params = await props.params
  try {
    const { form, response } = await moduloDiChiChiede(request, params.id)
    if (response) return response
    const { id, possibile_spam } = await request.json().catch(() => ({}))
    if (typeof id !== 'string' || typeof possibile_spam !== 'boolean') return Response.json({ error: 'Richiesta non valida' }, { status: 400 })

    const { data: invio } = await supabaseAdmin.from('form_submissions')
      .select('id, dati, contatto_id').eq('id', id).eq('form_id', form.id).maybeSingle()
    if (!invio) return Response.json({ error: 'Non trovato' }, { status: 404 })

    const { error } = await supabaseAdmin.from('form_submissions').update({
      possibile_spam,
      spam_motivo: possibile_spam ? 'segnata dal titolare' : null,
    }).eq('id', invio.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // «Non è spam»: la persona entra fra i contatti, come se la risposta fosse
    // arrivata pulita (porta unica, lib/crm.js). Nessun consenso alla promozione
    // viene dedotto: quello vale solo dal modulo, al momento dell'invio.
    let contattoId = invio.contatto_id
    if (!possibile_spam && !contattoId) {
      const campo = tipo => (form.campi || []).find(c => c.tipo === tipo)
      const nomeCampo = (form.campi || []).find(c => c.tipo === 'text' && /nome|name/i.test(String(c.label || '')))
      const valore = c => (c ? String(invio.dati?.[c.id] ?? '').trim() : '')
      const r = await registraContatto({
        aziendaId: form.azienda_id, email: valore(campo('email')), telefono: valore(campo('tel')), nome: valore(nomeCampo),
        fonte: 'form', attivita: { tipo: 'modulo', titolo: form.nome || 'Modulo', origineId: form.id, riferimento: invio.id },
      })
      if (r.id) {
        contattoId = r.id
        await supabaseAdmin.from('form_submissions').update({ contatto_id: r.id }).eq('id', invio.id)
      }
    }
    return Response.json({ ok: true, contatto_id: contattoId || null })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
