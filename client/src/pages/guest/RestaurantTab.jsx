export default function RestaurantTab({ restaurant, primary, textColor, subText, isDark, radius, headingFamily }) {
  const cardBg     = isDark ? '#2a2a3e' : '#fff'
  const cardShadow = isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.06)'
  const categories = restaurant?.categories || []

  if (!categories.length) {
    return <p style={{ color: subText, textAlign: 'center', marginTop: 40 }}>Menù non disponibile.</p>
  }

  return (
    <div>
      {categories.map((cat, ci) => (
        <div key={cat.id || ci} style={{ marginBottom: 32 }}>
          <h3 style={{
            fontSize: 18, fontWeight: 700, fontFamily: headingFamily, color: textColor,
            marginTop: 0, marginBottom: 14, paddingBottom: 8,
            borderBottom: `2px solid ${primary}22`,
          }}>
            {cat.name}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(cat.items || []).map((item, ii) => (
              <div key={item.id || ii} style={{
                background: cardBg, borderRadius: radius,
                boxShadow: cardShadow, overflow: 'hidden',
                border: isDark ? '1px solid #3a3a5e' : 'none',
              }}>
                {item.photo && (
                  <img src={item.photo} alt={item.name}
                    style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: textColor, marginBottom: item.description ? 5 : 0 }}>
                      {item.name}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: 13, color: subText, lineHeight: 1.55 }}>{item.description}</div>
                    )}
                  </div>
                  {item.price && (
                    <div style={{
                      fontSize: 16, fontWeight: 700, color: primary,
                      flexShrink: 0, marginLeft: 8,
                    }}>
                      €{item.price}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
