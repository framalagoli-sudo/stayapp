// Far nascere un'entità (struttura, ristorante, attività). Un posto solo: lo
// usano le tre route di creazione del pannello e il primo accesso di chi si
// registra da solo (`/api/onboarding/prima-attivita`). Prima la stessa
// sequenza era scritta tre volte, ognuna con il suo slug.
//
// Chi chiama ha GIÀ deciso: di quale azienda, se la categoria è ammessa per
// chi la chiede, quali campi del corpo passano (`extras`, da una lista chiusa).
//
// Solo server.
import { supabaseAdmin } from './supabase-server'
import { MODULI_PREDEFINITI, MINISITO_INIZIALE } from './funzioni'
import { assicuraSottodominio } from './create-subdomain'
import { dopoLaNascita } from './applica-profilo'

export const TIPI_ENTITA = ['struttura', 'ristorante', 'attivita']

const slugify = (str, ripiego) => String(str).toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || ripiego

// Restituisce la riga appena nata, riletta (la categoria scrive i suoi
// interruttori dopo l'inserimento). Lancia se l'inserimento fallisce.
export async function creaEntita({ aziendaId, tipo, nome, extras = {}, settore = null, profilo = null }) {
  if (!TIPI_ENTITA.includes(tipo)) throw new Error('Tipo non valido')
  const base = slugify(nome, tipo)
  // Lo slug è unico fra TUTTE le entità, non dentro il tipo.
  const { data: esiste } = await supabaseAdmin.from('entita').select('id').eq('slug', base).limit(1)
  const slug = esiste?.length > 0 ? `${base}-${Date.now().toString(36)}` : base

  const { data, error } = await supabaseAdmin.from('entita').insert({
    ...extras, name: String(nome).trim(), slug, azienda_id: aziendaId, tipo,
    ...(settore ? { settore } : {}),
    moduli: MODULI_PREDEFINITI[tipo], minisito: MINISITO_INIZIALE,
  }).select().single()
  if (error) throw new Error(error.message)
  // await necessario: registra il sottodominio su Vercel, e in serverless una
  // chiamata lasciata in sospeso muore con la risposta.
  await assicuraSottodominio({ azienda_id: aziendaId, entity_tipo: tipo, entity_id: data.id, entity_slug: data.slug })
  await dopoLaNascita(data.id, aziendaId, profilo)
  const { data: fresca } = await supabaseAdmin.from('entita').select().eq('id', data.id).single()
  return fresca || data
}
