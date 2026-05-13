import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X } from 'lucide-react'

// fixed=false → posizionato dentro il container PWA (position:absolute)
// fixed=true  → floating su landing page (position:fixed)
export default function ChatbotWidget({ chatbot, primaryColor, fixed = false }) {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([])
  const [typing, setTyping]   = useState(false)
  const endRef = useRef(null)
  const primary = primaryColor || '#00b5b5'

  const nodes = chatbot?.nodes || []
  const getNode = (id) => nodes.find(n => n.id === id)

  useEffect(() => {
    if (!open || messages.length > 0) return
    const start = getNode('start')
    if (start) {
      setMessages([{ type: 'bot', text: start.message, nodeId: 'start', showOptions: true }])
    }
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  if (!chatbot?.active || !nodes.length) return null

  const lastBotMsg = [...messages].reverse().find(m => m.type === 'bot' && m.showOptions)
  const currentOptions = lastBotMsg ? (getNode(lastBotMsg.nodeId)?.options || []) : []

  function handleOption(opt) {
    // Blocca opzioni del messaggio corrente
    setMessages(prev => prev.map(m =>
      m.nodeId === lastBotMsg?.nodeId ? { ...m, showOptions: false } : m
    ))
    // Aggiunge risposta utente
    setMessages(prev => [...prev, { type: 'user', text: opt.label }])

    if (opt.type === 'go_to' || opt.type === 'restart') {
      const nextId = opt.type === 'restart' ? 'start' : opt.next
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        const next = getNode(nextId)
        if (next) setMessages(prev => [...prev, { type: 'bot', text: next.message, nodeId: nextId, showOptions: true }])
      }, 750)
    } else if (opt.type === 'call') {
      window.location.href = `tel:${opt.value}`
    } else if (opt.type === 'whatsapp') {
      const clean = (opt.value || '').replace(/[\s\-\(\)\+]/g, '').replace(/^00/, '').replace(/^0/, '39')
      window.open(`https://wa.me/${clean}`, '_blank')
    } else if (opt.type === 'link') {
      window.open(opt.value, '_blank', 'noopener')
    }
  }

  function handleClose() {
    setOpen(false)
  }

  function handleOpen() {
    setOpen(true)
  }

  return (
    <>
      <style>{`
        @keyframes cb-typing {
          0%, 80%, 100% { opacity: .3; transform: scale(1); }
          40%            { opacity: 1;  transform: scale(1.25); }
        }
        @keyframes cb-slidein {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cb-btn-opt {
          padding: 8px 16px; border-radius: 20px;
          border: 1.5px solid ${primary}; background: transparent;
          color: ${primary}; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: background .15s, color .15s;
          white-space: nowrap;
        }
        .cb-btn-opt:hover { background: ${primary}; color: #fff; }
      `}</style>

      {/* Pulsante flotante */}
      {!open && (
        <div style={{
          position: fixed ? 'fixed' : 'absolute',
          bottom: fixed ? 24 : 70, right: fixed ? 24 : 12,
          zIndex: 9999, animation: 'cb-slidein .3s ease',
        }}>
          <button
            onClick={handleOpen}
            aria-label="Apri chatbot"
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: primary, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 18px ${primary}55`,
            }}
          >
            <MessageCircle size={24} strokeWidth={1.5} color="#fff" />
          </button>
        </div>
      )}

      {/* Pannello chat */}
      {open && (
        <div style={fixed ? {
          position: 'fixed', bottom: 90, right: 24, zIndex: 9999,
          width: 360, height: 520, borderRadius: 18,
          display: 'flex', flexDirection: 'column',
          background: '#f0f0f0', overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
          animation: 'cb-slidein .22s ease',
        } : {
          position: 'absolute', inset: 0, zIndex: 60,
          display: 'flex', flexDirection: 'column',
          background: '#f0f0f0', animation: 'cb-slidein .22s ease',
        }}>
          {/* Header */}
          <div style={{
            background: primary, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <MessageCircle size={18} strokeWidth={1.5} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {chatbot.bot_name || 'Assistente'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Online ora</div>
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 6 }}>
              <X size={20} strokeWidth={1.5} color="#fff" />
            </button>
          </div>

          {/* Messaggi */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  background: msg.type === 'user' ? primary : '#fff',
                  color: msg.type === 'user' ? '#fff' : '#1a1a2e',
                  borderRadius: msg.type === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px', fontSize: 14, lineHeight: 1.5,
                  boxShadow: msg.type === 'bot' ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {typing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#fff', borderRadius: '18px 18px 18px 4px', padding: '13px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.09)' }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(j => (
                      <span key={j} style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#bbb', display: 'inline-block',
                        animation: `cb-typing 1.2s ${j * 0.2}s ease-in-out infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Opzioni */}
          {currentOptions.length > 0 && !typing && (
            <div style={{ padding: '8px 12px 14px', display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0, background: '#f0f0f0' }}>
              {currentOptions.map(opt => (
                <button key={opt.id} className="cb-btn-opt" onClick={() => handleOption(opt)}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
