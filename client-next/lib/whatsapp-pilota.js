// Chi può collegare un numero WhatsApp.
//
// Decisioni di Francesco (30/09/2026):
//  · «solo l'admin dell'azienda può collegare WhatsApp, ovvero chi ha l'accesso
//    admin» — lo staff no, nemmeno con il permesso sulla pagina WhatsApp;
//  · «per ora non farlo vedere a Garage 22»: finché il flusso non è provato dal
//    vivo lo vede solo il super_admin, che fa la prova sull'entità di test
//    (Giochi senza Panciere).
//
// Con le chiavi di Meta su Vercel il pulsante comparirebbe a tutti i clienti:
// quando la prova è riuscita e Francesco lo decide, si apre agli admin
// d'azienda con `APERTO_AGLI_ADMIN = true` (o aggiungendo un'azienda pilota),
// senza togliere il controllo sul ruolo.
const APERTO_AGLI_ADMIN = false

// Aziende che vedono il collegamento prima degli altri. Vuoto per decisione.
const AZIENDE_PILOTA = new Set([])

export function collegamentoWhatsappAperto(profile, aziendaId) {
  if (profile?.role === 'super_admin') return true
  if (profile?.role !== 'admin_azienda') return false
  return APERTO_AGLI_ADMIN || AZIENDE_PILOTA.has(aziendaId)
}
