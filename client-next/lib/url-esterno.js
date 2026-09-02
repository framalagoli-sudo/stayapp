// Un indirizzo scritto dal cliente che diventa una navigazione.
//
// ⚠️ Non è la stessa cosa di un link dentro una pagina: qui il browser ci va da
// solo, senza che nessuno clicchi. Un `javascript:` o un `data:` salvato mesi
// prima nel pannello diventerebbe codice eseguito nel browser di un ospite che
// ha appena lasciato una recensione.
//
// Il catalogo è chiuso e cortissimo: **solo http e https**. Non `mailto:` né
// `tel:` né un percorso interno — questo serve a mandare qualcuno sul profilo
// pubblico della sua attività, e per quello non esiste altro.
//
// ⚠️ Nessun import: questo file lo può leggere anche il browser.

export function urlEsterno(valore) {
  const s = String(valore || '').trim()
  if (!s) return null
  let u
  try { u = new URL(s) } catch { return null }
  // `URL` normalizza da sola i travestimenti («jAvAsCrIpT:», spazi in mezzo,
  // caratteri di controllo): confrontare la stringa grezza non basterebbe.
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  return u.href
}

// Vero se si può salvare. Il vuoto è lecito: vuol dire «nessun redirect».
export function urlEsternoValido(valore) {
  const s = String(valore || '').trim()
  return s === '' || urlEsterno(s) !== null
}
