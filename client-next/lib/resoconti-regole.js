// Ogni quanto un'azienda riceve il resoconto per email: una scelta sola, che fa
// OltreNova dal cruscotto dell'azienda (decisione di Francesco, 15/10/2026).
// Senza dipendenze: la leggono il pannello (che la mostra) e la route (che la
// accetta). Una scelta fuori da qui non si salva.

export const SCELTE_RESOCONTI = [
  { chiave: 'settimanale', etichetta: 'Ogni settimana' },
  { chiave: 'mensile', etichetta: 'Ogni mese' },
  { chiave: 'nessuno', etichetta: 'Non mandarlo' },
]

export const sceltaAmmessa = v => SCELTE_RESOCONTI.some(s => s.chiave === v) ? v : null

export const TIPI_RESOCONTO = ['settimanale', 'mensile']

// L'azienda riceve questo tipo?
export const vuoleIlTipo = (scelta, tipo) => scelta === tipo
