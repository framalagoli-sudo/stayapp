import { supabaseAdmin } from './supabase-server'
import { addProjectDomain, vercelReady } from './vercel-domains'

const STAYAPP_DOMAIN = process.env.STAYAPP_DOMAIN?.trim() || 'oltrenova.com'

// Ogni entità nasce con un indirizzo pronto all'uso: slug.oltrenova.com.
// ⚠️ Il record wildcard *.oltrenova.com su Vercel NON basta: senza registrare il
// singolo hostname, Vercel non emette il certificato e il browser rifiuta la
// connessione (il visitatore vede un errore 525). Perciò qui si registra davvero
// il sottodominio e lo stato salvato riflette l'esito, non un'assunzione.
export async function assicuraSottodominio({ azienda_id, entity_tipo, entity_id, entity_slug }) {
  if (!entity_slug || !entity_id) return null
  try {
    const { data: esistente } = await supabaseAdmin.from('domini').select('*')
      .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('tipo', 'subdomain').maybeSingle()
    if (esistente) return esistente

    const dominio = await sottodominioLibero(entity_slug, entity_tipo)
    const esito = await registraSottodominio(dominio)

    const { data } = await supabaseAdmin.from('domini').insert({
      azienda_id, entity_tipo, entity_id, entity_slug,
      dominio, tipo: 'subdomain', stato: esito.stato,
      vercel_domain_id: esito.registrato ? dominio : null,
      ultima_verifica: new Date().toISOString(),
      verifica_dettaglio: esito.dettaglio,
    }).select().single()
    return data
  } catch (e) {
    console.error('[assicuraSottodominio]', e.message)
    return null
  }
}

// Gli slug sono unici per tabella, non fra tabelle: un ristorante e un'attività
// possono chiamarsi entrambi "garage22" e collidere sullo stesso sottodominio.
// In quel caso distinguiamo con l'iniziale del tipo, in modo prevedibile.
async function sottodominioLibero(slug, entity_tipo) {
  const primo = `${slug}.${STAYAPP_DOMAIN}`
  const { data: occupato } = await supabaseAdmin.from('domini').select('id').eq('dominio', primo).maybeSingle()
  if (!occupato) return primo
  return `${slug}-${entity_tipo[0]}.${STAYAPP_DOMAIN}`
}

// Registra l'hostname sul progetto Vercel. Il dominio radice è già verificato sul
// nostro account, quindi non serve alcuna verifica di proprietà: se la chiamata
// riesce, il certificato viene emesso in pochi secondi.
export async function registraSottodominio(dominio) {
  if (!vercelReady()) {
    return { stato: 'pending', registrato: false, dettaglio: { messaggio: 'Vercel non configurato in questo ambiente' } }
  }
  const r = await addProjectDomain(dominio)
  if (!r.ok) {
    console.error('[registraSottodominio]', dominio, r.error)
    return { stato: 'errore', registrato: false, dettaglio: { errore: r.error } }
  }
  return {
    stato: r.data?.verified === false ? 'pending' : 'attivo',
    registrato: true,
    dettaglio: { registrato_su_vercel: true, verificato: r.data?.verified !== false },
  }
}
