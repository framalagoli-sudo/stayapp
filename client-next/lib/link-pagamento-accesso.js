import { requireAuth, getProfile } from './server-auth'
import { leggiPrenotazione } from './link-pagamento'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Chi chiede deve aver fatto login, e la prenotazione dev'essere della SUA
// azienda. `tipo` e `id` dicono quale: di chi sia lo si legge dal database, mai
// da quello che arriva. A chi non è sua si risponde «non trovata», come se non
// esistesse.
export async function prenotazioneDiChiChiede(request, tipo, id) {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  if (!['evento', 'risorsa'].includes(tipo) || !UUID.test(String(id || ''))) {
    return { response: Response.json({ error: 'Prenotazione non valida' }, { status: 400 }) }
  }
  const profile = await getProfile(user.id)
  const pren = await leggiPrenotazione(tipo, id)
  if (!pren || !profile || (profile.role !== 'super_admin' && profile.azienda_id !== pren.aziendaId)) {
    return { response: Response.json({ error: 'Prenotazione non trovata' }, { status: 404 }) }
  }
  return { pren }
}
