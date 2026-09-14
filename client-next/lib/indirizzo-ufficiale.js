import { supabaseAdmin } from './supabase-server'

// Qual è **l'indirizzo vero** di un sito?
//
// ⛔ Lo stesso sito vive su tre indirizzi diversi:
//     https://www.oltrenova.com/r/garage22     ← il percorso interno
//     https://garage22.oltrenova.com           ← il sottodominio che diamo noi
//     https://www.garage22terni.it             ← il dominio del cliente
//
// Fino al 14/09/2026 **ognuno dei tre dichiarava sé stesso come l'originale**
// (`canonical` che punta a sé). Per un motore di ricerca sono tre siti gemelli:
// ne sceglie uno lui, e di solito vince il dominio più forte — il nostro. Il
// cliente paga un dominio per farsi trovare col proprio nome, e si ritrovava
// nei risultati con il nostro.
//
// La regola, in ordine: **il dominio del cliente**, se ne ha uno acceso; poi il
// suo sottodominio; e solo in mancanza di entrambi il percorso su oltrenova.com.
// Gli altri due non spariscono — continuano a funzionare — ma dicono a Google
// qual è quello buono, e il valore si concentra lì invece di dividersi in tre.
//
// ⚠️ `stato = 'attivo'` non è una dichiarazione ma una misura: `diagnosticaDominio`
// controlla Vercel, il DNS reale e fa una GET HTTPS vera. Serve, perché un
// canonical che punta a un indirizzo rotto è peggio di nessun canonical.

export async function hostUfficiale(entityId) {
  if (!entityId) return null
  const { data } = await supabaseAdmin.from('domini')
    .select('dominio, tipo')
    .eq('entity_id', entityId).eq('stato', 'attivo')
    .in('tipo', ['custom', 'subdomain'])
  if (!data?.length) return null
  // Il dominio del cliente batte sempre il sottodominio che gli diamo noi.
  const scelto = data.find(d => d.tipo === 'custom') || data.find(d => d.tipo === 'subdomain')
  return scelto?.dominio || null
}
