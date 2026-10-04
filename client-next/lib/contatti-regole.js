// Le regole dei contatti che servono sia alle route sia al pannello.
//
// ⚠️ Nessuna dipendenza: lo legge anche il browser.

// Gli stadi di una trattativa. Le chiavi sono quelle storiche del database
// (`lead`, `chiuso_vinto`…): cambiarle vorrebbe dire riscrivere i dati dei
// clienti. Cambiano i NOMI che si leggono — «Nuovo lead» e «Chiuso ✓» erano
// gergo da venditori.
//
// `pipeline_stage` vuoto = il contatto non è in trattativa. È il caso normale:
// chi prenota o compra non ha niente da trattare.
export const STADI_TRATTATIVA_ELENCO = [
  { key: 'lead',         label: 'Da contattare', color: '#6b6b76', light: '#f5f5f5' },
  { key: 'contattato',   label: 'Contattato',    color: '#2b6cb0', light: '#ebf4ff' },
  { key: 'proposta',     label: 'In trattativa', color: '#b7791f', light: '#fffbeb' },
  { key: 'chiuso_vinto', label: 'Concluso',      color: '#276749', light: '#f0fff4' },
  { key: 'chiuso_perso', label: 'Perso',         color: '#c53030', light: '#fff5f5' },
]
export const STADI_TRATTATIVA = STADI_TRATTATIVA_ELENCO.map(s => s.key)

// 🔒 I collaboratori leggono i contatti solo se hanno il permesso. Chi fa i
// preventivi deve poter scegliere a chi mandarli, quindi vale anche il suo.
// Tutti gli altri ruoli vedono i contatti della propria azienda.
export function staffPuoLeggereContatti(profile) {
  if (!profile) return false
  if (profile.role !== 'staff') return true
  return !!(profile.permissions?.contatti || profile.permissions?.preventivi)
}
