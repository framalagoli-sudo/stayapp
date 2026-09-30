// Chi può collegare un numero WhatsApp mentre il flusso non è ancora provato
// dal vivo. Decisione di Francesco (30/09/2026): «limitalo anche a Garage 22 —
// facciamo un ambiente test su un'entità che non usano: Giochi senza Panciere».
//
// Con le chiavi di Meta su Vercel il pulsante comparirebbe a TUTTI i clienti:
// un titolare potrebbe collegare il suo numero con un flusso che nessuno ha
// ancora percorso. Il super_admin passa sempre (è lui che fa la prova, anche
// sull'entità di test); fra i clienti, solo le aziende qui sotto.
//
// Quando la prova dal vivo è riuscita e Francesco lo decide, si apre a tutti
// svuotando il cancello (`APERTO_A_TUTTI = true`), non togliendo i controlli.
const APERTO_A_TUTTI = false

const AZIENDE_PILOTA = new Set([
  'e287644b-c331-4784-8e98-341c040af500', // Garage22 srls
])

export function collegamentoWhatsappAperto(profile, aziendaId) {
  if (APERTO_A_TUTTI) return true
  if (profile?.role === 'super_admin') return true
  return AZIENDE_PILOTA.has(aziendaId)
}
