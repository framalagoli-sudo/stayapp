// Il Club, lato server: cosa legge un cliente e cosa vede la regia.
//
// Un cliente riceve solo contenuti PUBBLICATI, già iniziati, e per i mestieri
// delle sue entità (o per tutti). Il filtro sta qui, non nel componente.
//
// Solo server. Chi chiama ha già deciso di quale azienda si parla.
import { supabaseAdmin } from './supabase-server'
import { azioneDi, inVetrina, perMestieri, quandoManca, oggiIso } from './club-regole'

const COLONNE = 'id, tipo, titolo, testo, mestieri, data_occasione, visibile_dal, visibile_al, azione, stato, created_at, updated_at'
const IN_VETRINA = 2

// I mestieri di un'azienda: i profili delle sue entità.
export async function mestieriDi(aziendaId) {
  const { data, error } = await supabaseAdmin.from('entita').select('profilo').eq('azienda_id', aziendaId)
  if (error) throw new Error(error.message)
  return [...new Set((data || []).map(e => e.profilo).filter(Boolean))]
}

// Quello che esce verso il cliente: niente stato, niente chi l'ha scritto.
function perIlCliente(c, oggi) {
  return {
    id: c.id, tipo: c.tipo, titolo: c.titolo, testo: c.testo,
    data_occasione: c.data_occasione, quando: quandoManca(c.data_occasione, oggi),
    azione: azioneDi(c.azione), pubblicato_il: c.visibile_dal,
  }
}

// `mestieri` = null per guardare tutto (la regia in anteprima).
export async function clubPer(aziendaId, { oggi = null } = {}) {
  const mestieri = aziendaId ? await mestieriDi(aziendaId) : []
  if (!oggi) {
    const { data: az } = aziendaId
      ? await supabaseAdmin.from('aziende').select('fuso_orario').eq('id', aziendaId).maybeSingle()
      : { data: null }
    oggi = oggiIso(new Date(), az?.fuso_orario || undefined)
  }
  const { data, error } = await supabaseAdmin.from('club_contenuti').select(COLONNE)
    .eq('stato', 'pubblicato').lte('visibile_dal', oggi)
    .order('visibile_dal', { ascending: false }).limit(200)
  if (error) throw new Error(error.message)
  const suoi = (data || []).filter(c => perMestieri(c, mestieri))

  // «Oggi per te»: prima le occasioni che si avvicinano (la più vicina in testa),
  // poi il resto dal più recente. Un'occasione passata non è più «oggi».
  const vetrina = suoi.filter(c => inVetrina(c, oggi) && (!c.data_occasione || c.data_occasione >= oggi))
  vetrina.sort((a, b) => {
    if (a.data_occasione && b.data_occasione) return a.data_occasione.localeCompare(b.data_occasione)
    if (a.data_occasione) return -1
    if (b.data_occasione) return 1
    return b.visibile_dal.localeCompare(a.visibile_dal)
  })

  return {
    oggi: vetrina.slice(0, IN_VETRINA).map(c => perIlCliente(c, oggi)),
    archivio: suoi.map(c => perIlCliente(c, oggi)),
  }
}

// Visto / premuto: una riga per contenuto, azienda e gesto. Solo per contenuti
// che quell'azienda può davvero vedere — un id inventato non conta niente.
export async function registraGesto(aziendaId, contenutoId, gesto) {
  const { archivio } = await clubPer(aziendaId)
  if (!archivio.some(c => c.id === contenutoId)) return false
  const { error } = await supabaseAdmin.from('club_letture')
    .upsert({ contenuto_id: contenutoId, azienda_id: aziendaId, gesto }, { onConflict: 'contenuto_id,azienda_id,gesto', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
  return true
}

// La regia: tutti i contenuti, con quante aziende li hanno visti e premuti.
export async function contenutiRegia() {
  const [{ data, error }, { data: letture, error: e2 }] = await Promise.all([
    supabaseAdmin.from('club_contenuti').select(COLONNE).order('visibile_dal', { ascending: false }).limit(500),
    supabaseAdmin.from('club_letture').select('contenuto_id, gesto'),
  ])
  if (error || e2) throw new Error((error || e2).message)
  const conta = {}
  for (const l of letture || []) {
    conta[l.contenuto_id] ??= { visto: 0, clic: 0 }
    conta[l.contenuto_id][l.gesto]++
  }
  return (data || []).map(c => ({ ...c, letture: conta[c.id] || { visto: 0, clic: 0 } }))
}
