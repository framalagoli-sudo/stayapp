// Sezioni condivise — le regole che leggono sia il server sia il pannello.
// Nessuna dipendenza: il browser può importarlo.
//
// Nella pagina una sezione condivisa è un blocco `{ type: 'sezione', data: {
// sezione_id } }`. Il contenuto vive nella tabella `sezioni` e nella pagina non
// si salva mai. Solo dentro l'editor il blocco porta con sé `_blocchi` e
// `_nome` (quello che c'è nella sezione, per disegnarla e modificarla): prima
// di salvare la pagina si tolgono (`soloRiferimenti`).

export const TIPO_SEZIONE = 'sezione'
export const MAX_BLOCCHI_SEZIONE = 12
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const idSezione = b => (b?.type === TIPO_SEZIONE && typeof b.data?.sezione_id === 'string' && UUID.test(b.data.sezione_id)) ? b.data.sezione_id : null
export const eUuid = v => typeof v === 'string' && UUID.test(v)

// I blocchi di una pagina come si salvano: di una sezione condivisa resta
// soltanto il riferimento.
export function soloRiferimenti(blocks) {
  if (!Array.isArray(blocks)) return blocks
  return blocks.map(b => b?.type === TIPO_SEZIONE
    ? { id: b.id, type: TIPO_SEZIONE, data: { sezione_id: typeof b.data?.sezione_id === 'string' ? b.data.sezione_id : '' } }
    : b)
}

// Il contenuto di una sezione: blocchi veri, mai un'altra sezione dentro (una
// sezione che ne contiene un'altra può contenere sé stessa).
export function contenutoSezione(blocks) {
  if (!Array.isArray(blocks)) return []
  return blocks
    .filter(b => b && typeof b === 'object' && typeof b.type === 'string' && b.type !== TIPO_SEZIONE && typeof b.id === 'string')
    .slice(0, MAX_BLOCCHI_SEZIONE)
    .map(b => ({ id: b.id, type: b.type, data: (b.data && typeof b.data === 'object' && !Array.isArray(b.data)) ? b.data : {}, ...(b.style && typeof b.style === 'object' && !Array.isArray(b.style) ? { style: b.style } : {}) }))
}
