// Opzioni di stile condivise dalle pagine Tema (struttura/ristorante/attivita).
export const BG_COLORS = [
  { value: '#ffffff', label: 'Bianco' },
  { value: '#f8f6f2', label: 'Crema' },
  { value: '#f0f4f8', label: 'Azzurro chiaro' },
  { value: '#f5f0fa', label: 'Lavanda' },
  { value: '#1a1a2e', label: 'Notte' },
]
export const TEXT_COLORS = [
  { value: '#1a1a2e', label: 'Scuro' },
  { value: '#ffffff', label: 'Chiaro' },
]
export const BORDER_STYLES = [
  { key: 'rounded', label: 'Arrotondato', desc: '16px', radius: 16 },
  { key: 'mixed',   label: 'Misto',       desc: '8px',  radius: 8 },
  { key: 'square',  label: 'Squadrato',   desc: '0px',  radius: 0 },
]
export function getBorderRadius(key) { return BORDER_STYLES.find(s => s.key === key)?.radius ?? 8 }
