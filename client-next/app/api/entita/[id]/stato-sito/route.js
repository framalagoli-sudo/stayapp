import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'
import { hostUfficiale } from '@/lib/indirizzo-ufficiale'

// «Il mio sito è online? Si trova su Google? Cosa mi manca?»
//
// Sono le tre domande che un cliente si fa, e fino al 18/09/2026 non c'era un
// posto dove leggerne la risposta: l'interruttore della visibilità stava in
// cima alla pagina del sito, ma da solo non dice se il sito è pubblicato, a
// quale indirizzo risponde, se i motori hanno qualcosa da leggere.
//
// ⚠️ Qui si dice cosa **dipende da noi**. «Indicizzato» non lo sappiamo: lo sa
// Google, e per saperlo serve Search Console. Dire «sei su Google» senza averlo
// verificato sarebbe la bugia più facile da raccontare in questa pagina.

export const dynamic = 'force-dynamic'

export async function GET(request, props) {
  const params = await props.params
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    if (!['struttura', 'ristorante', 'attivita'].includes(tipo)) {
      return Response.json({ error: 'Tipo non valido' }, { status: 400 })
    }
    const { response } = await requireEntityAccess(request, tipo, params.id)
    if (response) return response

    // Colonne elencate: è una risposta che passa dal browser del cliente.
    const { data: ent } = await supabaseAdmin.from('entita')
      .select('id, slug, tipo, name, azienda_id, indicizzabile, minisito, cover_url, logo_url')
      .eq('id', params.id).maybeSingle()
    if (!ent) return Response.json({ error: 'Non trovato' }, { status: 404 })

    const mini = ent.minisito || {}
    const oggi = new Date().toISOString()

    const [{ count: pagine }, { count: articoli }, { count: eventi }, { data: home }, indirizzo] = await Promise.all([
      supabaseAdmin.from('pagine').select('id', { count: 'exact', head: true })
        .eq('entity_tipo', tipo).eq('entity_id', ent.id).eq('status', 'pubblicata').neq('slug', '__home__'),
      supabaseAdmin.from('articoli').select('id', { count: 'exact', head: true })
        .eq('azienda_id', ent.azienda_id).eq('published', true).eq('active', true),
      supabaseAdmin.from('eventi').select('id', { count: 'exact', head: true })
        .eq('entity_tipo', tipo).eq('entity_id', ent.id)
        .eq('published', true).eq('active', true).gte('date_start', oggi),
      // La home è una pagina a blocchi: se non c'è, il sito non ha ancora un
      // contenuto suo — ed è la differenza fra «pubblicato» e «pronto».
      supabaseAdmin.from('pagine').select('id, updated_at, blocks')
        .eq('entity_tipo', tipo).eq('entity_id', ent.id).eq('slug', '__home__').maybeSingle(),
      hostUfficiale(ent.id),
    ])

    const { data: dominio } = await supabaseAdmin.from('domini')
      .select('dominio, tipo, stato').eq('entity_id', ent.id).eq('stato', 'attivo')

    return Response.json({
      nome: ent.name,
      pubblicato: !!mini.active,
      visibileAiMotori: ent.indicizzabile !== false,
      indirizzo: indirizzo || null,
      dominioProprio: (dominio || []).some(d => d.tipo !== 'subdomain'),
      sottodomini: (dominio || []).filter(d => d.tipo === 'subdomain').map(d => d.dominio),
      // Quello che i motori leggono per primo, e che scrivono nei risultati.
      titoloSeo: (mini.seo_title || '').trim() || null,
      descrizioneSeo: (mini.seo_description || '').trim() || null,
      immagineSocial: !!(mini.og_image_url || ent.cover_url || ent.logo_url),
      // Cosa c'è da leggere.
      blocchiHome: Array.isArray(home?.blocks) ? home.blocks.length : 0,
      ultimaModificaHome: home?.updated_at || null,
      pagine: pagine || 0,
      articoli: articoli || 0,
      eventiInProgramma: eventi || 0,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
