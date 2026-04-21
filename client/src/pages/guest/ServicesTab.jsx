import { iconLucide } from '../admin/ServicesSection'
import { Clock } from 'lucide-react'

export default function ServicesTab({ services = [], primary, textColor, subText, isDark, radius }) {
  const cardBg     = isDark ? '#2a2a3e' : '#fff'
  const cardShadow = isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.07)'

  if (!services.length) {
    return <p style={{ color: subText, textAlign: 'center', marginTop: 40 }}>Nessun servizio disponibile.</p>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {services.map((s, i) => (
        <div key={s.id || i} style={{
          background: cardBg, borderRadius: radius, padding: '20px 12px 16px',
          boxShadow: cardShadow, textAlign: 'center',
          border: isDark ? '1px solid #3a3a5e' : 'none',
        }}>
          {(() => { const Icon = iconLucide(s.icon); return <Icon size={34} strokeWidth={1.5} color={primary} style={{ marginBottom: 10 }} /> })()}
          <div style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: s.description || s.hours ? 6 : 0 }}>
            {s.name}
          </div>
          {s.description && (
            <div style={{ fontSize: 11, color: subText, lineHeight: 1.5, marginBottom: s.hours ? 6 : 0 }}>
              {s.description}
            </div>
          )}
          {s.hours && (
            <div style={{ fontSize: 11, color: primary, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <Clock size={11} strokeWidth={1.5} color={primary} />{s.hours}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
