import { useState, useEffect } from 'react'
import { Plus, Trash2, MessageCircle, ChevronRight, GripVertical } from 'lucide-react'

function genId()    { return 'n_' + Math.random().toString(36).slice(2, 8) }
function genOptId() { return 'o_' + Math.random().toString(36).slice(2, 8) }

const DEFAULT_CHATBOT = () => ({
  active: false,
  bot_name: 'Assistente',
  nodes: [
    {
      id: 'start',
      name: 'Benvenuto',
      message: 'Ciao! Come posso aiutarti?',
      options: [],
    },
  ],
})

const OPT_TYPES = [
  { value: 'go_to',    label: 'Vai a un passo' },
  { value: 'restart',  label: 'Ricomincia dall\'inizio' },
  { value: 'call',     label: '📞 Chiama' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'link',     label: '🔗 Apri link' },
]

// ─── Stili condivisi ──────────────────────────────────────────────────────────
const card   = { background: '#fff', borderRadius: 10, padding: '16px 18px', marginBottom: 12, border: '1px solid #e8e8e8' }
const inp    = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', outline: 'none' }
const label  = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }
const btn    = (bg = '#1a1a2e', color = '#fff') => ({ padding: '8px 16px', borderRadius: 8, border: 'none', background: bg, color, fontSize: 13, fontWeight: 600, cursor: 'pointer' })

export default function ChatbotEditor({ chatbot: initialChatbot, onSave, saving, saved, saveError }) {
  const [chatbot, setChatbot]           = useState(null)
  const [selectedId, setSelectedId]     = useState('start')
  const [saveMsg, setSaveMsg]           = useState('')

  useEffect(() => {
    if (initialChatbot) {
      setChatbot({ ...DEFAULT_CHATBOT(), ...initialChatbot })
    } else {
      setChatbot(DEFAULT_CHATBOT())
    }
  }, [])

  useEffect(() => {
    if (saved) setSaveMsg('Salvato!')
    else if (saveError) setSaveMsg('Errore: ' + saveError)
    else setSaveMsg('')
  }, [saved, saveError])

  if (!chatbot) return null

  const nodes       = chatbot.nodes || []
  const selectedNode = nodes.find(n => n.id === selectedId) || nodes[0]
  const otherNodes   = nodes.filter(n => n.id !== selectedId)

  // ─── Updaters ───────────────────────────────────────────────────────────────
  function patch(fields) { setChatbot(prev => ({ ...prev, ...fields })) }

  function patchNode(id, fields) {
    setChatbot(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === id ? { ...n, ...fields } : n),
    }))
  }

  function addNode() {
    const id = genId()
    setChatbot(prev => ({
      ...prev,
      nodes: [...prev.nodes, { id, name: `Passo ${prev.nodes.length}`, message: '', options: [] }],
    }))
    setSelectedId(id)
  }

  function removeNode(id) {
    if (id === 'start') return
    setChatbot(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
    }))
    setSelectedId('start')
  }

  function addOption() {
    if (!selectedNode) return
    patchNode(selectedNode.id, {
      options: [...(selectedNode.options || []), { id: genOptId(), label: '', type: 'go_to', next: '', value: '' }],
    })
  }

  function patchOption(optId, fields) {
    patchNode(selectedNode.id, {
      options: selectedNode.options.map(o => o.id === optId ? { ...o, ...fields } : o),
    })
  }

  function removeOption(optId) {
    patchNode(selectedNode.id, {
      options: selectedNode.options.filter(o => o.id !== optId),
    })
  }

  async function handleSave() {
    await onSave(chatbot)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Chatbot</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saveMsg && <span style={{ fontSize: 13, color: saved ? '#22c55e' : '#e53e3e' }}>{saveMsg}</span>}
          <button onClick={handleSave} disabled={saving} style={btn()}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>

      {/* Impostazioni generali */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Canali */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Attivo su</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={chatbot.active_app ?? chatbot.active ?? false}
                onChange={e => {
                  const val = e.target.checked
                  patch({ active_app: val, active: val || (chatbot.active_sito ?? chatbot.active ?? false) })
                }}
                style={{ width: 16, height: 16, accentColor: '#1a1a2e', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>App Clienti (QR)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={chatbot.active_sito ?? chatbot.active ?? false}
                onChange={e => {
                  const val = e.target.checked
                  patch({ active_sito: val, active: (chatbot.active_app ?? chatbot.active ?? false) || val })
                }}
                style={{ width: 16, height: 16, accentColor: '#1a1a2e', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Sito web pubblico</span>
            </label>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <span style={label}>Nome del bot</span>
            <input
              style={{ ...inp, maxWidth: 280 }}
              value={chatbot.bot_name || ''}
              onChange={e => patch({ bot_name: e.target.value })}
              placeholder="Assistente"
            />
          </div>
        </div>

        {/* Modalità AI */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={chatbot.ai_mode || false}
              onChange={e => patch({ ai_mode: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: '#7c3aed', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              Modalità AI <span style={{ fontSize: 11, fontWeight: 400, color: '#7c3aed', marginLeft: 4, background: '#ede9fe', padding: '2px 7px', borderRadius: 20 }}>Beta</span>
            </span>
          </label>
          {chatbot.ai_mode && (
            <div style={{ flex: 1, minWidth: 260 }}>
              <span style={label}>Messaggio di benvenuto AI</span>
              <input
                style={{ ...inp, maxWidth: 420 }}
                value={chatbot.ai_welcome || ''}
                onChange={e => patch({ ai_welcome: e.target.value })}
                placeholder="Ciao! Come posso aiutarti?"
              />
            </div>
          )}
        </div>
        {chatbot.ai_mode && (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#7c3aed', background: '#ede9fe', borderRadius: 8, padding: '8px 12px' }}>
            In modalità AI il chatbot risponde a domande libere usando le informazioni del tuo profilo (nome, orari, servizi, FAQ). Non occorre configurare i passi.
          </p>
        )}
        {!chatbot.active && (
          <p style={{ margin: '12px 0 0', fontSize: 13, color: '#888' }}>
            Il chatbot è disattivato. Seleziona almeno un canale per mostrarlo.
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>

        {/* ── Lista passi (sinistra) ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Passi</div>

          {nodes.map(node => (
            <div
              key={node.id}
              onClick={() => setSelectedId(node.id)}
              style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                background: selectedId === node.id ? '#1a1a2e' : '#fff',
                color: selectedId === node.id ? '#fff' : '#1a1a2e',
                border: `1px solid ${selectedId === node.id ? '#1a1a2e' : '#e8e8e8'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.id === 'start' && '▶ '}{node.name || 'Senza nome'}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {(node.options || []).length} {(node.options || []).length === 1 ? 'opzione' : 'opzioni'}
                </div>
              </div>
              {node.id !== 'start' && (
                <button
                  onClick={e => { e.stopPropagation(); removeNode(node.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.5, flexShrink: 0 }}
                  title="Elimina passo"
                >
                  <Trash2 size={13} strokeWidth={1.5} color={selectedId === node.id ? '#fff' : '#e53e3e'} />
                </button>
              )}
            </div>
          ))}

          <button onClick={addNode} style={{ ...btn('#f0f0f0', '#1a1a2e'), width: '100%', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={14} strokeWidth={2} /> Aggiungi passo
          </button>
        </div>

        {/* ── Editor passo selezionato (destra) ── */}
        {selectedNode && (
          <div>
            <div style={card}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <span style={label}>Nome del passo (solo admin)</span>
                  <input
                    style={inp}
                    value={selectedNode.name || ''}
                    onChange={e => patchNode(selectedNode.id, { name: e.target.value })}
                    placeholder="Es. Orari, Info prezzi…"
                    disabled={selectedNode.id === 'start'}
                  />
                </div>
              </div>
              <div>
                <span style={label}>Messaggio del bot</span>
                <textarea
                  style={{ ...inp, minHeight: 90, resize: 'vertical' }}
                  value={selectedNode.message || ''}
                  onChange={e => patchNode(selectedNode.id, { message: e.target.value })}
                  placeholder="Scrivi cosa dirà il bot in questo passo…"
                />
              </div>
            </div>

            {/* Opzioni / bottoni */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Opzioni (pulsanti per l'utente)
            </div>

            {(selectedNode.options || []).map((opt, i) => (
              <div key={opt.id} style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 160px 1fr auto', gap: 10, alignItems: 'end', padding: '12px 14px' }}>
                <div>
                  {i === 0 && <span style={label}>Testo pulsante</span>}
                  <input
                    style={inp}
                    value={opt.label}
                    onChange={e => patchOption(opt.id, { label: e.target.value })}
                    placeholder="Es. Orari di apertura"
                  />
                </div>
                <div>
                  {i === 0 && <span style={label}>Tipo</span>}
                  <select
                    style={{ ...inp, background: '#fff', cursor: 'pointer' }}
                    value={opt.type}
                    onChange={e => patchOption(opt.id, { type: e.target.value, next: '', value: '' })}
                  >
                    {OPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  {i === 0 && <span style={label}>
                    {opt.type === 'go_to' ? 'Vai a' : opt.type === 'restart' ? '' : opt.type === 'call' ? 'Numero' : opt.type === 'whatsapp' ? 'Numero' : 'URL'}
                  </span>}
                  {opt.type === 'go_to' && (
                    <select
                      style={{ ...inp, background: '#fff', cursor: 'pointer' }}
                      value={opt.next || ''}
                      onChange={e => patchOption(opt.id, { next: e.target.value })}
                    >
                      <option value="">— scegli un passo —</option>
                      {nodes.filter(n => n.id !== selectedNode.id).map(n => (
                        <option key={n.id} value={n.id}>{n.name || n.id}</option>
                      ))}
                    </select>
                  )}
                  {opt.type === 'restart' && (
                    <div style={{ padding: '9px 0', fontSize: 13, color: '#888' }}>Torna sempre all'inizio</div>
                  )}
                  {(opt.type === 'call' || opt.type === 'whatsapp') && (
                    <input
                      style={inp}
                      value={opt.value || ''}
                      onChange={e => patchOption(opt.id, { value: e.target.value })}
                      placeholder="+39 333 1234567"
                      type="tel"
                    />
                  )}
                  {opt.type === 'link' && (
                    <input
                      style={inp}
                      value={opt.value || ''}
                      onChange={e => patchOption(opt.id, { value: e.target.value })}
                      placeholder="https://…"
                      type="url"
                    />
                  )}
                </div>
                <button
                  onClick={() => removeOption(opt.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', marginTop: i === 0 ? 20 : 0 }}
                  title="Rimuovi opzione"
                >
                  <Trash2 size={15} strokeWidth={1.5} color="#e53e3e" />
                </button>
              </div>
            ))}

            <button onClick={addOption} style={{ ...btn('#f0f0f0', '#1a1a2e'), display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} strokeWidth={2} /> Aggiungi opzione
            </button>

            {/* Anteprima */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Anteprima</div>
              <div style={{ background: '#f0f0f0', borderRadius: 14, padding: 16, maxWidth: 320 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
                  <div style={{ background: '#fff', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', fontSize: 14, color: '#1a1a2e', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: '90%' }}>
                    {selectedNode.message || <span style={{ color: '#bbb', fontStyle: 'italic' }}>Nessun messaggio</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(selectedNode.options || []).map(opt => (
                    <div key={opt.id} style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid #1a1a2e', fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: 'transparent' }}>
                      {opt.label || <span style={{ color: '#ccc', fontStyle: 'italic' }}>Testo pulsante</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
