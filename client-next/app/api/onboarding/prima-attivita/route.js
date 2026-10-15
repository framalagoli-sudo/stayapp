import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'
import { creaEntita } from '@/lib/crea-entita'

// Il primo passo di chi si registra da solo: «che attività hai?». L'azienda
// nasce vuota (/api/auth/signup) e senza un'attività non c'è un sito da fare.
//
// ⛔ La categoria si sceglie fra le NOSTRE (`profili_mestiere`), mai un testo
// libero: le funzioni le decide OltreNova (STRATEGIA §6.1). E vale solo per la
// PRIMA attività: dalla seconda in poi la categoria resta del super_admin,
// come nelle route di creazione (403 al titolare). Ok di Francesco al passo
// «che attività hai?» con le nostre categorie (30/09/2026).
//
// GET  → le categorie da proporre (nome e descrizione, niente funzioni)
// POST → { nome, categoria } crea l'attività, se l'azienda non ne ha ancora

async function titolareSenzaAttivita(request) {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  const profile = await getProfile(user.id)
  if (profile?.role !== 'admin_azienda' || !profile.azienda_id)
    return { response: Response.json({ error: 'Non consentito' }, { status: 403 }) }
  const { count, error } = await supabaseAdmin.from('entita')
    .select('id', { count: 'exact', head: true }).eq('azienda_id', profile.azienda_id)
  if (error) return { response: Response.json({ error: error.message }, { status: 500 }) }
  return { aziendaId: profile.azienda_id, haGia: count > 0 }
}

// Le categorie delle sonde («zz_…») non si propongono a nessuno.
const categorie = () => supabaseAdmin.from('profili_mestiere')
  .select('chiave, nome, descrizione, tipo_entita').not('chiave', 'like', 'zz\\_%').order('ordine').order('nome')

export async function GET(request) {
  try {
    const { response, haGia } = await titolareSenzaAttivita(request)
    if (response) return response
    if (haGia) return Response.json({ gia: true, categorie: [] })
    const { data, error } = await categorie()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    // Della descrizione solo la prima frase: il resto lo scrive OltreNova per
    // sé (in «Base»: «Un'entità in Base è un segnale: ci manca il suo profilo»).
    const primaFrase = t => (String(t || '').match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0] || String(t || '')).trim()
    return Response.json({ gia: false, categorie: (data || []).map(({ chiave, nome, descrizione }) => ({ chiave, nome, descrizione: primaFrase(descrizione) })) })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { response, aziendaId, haGia } = await titolareSenzaAttivita(request)
    if (response) return response
    if (haGia) return Response.json({ error: 'La tua prima attività esiste già. Per aggiungerne un\'altra scrivi a info@oltrenova.com.' }, { status: 409 })
    const body = await request.json().catch(() => ({}))
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
    if (!nome) return Response.json({ error: 'Scrivi il nome della tua attività.' }, { status: 400 })
    if (nome.length > 80) return Response.json({ error: 'Il nome è troppo lungo (al massimo 80 caratteri).' }, { status: 400 })
    // La categoria si cerca nell'elenco: una chiave inventata non passa, e il
    // tipo tecnico (l'indirizzo /s /r /a) lo dice la categoria, non il browser.
    const { data: elenco, error } = await categorie()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    const cat = (elenco || []).find(c => c.chiave === body?.categoria)
    if (!cat) return Response.json({ error: 'Scegli che attività hai.' }, { status: 400 })

    const nata = await creaEntita({ aziendaId, tipo: cat.tipo_entita, nome, profilo: cat.chiave })
    // `tipo` qui è quello tecnico (serve al pannello per l'indirizzo della pagina).
    return Response.json({ id: nata.id, slug: nata.slug, tipo: nata.tipo }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
