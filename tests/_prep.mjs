import { admin as sb } from './probe-auth.mjs'
const AZ = '0959b4be-907c-4dda-8c83-eeef3731019b', ENT = '270f8e90-6ae3-4174-9c5d-70610830bc7a'
const { data: esistenti } = await sb.from('prodotti').select('id').eq('azienda_id', AZ)
console.log('prodotti già presenti nell’azienda di prova:', esistenti?.length)
const { data: prod, error: e1 } = await sb.from('prodotti').insert([
  { azienda_id: AZ, nome: 'PROVA Marmellata di fichi', descrizione: 'Vasetto da 250 g, fatta a mano.', prezzo: 8.5, prezzo_scontato: 6.9, immagini: ['https://placehold.co/800x800/png'], immagine_focal: '50% 30%', stock: 3, categoria: 'Dispensa', attivo: true, slug: 'prova-marmellata', ordine: 1 },
  { azienda_id: AZ, nome: 'PROVA Olio extravergine', descrizione: 'Bottiglia da 500 ml.', prezzo: 14, immagini: [], stock: 0, categoria: 'Dispensa', attivo: true, slug: 'prova-olio', ordine: 2 },
]).select('id, nome')
if (e1) throw new Error(e1.message)
const { data: pag, error: e2 } = await sb.from('pagine').insert({
  entity_tipo: 'struttura', entity_id: ENT, titolo: 'Verifica shop', slug: 'verifica-shop-' + Date.now().toString(36), status: 'pubblicata',
  blocks: [{ id: crypto.randomUUID(), type: 'shop', data: { titolo_sezione: 'Il nostro shop', categoria: '', formato: '' } }],
}).select('id, slug').single()
if (e2) throw new Error(e2.message)
console.log(JSON.stringify({ prodotti: prod.map(p => p.id), pagina: pag }))
