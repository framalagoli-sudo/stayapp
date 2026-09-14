'use client'
// Selettore del "punto focale" di una foto di sfondo: l'utente clicca il punto
// importante; il valore ("x% y%") viene usato come object-position/background-position
// così il ritaglio (cover) mantiene quel punto visibile su desktop e mobile.
function parseFocal(v) {
  const m = String(v || '').match(/(\d+)%\s+(\d+)%/)
  return m ? [Number(m[1]), Number(m[2])] : [50, 50]
}

// ⚠️ `intera`: mostra la foto TUTTA invece di un ritaglio largo. Serve sui
// ritratti verticali — con il ritaglio si vede la fascia centrale, cioè il
// busto, e il viso resta fuori dall'area cliccabile: il punto che si vuole
// scegliere è materialmente impossibile da scegliere. Il riquadro si adatta
// all'immagine (niente bande vuote), così le percentuali restano quelle giuste.
export function FocalPointPicker({ src, value, onChange, hint = true, intera = false }) {
  const [x, y] = parseFocal(value)
  const handleClick = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = Math.min(100, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * 100)))
    const py = Math.min(100, Math.max(0, Math.round(((e.clientY - r.top) / r.height) * 100)))
    onChange(`${px}% ${py}%`)
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div onClick={handleClick} title="Clicca il punto importante della foto"
        style={{ position: 'relative', cursor: 'crosshair', borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e8ee', lineHeight: 0,
          ...(intera ? { display: 'inline-block', maxWidth: '100%' } : null) }}>
        <img src={src} alt="" style={intera
          ? { maxHeight: 240, maxWidth: '100%', width: 'auto', height: 'auto', display: 'block' }
          : { width: '100%', maxHeight: 170, objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', width: 24, height: 24, borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 0 0 2px rgba(0,0,0,0.45)', background: 'rgba(0,0,0,0.12)', pointerEvents: 'none' }} />
      </div>
      {hint && <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0' }}>📍 Clicca il <strong>punto importante</strong> della foto: resterà visibile sia su desktop che su mobile (il resto viene ritagliato).</p>}
    </div>
  )
}
