import { supabaseAdmin } from './supabase-server'
import { FUSO_PREDEFINITO } from './fuso'

// Il fuso di un'azienda, per il codice che non ce l'ha già nella sua query.
//
// ⚠️ Sta qui e non in `lib/fuso.js`: quel file lo legge anche il browser, e
// non deve trascinarsi dietro la chiave di servizio.
//
// Una lettura in più per riga scritta è un prezzo accettabile: una data
// registrata nel giorno sbagliato non si accorge nessuno finché non serve.
// In mancanza si torna al predefinito, mai al fuso di chi esegue (UTC).
export async function fusoDiAzienda(aziendaId) {
  if (!aziendaId) return FUSO_PREDEFINITO
  const { data } = await supabaseAdmin.from('aziende')
    .select('fuso_orario').eq('id', aziendaId).maybeSingle()
  return data?.fuso_orario || FUSO_PREDEFINITO
}
