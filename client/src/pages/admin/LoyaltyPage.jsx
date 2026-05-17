import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { Gift, Star, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react'

const field = { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }
const label = { fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 5, display: 'block' }

// ─── Programma Punti ─────────────────────────────────────────────────────────
function ProgrammaTab() {
  const [prog, setProg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [classifica, setClassifica] = useState([])

  useEffect(() => {
    apiFetch('/api/loyalty/program').then(d => {
      setProg(d || { attivo: false, nome: 'Programma fedeltà', punti_per_euro: 10, valore_punto: 0.01, soglia_riscatto: 100 })
    })
    apiFetch('/api/loyalty/classifica').then(d => Array.isArray(d) && setClassifica(d))
  }, [])

  async function handleSave() {
    setSaving(true)
    await apiFetch('/api/loyalty/program', { method: 'PUT', body: JSON.stringify(prog) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const scontoEsempio = prog ? +((prog.punti_per_euro || 0) * (prog.valore_punto || 0)).toFixed(4) : 0

  if (!prog) return <div style={{ color: '#aaa', fontSize: 14 }}>Caricamento…</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
      {/* Config */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>Configurazione</div>
          <button onClick={() => setProg(p => ({ ...p, attivo: !p.attivo }))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: prog.attivo ? '#276749' : '#aaa' }}>
            {prog.attivo ? <ToggleRight size={24} strokeWidth={1.5} /> : <ToggleLeft size={24} strokeWidth={1.5} />}
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nome programma</label>
          <input value={prog.nome} onChange={e => setProg(p => ({ ...p, nome: e.target.value }))} style={field} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={label}>Punti per ogni €</label>
            <input type="number" min="1" value={prog.punti_per_euro}
              onChange={e => setProg(p => ({ ...p, punti_per_euro: parseFloat(e.target.value) || 0 }))} style={field} />
          </div>
          <div>
            <label style={label}>Valore per punto (€)</label>
            <input type="number" min="0.001" step="0.001" value={prog.valore_punto}
              onChange={e => setProg(p => ({ ...p, valore_punto: parseFloat(e.target.value) || 0 }))} style={field} />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Soglia minima riscatto (punti)</label>
          <input type="number" min="1" value={prog.soglia_riscatto}
            onChange={e => setProg(p => ({ ...p, soglia_riscatto: parseInt(e.target.value) || 0 }))} style={field} />
        </div>

        <div style={{ background: '#f0f9f4', border: '1px solid #c6f0d8', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#276749' }}>
          Con questa configurazione: ogni €1 speso = <strong>{prog.punti_per_euro} punti</strong> = <strong>€{scontoEsempio}</strong> di sconto futuro.
          Riscatto da <strong>{prog.soglia_riscatto} punti</strong> (= €{+(prog.soglia_riscatto * prog.valore_punto).toFixed(2)}).
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ padding: '9px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Salvo…' : saved ? '✓ Salvato' : 'Salva'}
        </button>
      </div>

      {/* Classifica */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 16 }}>Top clienti per punti</div>
        {classifica.length === 0 ? (
          <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '24px 0' }}>
            Nessun punto assegnato ancora.
          </div>
        ) : classifica.map((r, i) => (
          <div key={r.contatto.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < classifica.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? '#1a1a2e' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i < 3 ? '#fff' : '#888', flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.contatto.nome || r.contatto.email}</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>{r.contatto.email}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', flexShrink: 0 }}>
              {r.saldo} pt
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Gift Card ────────────────────────────────────────────────────────────────
function GiftCardTab() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ codice: '', valore: '', intestatario_nome: '', intestatario_email: '', scadenza: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    apiFetch('/api/loyalty/gift-cards').then(d => { setCards(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.valore) { setErr('Valore obbligatorio'); return }
    setSaving(true); setErr('')
    try {
      const data = await apiFetch('/api/loyalty/gift-cards', { method: 'POST', body: JSON.stringify({ ...form, valore: parseFloat(form.valore) }) })
      if (data?.error) { setErr(data.error); setSaving(false); return }
      setCards(c => [data, ...c])
      setForm({ codice: '', valore: '', intestatario_nome: '', intestatario_email: '', scadenza: '' })
      setShowForm(false)
    } catch { setErr('Errore') }
    setSaving(false)
  }

  async function handleToggle(card) {
    const updated = await apiFetch(`/api/loyalty/gift-cards/${card.id}`, { method: 'PATCH', body: JSON.stringify({ attiva: !card.attiva }) })
    if (updated?.id) setCards(c => c.map(x => x.id === card.id ? updated : x))
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questa gift card?')) return
    await apiFetch(`/api/loyalty/gift-cards/${id}`, { method: 'DELETE' })
    setCards(c => c.filter(x => x.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowForm(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={14} strokeWidth={2} /> Nuova gift card
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 14 }}>Nuova gift card</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={label}>Codice (lascia vuoto = auto)</label>
              <input value={form.codice} onChange={e => setForm(f => ({ ...f, codice: e.target.value.toUpperCase() }))} placeholder="es. ESTATE2026" style={field} />
            </div>
            <div>
              <label style={label}>Valore (€) *</label>
              <input type="number" min="1" step="0.01" value={form.valore} onChange={e => setForm(f => ({ ...f, valore: e.target.value }))} required style={field} />
            </div>
            <div>
              <label style={label}>Intestatario nome</label>
              <input value={form.intestatario_nome} onChange={e => setForm(f => ({ ...f, intestatario_nome: e.target.value }))} style={field} />
            </div>
            <div>
              <label style={label}>Intestatario email</label>
              <input type="email" value={form.intestatario_email} onChange={e => setForm(f => ({ ...f, intestatario_email: e.target.value }))} style={field} />
            </div>
            <div>
              <label style={label}>Scadenza (opzionale)</label>
              <input type="date" value={form.scadenza} onChange={e => setForm(f => ({ ...f, scadenza: e.target.value }))} style={field} />
            </div>
          </div>
          {err && <div style={{ color: '#c53030', fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, cursor: 'pointer' }}>
              {saving ? 'Creo…' : 'Crea'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 14px', background: 'none', border: '1px solid #ddd', borderRadius: 7, fontSize: 14, cursor: 'pointer', color: '#555' }}>
              Annulla
            </button>
          </div>
        </form>
      )}

      {loading ? <div style={{ color: '#aaa', fontSize: 14 }}>Caricamento…</div> : cards.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 12, border: '1px dashed #ddd' }}>
          <Gift size={32} strokeWidth={1} color="#ccc" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, color: '#888' }}>Nessuna gift card creata</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8f8f8', borderBottom: '1px solid #e8e8e8' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 12 }}>Codice</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 12 }}>Valore residuo</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 12 }}>Intestatario</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 12 }}>Scadenza</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 12 }}>Stato</th>
                <th style={{ padding: '10px 14px' }} />
              </tr>
            </thead>
            <tbody>
              {cards.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < cards.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{c.codice}</td>
                  <td style={{ padding: '10px 14px', color: c.valore_residuo > 0 ? '#1a1a2e' : '#aaa' }}>
                    €{parseFloat(c.valore_residuo).toFixed(2)}
                    {c.valore_iniziale !== c.valore_residuo && <span style={{ color: '#aaa', fontSize: 12, marginLeft: 6 }}>/ €{parseFloat(c.valore_iniziale).toFixed(2)}</span>}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#555' }}>{c.intestatario_nome || c.intestatario_email || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#888', fontSize: 13 }}>{c.scadenza ? new Date(c.scadenza).toLocaleDateString('it-IT') : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                      background: c.attiva ? '#f0f9f4' : '#f5f5f5', color: c.attiva ? '#276749' : '#aaa' }}>
                      {c.attiva ? 'Attiva' : 'Disattiva'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => handleToggle(c)} title={c.attiva ? 'Disattiva' : 'Attiva'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: c.attiva ? '#276749' : '#aaa' }}>
                        {c.attiva ? <ToggleRight size={18} strokeWidth={1.5} /> : <ToggleLeft size={18} strokeWidth={1.5} />}
                      </button>
                      <button onClick={() => handleDelete(c.id)} title="Elimina"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#e53e3e' }}>
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LoyaltyPage() {
  const [tab, setTab] = useState('programma')

  const tabs = [
    { key: 'programma', label: 'Programma punti', icon: Star },
    { key: 'giftcard',  label: 'Gift Card',        icon: Gift },
  ]

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Loyalty & Fidelizzazione</h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: '#888' }}>Premia i clienti abituali con punti e gift card.</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #e8e8e8', paddingBottom: 0 }}>
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', background: 'none', border: 'none',
              borderBottom: active ? '2px solid #1a1a2e' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer', fontSize: 14,
              fontWeight: active ? 700 : 400, color: active ? '#1a1a2e' : '#888',
            }}>
              <Icon size={15} strokeWidth={1.5} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'programma' && <ProgrammaTab />}
      {tab === 'giftcard'  && <GiftCardTab />}
    </div>
  )
}
