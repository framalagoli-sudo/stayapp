import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

const TIPO_LABEL = { struttura: 'Struttura', ristorante: 'Ristorante' }
const TIPO_COLOR = { struttura: '#1a1a2e', ristorante: '#e63946' }

export default function CollegamentiSection({ entitaId, entitaTipo, aziendaId }) {
  const [linked, setLinked]       = useState([])   // entità già collegate
  const [available, setAvailable] = useState([])   // entità disponibili da collegare
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(null) // id entità in salvataggio

  useEffect(() => { if (entitaId && aziendaId) load() }, [entitaId, aziendaId])

  async function load() {
    setLoading(true)
    try {
      const [currentLinks, strutture, ristoranti] = await Promise.all([
        apiFetch(`/api/collegamenti?tipo=${entitaTipo}&entity_id=${entitaId}`),
        apiFetch(`/api/properties?azienda_id=${aziendaId}`),
        apiFetch(`/api/ristoranti?azienda_id=${aziendaId}`),
      ])

      setLinked(currentLinks)

      const linkedIds = new Set(currentLinks.map(l => l.id))
      const all = [
        ...strutture.map(s => ({ tipo: 'struttura', ...s })),
        ...ristoranti.map(r => ({ tipo: 'ristorante', ...r })),
      ]
      // Escludi l'entità corrente e quelle già collegate
      setAvailable(all.filter(e => !(e.tipo === entitaTipo && e.id === entitaId) && !linkedIds.has(e.id)))
    } catch (e) {
      console.error('CollegamentiSection load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleLink(entity) {
    setSaving(entity.id)
    try {
      await apiFetch('/api/collegamenti', {
        method: 'POST',
        body: JSON.stringify({
          from_tipo: entitaTipo,
          from_id: entitaId,
          to_tipo: entity.tipo,
          to_id: entity.id,
          azienda_id: aziendaId,
        }),
      })
      setLinked(prev => [...prev, entity])
      setAvailable(prev => prev.filter(e => !(e.tipo === entity.tipo && e.id === entity.id)))
    } catch (e) { alert(e.message) }
    finally { setSaving(null) }
  }

  async function handleUnlink(collegamentoId, entity) {
    setSaving(entity.id)
    try {
      await apiFetch(`/api/collegamenti/${collegamentoId}`, { method: 'DELETE' })
      setLinked(prev => prev.filter(l => l.id !== collegamentoId))
      setAvailable(prev => [...prev, entity])
    } catch (e) { alert(e.message) }
    finally { setSaving(null) }
  }

  const pill = (color, bg) => ({
    padding: '5px 12px', border: 'none', borderRadius: 20, fontSize: 12,
    fontWeight: 600, cursor: 'pointer', color, background: bg,
  })

  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #eee' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Connessioni</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>
        Collega questa entità ad altre dell'azienda. I clienti potranno navigare tra loro dalla PWA.
      </p>

      {loading && <p style={{ fontSize: 13, color: '#aaa' }}>Caricamento…</p>}

      {!loading && (
        <>
          {/* Entità collegate */}
          {linked.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                Collegate ({linked.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {linked.map(entity => (
                  <div key={entity.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    background: '#f9f9ff', borderRadius: 10, padding: '10px 14px',
                    border: `1px solid ${TIPO_COLOR[entity.tipo]}22`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                        background: `${TIPO_COLOR[entity.tipo]}18`, color: TIPO_COLOR[entity.tipo],
                        textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
                      }}>
                        {TIPO_LABEL[entity.tipo]}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{entity.name}</span>
                      <code style={{ fontSize: 11, color: '#aaa', background: '#f0f0f0', padding: '1px 5px', borderRadius: 4 }}>
                        {entity.slug}
                      </code>
                    </div>
                    <button
                      onClick={() => handleUnlink(entity.id, entity)}
                      disabled={saving === entity.id}
                      style={pill('#c00', '#fff0f0')}
                    >
                      {saving === entity.id ? '…' : 'Rimuovi'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entità disponibili */}
          {available.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                Disponibili da collegare
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {available.map(entity => (
                  <div key={`${entity.tipo}-${entity.id}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    background: '#fafafa', borderRadius: 10, padding: '10px 14px', border: '1px solid #eee',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                        background: '#f0f0f0', color: '#888',
                        textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
                      }}>
                        {TIPO_LABEL[entity.tipo]}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{entity.name}</span>
                      <code style={{ fontSize: 11, color: '#aaa', background: '#f0f0f0', padding: '1px 5px', borderRadius: 4 }}>
                        {entity.slug}
                      </code>
                    </div>
                    <button
                      onClick={() => handleLink(entity)}
                      disabled={saving === entity.id}
                      style={pill('#fff', TIPO_COLOR[entity.tipo])}
                    >
                      {saving === entity.id ? '…' : '+ Collega'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {linked.length === 0 && available.length === 0 && (
            <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>
              Nessun'altra entità disponibile nell'azienda.
            </p>
          )}
        </>
      )}
    </div>
  )
}
