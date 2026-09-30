// «Inizia qui»: i passi che portano un cliente dal primo accesso al sito
// pubblicato, calcolati dai dati veri e mai da una spunta. Un passo è fatto
// quando nel database c'è quello che promette: chi ha già tutto non vede
// niente, chi ha lasciato un campo vuoto vede esattamente quale.
//
// Solo server: legge con la chiave di servizio. Chi chiama deve aver già
// deciso di quale azienda si parla (la route lo fa col profilo).
import { supabaseAdmin } from './supabase-server'

// I dati che servono al sito, alle notifiche e ai motori di ricerca, con il
// nome che il cliente legge nel pannello.
const DATI = [
  { campo: 'description', nome: 'descrizione' },
  { campo: 'email',       nome: 'email' },
  { campo: 'phone',       nome: 'telefono' },
  { campo: 'address',     nome: 'indirizzo' },
  { campo: 'logo_url',    nome: 'logo' },
]

const BASE = { struttura: 'struttura', ristorante: 'ristoranti', attivita: 'attivita' }

const pieno = v => typeof v === 'string' ? v.trim() !== '' : v != null

export async function primiPassi(aziendaId) {
  const { data: entita, error: e1 } = await supabaseAdmin.from('entita')
    .select('id, tipo, name, description, email, phone, address, logo_url, minisito, indicizzabile')
    .eq('azienda_id', aziendaId).order('created_at')
  if (e1) throw new Error(e1.message)
  // Le pagine non hanno la colonna dell'azienda: si cercano per le sue entità.
  const ids = (entita || []).map(e => e.id)
  const [{ data: home, error: e2 }, { data: domini, error: e3 }, { count: contatti, error: e4 }] = await Promise.all([
    ids.length
      ? supabaseAdmin.from('pagine').select('entity_id, blocks').in('entity_id', ids).eq('slug', '__home__')
      : Promise.resolve({ data: [] }),
    supabaseAdmin.from('domini').select('entity_id, dominio, stato')
      .eq('azienda_id', aziendaId).eq('stato', 'attivo'),
    supabaseAdmin.from('contatti').select('id', { count: 'exact', head: true })
      .eq('azienda_id', aziendaId),
  ])
  const errore = e2 || e3 || e4
  if (errore) throw new Error(errore.message)

  const perEntita = (entita || []).filter(e => BASE[e.tipo]).map(e => {
    const base = `/admin/${BASE[e.tipo]}/${e.id}`
    const mancano = DATI.filter(d => !pieno(e[d.campo])).map(d => d.nome)
    const blocchi = (home || []).find(h => h.entity_id === e.id)?.blocks
    const haSito = Array.isArray(blocchi) && blocchi.length > 0
    const pubblicato = !!e.minisito?.active
    // Il sottodominio nostro c'è sempre: conta solo un indirizzo del cliente.
    const dominioSuo = (domini || []).find(d => d.entity_id === e.id && !/(^|\.)oltrenova\.com$/i.test(d.dominio || ''))
    return {
      id: e.id, tipo: e.tipo, nome: e.name,
      passi: [
        { chiave: 'dati', titolo: "I dati dell'attività", fatto: mancano.length === 0,
          dettaglio: mancano.length ? `Mancano: ${mancano.join(', ')}` : 'Completi', link: `${base}/info` },
        { chiave: 'sito', titolo: 'Il tuo sito', fatto: haSito,
          dettaglio: haSito ? 'La home è pronta' : "Crealo in pochi minuti con l'assistente", link: `${base}/sito` },
        { chiave: 'pubblica', titolo: 'Pubblicato e visibile su Google', fatto: pubblicato && !!e.indicizzabile,
          dettaglio: !pubblicato ? 'Il sito non è ancora online'
            : !e.indicizzabile ? 'È online ma nascosto ai motori di ricerca' : 'Online e visibile',
          link: `${base}/sito` },
        { chiave: 'dominio', titolo: 'Il tuo indirizzo', facoltativo: true, fatto: !!dominioSuo,
          dettaglio: dominioSuo ? dominioSuo.dominio : 'Facoltativo: collega un dominio tuo (es. www.iltuonome.it)',
          link: `${base}/domini` },
      ],
    }
  })

  return {
    entita: perEntita,
    // I contatti sono dell'azienda, non della singola entità.
    contatto: { chiave: 'contatto', titolo: 'Il primo contatto', fatto: (contatti || 0) > 0,
      dettaglio: contatti ? `${contatti} ${contatti === 1 ? 'contatto' : 'contatti'} raccolti` : 'Arriva quando qualcuno ti scrive dal sito',
      link: '/admin/contatti' },
  }
}
