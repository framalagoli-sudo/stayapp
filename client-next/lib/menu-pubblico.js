// Cosa del menù esce al pubblico. Senza dipendenze: lo usano le route, le
// pagine e il contesto dell'AI.
//
// Si possono nascondere tre cose, tutte con `active: false`: un menù intero
// (stagionale: il Light Lunch d'inverno), una sua sezione (Antipasti) e un
// singolo piatto. `active` assente vale «visibile»: i menù che c'erano prima
// non lo hanno.
//
// ⚠️ Il filtro sta QUI, a monte, e non nel componente che disegna: quello che
// il titolare nasconde non deve nemmeno arrivare al browser di chi guarda.

const visibile = x => x && x.active !== false

function sezionePubblica(sezione) {
  return { ...sezione, items: (sezione.items || []).filter(visibile) }
}

export function menuPubblico(menu) {
  if (!Array.isArray(menu)) return menu
  return menu.filter(visibile).map(voce => voce.type === 'catalogo'
    ? { ...voce, categories: (voce.categories || []).filter(visibile).map(sezionePubblica) }
    : sezionePubblica(voce))
}

// L'entità come la vede chi non ha fatto login.
export function conMenuPubblico(entita) {
  if (!entita || !Array.isArray(entita.menu)) return entita
  return { ...entita, menu: menuPubblico(entita.menu) }
}
