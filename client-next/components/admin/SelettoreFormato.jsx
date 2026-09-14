'use client'

// «Che forma ha questa foto quando la guarda un visitatore?»
//
// Era scritto dentro l'editor degli eventi e basta. È la stessa domanda per la
// locandina di un evento e per le schede del team: un posto solo, così quando
// si aggiunge un formato lo trovano tutti.
//
// ⚠️ Il quadratino accanto all'etichetta NON è un'icona: è il rapporto vero,
// disegnato con `aspectRatio`. Chi sceglie vede la forma che otterrà, invece di
// doverla immaginare da una parola.
export function SelettoreFormato({ valore, onChange, formati, titolo = 'Formato', aiuto, colore = '#00b5b5' }) {
  return (
    <div>
      {titolo && <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 2 }}>{titolo}</div>}
      {aiuto && <div style={{ fontSize: 12.5, color: '#888', marginBottom: 10, lineHeight: 1.5 }}>{aiuto}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {formati.map(f => {
          const scelto = valore === f.chiave
          const tondo = f.chiave === 'cerchio'
          return (
            <button key={f.chiave} type="button" onClick={() => onChange(f.chiave)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, background: scelto ? `${colore}14` : '#fff',
                border: `1.5px solid ${scelto ? colore : '#e2e2e2'}`, borderRadius: 10,
                padding: '9px 13px 9px 10px', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ display: 'block', width: '100%', aspectRatio: f.rapporto, maxHeight: 26,
                  background: scelto ? colore : '#ccc', borderRadius: tondo ? '50%' : 3 }} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{f.etichetta}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: '#999' }}>{f.misura}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
