import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAzienda } from '../../context/AziendaContext'
import { apiFetch } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { Send, MessageSquare, User } from 'lucide-react'

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.start(); osc.stop(ctx.currentTime + 0.25)
  } catch {}
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatTimeShort(ts) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  return isToday
    ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

// Risolve property_id in base al ruolo
function usePropertyId() {
  const { profile } = useAuth()
  const { strutture, selectedStrutturaId } = useAzienda()

  if (profile?.role === 'admin_struttura' || profile?.role === 'staff') {
    return profile.property_id
  }
  if (selectedStrutturaId) return selectedStrutturaId
  return strutture?.[0]?.id || null
}

export default function ChatPage() {
  const { profile } = useAuth()
  const { strutture } = useAzienda()
  const propertyId = usePropertyId()
  const propertyName = strutture?.find(s => s.id === propertyId)?.name || 'Struttura'

  const [conversations, setConversations] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  // Carica lista conversazioni
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    loadConversations()
  }, [propertyId])

  // Carica messaggi della sessione attiva
  useEffect(() => {
    if (!activeSession) return
    loadMessages(activeSession)
    markRead(activeSession)
  }, [activeSession])

  // Scroll bottom su nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime — nuovi messaggi
  useEffect(() => {
    if (!propertyId) return

    const channel = supabase
      .channel(`chat-admin-${propertyId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `property_id=eq.${propertyId}`,
      }, (payload) => {
        const msg = payload.new
        const isNewGuestMsg = msg.sender === 'guest' && msg.session_id !== activeSession
        if (isNewGuestMsg) {
          playBeep()
          document.title = '💬 Nuovo messaggio — StayApp'
          setTimeout(() => { document.title = 'StayApp' }, 5000)
        }
        // Aggiorna lista conversazioni
        setConversations(prev => {
          const exists = prev.find(c => c.last.session_id === msg.session_id)
          if (exists) {
            return prev.map(c => c.last.session_id === msg.session_id
              ? { last: msg, unread: isNewGuestMsg ? c.unread + 1 : 0 }
              : c
            ).sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at))
          }
          return [{ last: msg, unread: msg.sender === 'guest' ? 1 : 0 }, ...prev]
        })
        // Se è la sessione attiva, aggiungi il messaggio
        if (msg.session_id === activeSession) {
          setMessages(prev => [...prev, msg])
          if (msg.sender === 'guest') markRead(activeSession)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [propertyId, activeSession])

  async function loadConversations() {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/messages?property_id=${propertyId}`)
      setConversations(data)
    } catch { setConversations([]) }
    finally { setLoading(false) }
  }

  async function loadMessages(sessionId) {
    try {
      const data = await apiFetch(`/api/messages?property_id=${propertyId}&session_id=${sessionId}`)
      setMessages(data)
    } catch { setMessages([]) }
  }

  async function markRead(sessionId) {
    try {
      await apiFetch('/api/messages/read', {
        method: 'PATCH',
        body: JSON.stringify({ property_id: propertyId, session_id: sessionId }),
      })
      setConversations(prev => prev.map(c =>
        c.last.session_id === sessionId ? { ...c, unread: 0 } : c
      ))
    } catch {}
  }

  async function sendReply(e) {
    e.preventDefault()
    if (!reply.trim() || !activeSession) return
    setSending(true)
    try {
      await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          property_id: propertyId,
          session_id: activeSession,
          sender: 'staff',
          body: reply.trim(),
        }),
      })
      setReply('')
    } catch (err) { alert(err.message) }
    finally { setSending(false) }
  }

  const activeConv = conversations.find(c => c.last.session_id === activeSession)
  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0)

  if (!propertyId) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
        <MessageSquare size={40} strokeWidth={1.5} color="#ddd" style={{ display: 'block', margin: '0 auto 12px' }} />
        <p>Seleziona una struttura per vedere le chat.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', gap: 0, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>

      {/* ── Sidebar conversazioni ── */}
      <div style={{ width: 280, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Chat ospiti</h2>
            {totalUnread > 0 && (
              <span style={{ background: '#e53e3e', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                {totalUnread}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {propertyName}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <p style={{ padding: 16, color: '#aaa', fontSize: 13 }}>Caricamento…</p>}
          {!loading && conversations.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#bbb' }}>
              <MessageSquare size={32} strokeWidth={1.5} color="#e0e0e0" style={{ display: 'block', margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 13 }}>Nessuna conversazione</p>
            </div>
          )}
          {conversations.map(({ last: conv, unread }) => (
            <div
              key={conv.session_id}
              onClick={() => setActiveSession(conv.session_id)}
              style={{
                padding: '14px 16px', cursor: 'pointer',
                borderBottom: '1px solid #f8f8f8',
                background: activeSession === conv.session_id ? '#f0f4ff' : 'transparent',
                borderLeft: activeSession === conv.session_id ? '3px solid #1a1a2e' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a2e18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={15} strokeWidth={1.5} color="#1a1a2e" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.guest_name || 'Ospite anonimo'}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                      {conv.body}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: '#bbb' }}>{formatTimeShort(conv.created_at)}</span>
                  {unread > 0 && (
                    <span style={{ background: '#e53e3e', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>
                      {unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Area messaggi ── */}
      {!activeSession ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', flexDirection: 'column', gap: 12 }}>
          <MessageSquare size={48} strokeWidth={1} color="#e0e0e0" />
          <p style={{ margin: 0, fontSize: 14 }}>Seleziona una conversazione</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header conversazione */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a1a2e18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} strokeWidth={1.5} color="#1a1a2e" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{activeConv?.last?.guest_name || 'Ospite anonimo'}</div>
              <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{activeSession.slice(0, 8)}…</div>
            </div>
          </div>

          {/* Messaggi */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'staff' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '72%',
                  background: msg.sender === 'staff' ? '#1a1a2e' : '#f5f5f5',
                  color: msg.sender === 'staff' ? '#fff' : '#1a1a2e',
                  borderRadius: msg.sender === 'staff' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>{msg.body}</div>
                  <div style={{ fontSize: 10, opacity: 0.55, marginTop: 4, textAlign: msg.sender === 'staff' ? 'right' : 'left' }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input risposta */}
          <form onSubmit={sendReply} style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Scrivi una risposta…"
              style={{ flex: 1, padding: '10px 14px', borderRadius: 24, border: '1px solid #e0e0e0', fontSize: 14, outline: 'none' }}
            />
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              style={{ width: 44, height: 44, borderRadius: '50%', background: reply.trim() ? '#1a1a2e' : '#e0e0e0', border: 'none', cursor: reply.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}
            >
              <Send size={16} strokeWidth={2} color="#fff" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
