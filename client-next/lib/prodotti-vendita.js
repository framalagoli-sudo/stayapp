import { supabaseAdmin } from './supabase-server'

// I prodotti del catalogo messi in vendita, nella forma che lo shop conosce.
//
// Lo shop nasce con una tabella sua, `prodotti`. Il catalogo del cliente sta in
// `vetrina_elementi`. Sono la stessa cosa scritta due volte, e il cliente doveva
// chiedersi ogni volta dove caricare la sua roba — vedi `CATALOGO.md`.
//
// Qui si cambia **la sorgente, non il contratto**: chi chiama riceve gli stessi
// campi di sempre (`nome`, `prezzo`, `immagini`, `stock`…), quindi il carrello,
// gli ordini e il pagamento non si accorgono di niente. È lo stesso metodo che
// ha reso invisibile l'unificazione delle entità.
//
// ⚠️ Le voci di un ordine sono uno **snapshot JSONB** senza chiave esterna: un
// ordine può contenere prodotti di entrambe le sorgenti senza che nulla si
// rompa. Se ci fosse stata una FK verso `prodotti`, questa fusione avrebbe
// richiesto di spostarla prima.

// Solo le colonne che servono allo shop: con l'asterisco, una colonna aggiunta
// domani al catalogo finirebbe pubblicata da sola.
const CAMPI = 'id, vetrina_id, titolo, slug, copertina_url, immagini, prezzo_vendita, stock, dati, entity_id'

// Un elemento di catalogo raccontato come un prodotto dello shop.
function comeProdotto(el) {
  // Le immagini del catalogo sono un elenco di oggetti; lo shop vuole URL.
  const galleria = Array.isArray(el.immagini)
    ? el.immagini.map(x => (typeof x === 'string' ? x : x?.url)).filter(Boolean)
    : []
  return {
    id: el.id,
    nome: el.titolo || '',
    descrizione: el.dati?.descrizione || '',
    prezzo: Number(el.prezzo_vendita) || 0,
    prezzo_scontato: null,
    immagini: el.copertina_url ? [el.copertina_url, ...galleria] : galleria,
    stock: el.stock ?? null,
    categoria: '',
    slug: el.slug || '',
    ordine: 0,
    // Serve a chi deve sapere da dove viene: il catalogo, non la tabella dello shop.
    origine: 'catalogo',
  }
}

// Le entità di un'azienda: il catalogo è appeso a un'entità, lo shop a un'azienda.
async function entitaDi(aziendaId) {
  const { data } = await supabaseAdmin.from('entita').select('id').eq('azienda_id', aziendaId)
  return (data || []).map(e => e.id)
}

export async function prodottiInVendita(aziendaId) {
  if (!aziendaId) return []
  const ids = await entitaDi(aziendaId)
  if (!ids.length) return []
  const { data } = await supabaseAdmin.from('vetrina_elementi')
    .select(CAMPI)
    .in('entity_id', ids)
    .eq('in_vendita', true)
    .eq('status', 'pubblicata')
  return (data || []).map(comeProdotto)
}

// Gli stessi prodotti, cercati per id: serve a chi crea un ordine e deve
// ricalcolare prezzo e disponibilità dalla fonte invece che dal carrello.
export async function prodottiInVenditaPerId(aziendaId, ids = []) {
  if (!aziendaId || !ids.length) return []
  const entita = await entitaDi(aziendaId)
  if (!entita.length) return []
  const { data } = await supabaseAdmin.from('vetrina_elementi')
    .select(CAMPI)
    .in('id', ids)
    // ⚠️ Il vincolo sull'azienda resta anche cercando per id: senza, basterebbe
    // conoscere l'id di un prodotto altrui per comprarlo dallo shop sbagliato.
    .in('entity_id', entita)
    .eq('in_vendita', true)
    .eq('status', 'pubblicata')
  return (data || []).map(comeProdotto)
}
