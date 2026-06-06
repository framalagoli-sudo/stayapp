'use client'
import { useEffect, useState } from 'react'
import { useNavigate } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import { Mail, Plus, Send, Copy, Trash2, Edit3, Archive, Clock, UserMinus } from 'lucide-react'

const STATUS_LABEL = { draft: 'Bozza', sent: 'Inviata' }
const STATUS_COLOR = { draft: '#888', sent: '#38a169' }
const TEMPLATE_LABEL = { semplice: 'Semplice', promozione: 'Promozione', notizie: 'Notizie', evento: 'Evento' }

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function NewsletterPage() {
  const { profile } = useAuth()
  const { strutture, ristoranti, attivita } = useAzienda()
  const navigate = useNavigate()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => { fetchList() }, [profile])

  async function fetchList() {
    setLoading(true)
    try { setList(await apiFetch('/api/newsletter')) }
    catch { setList([]) }
    finally { setLoading(false) }
  }

  async function handleNew() {
    setCreating(true)
    try {
      // Prende la prima entità disponibile come mittente di default
      const firstEntity = strutture?.[0] || ristoranti?.[0] || attivita?.[0]
      const entity_tipo = strutture?.[0] ? 'struttura' : ristoranti?.[0] ? 'ristorante' : 'attivita'
      const nl = await apiFetch('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo, entity_id: firstEntity?.id || null }),
      })
      navigate(`/admin/newsletter/${nl.id}`)
    } catch (e) {
      alert(e.message)
    } finally { setCreating(false) }
  }

  async function handleDuplicate(nl) {
    try {
      const copy = await apiFetch(`/api/newsletter/${nl.id}/duplicate`, { method: 'POST' })
      navigate(`/admin/newsletter/${copy.id}`)
    } catch (e) { alert(e.message) }
  }

  async function handleDelete(nl) {
    if (!confirm(`Eliminare la bozza "${nl.subject || '(senza oggetto)'}"?`)) return
    try {
      await apiFetch(`/api/newsletter/${nl.id}`, { method: 'DELETE' })
      setList(prev => prev.filter(n => n.id !== nl.id))
    } catch (e) { alert(e.message) }
  }

  const drafts = list.filter(n => n.status === 'draft')
  const sent   = list.filter(n => n.status === 'sent')

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h2 style={{ margin: 0 }}>Newsletter</h2>
        <button onClick={handleNew} disabled={creating} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', background: '#1a1a2e', color: '#fff',
          border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14,
        }}>
          <Plus size={16} strokeWidth={2} />
          {creating ? 'Creazione…' : 'Nuova newsletter'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Caricamento…</p>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: '#aaa' }}>
          <Mail size={40} strokeWidth={1.5} color="#ddd" style={{ display: 'block', margin: '0 auto 14px' }} />
          <p style={{ margin: 0, fontSize: 15 }}>Nessuna newsletter ancora.</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#ccc' }}>Crea la prima con il pulsante in alto.</p>
        </div>
      ) : (
        <>
          {drafts.length > 0 && (
            <>
              <SectionTitle icon={<Edit3 size={14} />} label="Bozze" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {drafts.map(nl => (
                  <NewsletterCard key={nl.id} nl={nl}
                    onEdit={() => navigate(`/admin/newsletter/${nl.id}`)}
                    onDuplicate={() => handleDuplicate(nl)}
                    onDelete={() => handleDelete(nl)}
                  />
                ))}
              </div>
            </>
          )}
          {sent.length > 0 && (
            <>
              <SectionTitle icon={<Archive size={14} />} label="Archivio inviate" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sent.map(nl => (
                  <NewsletterCard key={nl.id} nl={nl}
                    onEdit={() => navigate(`/admin/newsletter/${nl.id}`)}
                    onDuplicate={() => handleDuplicate(nl)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function SectionTitle({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: '#888', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {icon}{label}
    </div>
  )
}

function NewsletterCard({ nl, onEdit, onDuplicate, onDelete }) {
  const isDraft = nl.status === 'draft'
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: nl.subject ? '#1a1a2e' : '#bbb' }}>
          {nl.subject || '(senza oggetto)'}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10,
            background: `${STATUS_COLOR[nl.status]}18`, color: STATUS_COLOR[nl.status],
          }}>
            {STATUS_LABEL[nl.status]}
          </span>
          <span style={{ fontSize: 12, color: '#aaa' }}>
            {TEMPLATE_LABEL[nl.template_id] || nl.template_id}
          </span>
          {nl.status === 'sent' && (
            <span style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Send size={11} strokeWidth={2} />
              {nl.recipients_count} destinatari · {fmtDate(nl.sent_at)}
              {nl.unsubscribes_count > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6, color: '#e53e3e' }}>
                  <UserMinus size={11} strokeWidth={2} /> {nl.unsubscribes_count}
                </span>
              )}
            </span>
          )}
          {isDraft && nl.scheduled_at && (
            <span style={{ fontSize: 12, color: '#38a169', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} strokeWidth={2} />
              {new Date(nl.scheduled_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {isDraft && !nl.scheduled_at && (
            <span style={{ fontSize: 12, color: '#aaa' }}>
              Modificata {fmtDate(nl.updated_at || nl.created_at)}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <IconBtn onClick={onEdit} title={isDraft ? 'Modifica' : 'Visualizza'}>
          <Edit3 size={15} strokeWidth={2} />
        </IconBtn>
        <IconBtn onClick={onDuplicate} title="Duplica">
          <Copy size={15} strokeWidth={2} />
        </IconBtn>
        {isDraft && onDelete && (
          <IconBtn onClick={onDelete} title="Elimina" danger>
            <Trash2 size={15} strokeWidth={2} />
          </IconBtn>
        )}
      </div>
    </div>
  )
}

function IconBtn({ onClick, title, children, danger }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: danger ? '#fff0f0' : '#f5f5f5', border: 'none', borderRadius: 8,
      cursor: 'pointer', color: danger ? '#e53e3e' : '#555',
    }}>
      {children}
    </button>
  )
}
