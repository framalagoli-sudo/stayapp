// Sezioni condivise, lato server. Le regole comuni stanno in `sezioni-regole.js`
// (senza dipendenze: le legge anche il pannello); questo file tocca il database.
import { supabaseAdmin } from '@/lib/supabase-server'
import { TIPO_SEZIONE, idSezione, contenutoSezione } from '@/lib/sezioni-regole'

// Mette al posto di ogni blocco `sezione` i blocchi veri della sezione.
//
// È il punto da cui passa chiunque legga una pagina per MOSTRARLA o per
// leggerne i testi (sito, anteprima, traduzioni): dopo di qui i blocchi sono
// blocchi normali, e tutto quello che viene dopo — traduzioni, descrizione per
// i motori, eventi stampati nell'HTML — non sa che esistono le sezioni.
//
// 🔒 La sezione si cerca SOLO fra quelle della stessa entità della pagina: un
// id di un altro sito non trova niente, e il blocco semplicemente non c'è.
// Una pagina senza sezioni non fa nessuna lettura in più.
export async function espandiSezioni(blocks, entityTipo, entityId) {
  if (!Array.isArray(blocks) || !blocks.some(b => b?.type === TIPO_SEZIONE)) return blocks
  const ids = [...new Set(blocks.map(idSezione).filter(Boolean))]
  let trovate = []
  if (ids.length) {
    const { data, error } = await supabaseAdmin.from('sezioni').select('id, blocks')
      .eq('entity_tipo', entityTipo).eq('entity_id', entityId).in('id', ids)
    if (error) console.error('[sezioni] lettura fallita:', error.message)
    trovate = data || []
  }
  const perId = new Map(trovate.map(s => [s.id, contenutoSezione(s.blocks)]))
  // L'id di ogni blocco si compone con quello del blocco `sezione` che lo
  // porta: la stessa sezione può stare due volte nella stessa pagina.
  return blocks.flatMap(b => b?.type === TIPO_SEZIONE
    ? (perId.get(idSezione(b)) || []).map(x => ({ ...x, id: `${b.id}:${x.id}` }))
    : [b])
}

// In quali pagine è usata ogni sezione di un'entità: { idSezione: [{ id, titolo, slug }] }.
export async function usiDelleSezioni(entityTipo, entityId) {
  const { data, error } = await supabaseAdmin.from('pagine').select('id, titolo, slug, blocks')
    .eq('entity_tipo', entityTipo).eq('entity_id', entityId)
  if (error) throw new Error(error.message)
  const usi = {}
  for (const p of data || []) {
    const viste = new Set((Array.isArray(p.blocks) ? p.blocks : []).map(idSezione).filter(Boolean))
    for (const id of viste) (usi[id] ||= []).push({ id: p.id, titolo: p.slug === '__home__' ? 'Home' : (p.titolo || 'Pagina senza titolo'), slug: p.slug })
  }
  return usi
}
