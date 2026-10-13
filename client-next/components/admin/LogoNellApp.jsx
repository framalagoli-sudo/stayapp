'use client'

// Quale logo mostra l'app del QR in cima. Stava fra i dati dell'attività, in
// mezzo alle cose del sito: riguarda solo l'app, e sta con il suo aspetto.
const SCELTE = [['auto', 'Automatico'], ['light', 'Quello normale'], ['dark', 'Quello per i fondi scuri']]

export default function LogoNellApp({ minisito, onSave }) {
  const mini = minisito && typeof minisito === 'object' ? minisito : {}
  return (
    <div data-logo-app style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginTop: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 10 }}>Logo in cima all'app</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SCELTE.map(([v, nome]) => {
          const on = (mini.app_logo || 'auto') === v
          return (
            <button key={v} type="button" onClick={() => onSave({ ...mini, app_logo: v })}
              style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${on ? '#1a1a2e' : '#ddd'}`, background: on ? '#1a1a2e' : '#fff', color: on ? '#fff' : '#555', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer' }}>{nome}</button>
          )
        })}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888', lineHeight: 1.5 }}>L'intestazione dell'app è scura: «Automatico» usa il logo per i fondi scuri, se l'hai caricato. I due loghi si caricano in «Marchio e stile».</p>
    </div>
  )
}
