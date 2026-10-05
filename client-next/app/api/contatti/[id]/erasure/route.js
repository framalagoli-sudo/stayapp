import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { anonimizzaContatto } from '@/lib/contatti-cura'

// Rende anonima una persona, ovunque abbia lasciato i suoi dati: la scheda, le
// prenotazioni di eventi, risorse e offerte, gli invii dei moduli.
// Cosa fa e cosa lascia (gli ordini del negozio) è scritto in `lib/contatti-cura.js`.
export async function POST(request, props) {
  const params = await props.params;
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id && profile?.role !== 'super_admin') return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    // La scheda dev'essere dell'azienda di chi chiede: si controlla prima di
    // qualunque scrittura, e una scheda altrui risulta «non trovata».
    let q = supabaseAdmin.from('contatti').select('id, azienda_id, email, telefono, telefono_e164').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: contatto, error } = await q.maybeSingle()
    if (error || !contatto) return Response.json({ error: 'Contatto non trovato' }, { status: 404 })

    const svuotate = await anonimizzaContatto(contatto)
    return Response.json({ ok: true, svuotate })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
