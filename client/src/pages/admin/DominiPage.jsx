import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { Globe, Plus, Trash2, CheckCircle, Clock, AlertCircle, Copy, ExternalLink, RefreshCw, Pencil, X, Check, ArrowRight } from 'lucide-react'
import { useProperty } from '../../hooks/useProperty'

const STAYAPP_DOMAIN = import.meta.env.VITE_STAYAPP_DOMAIN || 'oltrenova.com'

export default function DominiPage({ entityTipo }) {
  const { id: paramId } = useParams()
  const { property } = useProperty()

  const entityId = paramId || (entityTipo === 'struttura' ? property?.id : null)

  const [domini, setDomini] = useState([])
  const [loading, setLoading] = useState(true)
  const [newDominio, setNewDominio] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!entityId) return
    load()
  }, [entityId])

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/domini?entity_tipo=${entityTipo}&entity_id=${entityId}`)
      setDomini(data)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newDominio.trim()) return
    setAdding(true)
    setError('')
    try {
      const d = await apiFetch('/api/domini', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, dominio: newDominio.trim() }),
      })
      setDomini(prev => [...prev, d])
      setNewDominio('')
    } catch (e) { setError(e.message) }
    setAdding(false)
  }

  async function handleVerify(id) {
    try {
      const updated = await apiFetch(`/api/domini/${id}/verify`, { method: 'POST' })
      setDomini(prev => prev.map(d => d.id === id ? updated : d))
    } catch (e) { setError(e.message) }
  }

  async function handleDelete(id) {
    if (!confirm('Rimuovere questo dominio custom?')) return
    try {
      await apiFetch(`/api/domini/${id}`, { method: 'DELETE' })
      setDomini(prev => prev.filter(d => d.id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handleRename(id, slug) {
    const updated = await apiFetch(`/api/domini/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ slug }),
    })
    setDomini(prev => prev.map(d => d.id === id ? updated : d))
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(''), 2000)
  }

  const defaultSubdomain = domini.find(d => d.tipo === 'subdomain')
  const customDomains = domini.filter(d => d.tipo === 'custom')

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <Globe size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Domini</h1>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          <AlertCircle size={16} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
        </div>
      )}

      {/* Sottodominio predefinito */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>Sottodominio predefinito</span>
          <span style={{ fontSize: 11, background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Incluso · Zero configurazione</span>
        </div>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px' }}>
          Ogni entità riceve automaticamente un indirizzo su <strong>{STAYAPP_DOMAIN}</strong> — pronto subito, senza nessuna configurazione.
        </p>

        {loading ? (
          <p style={{ color: '#aaa', fontSize: 13 }}>Caricamento…</p>
        ) : defaultSubdomain ? (
          <SubdomainCard dom={defaultSubdomain} onCopy={copyUrl} copied={copied} onRename={handleRename} />
        ) : (
          <p style={{ color: '#aaa', fontSize: 13 }}>Caricamento sottodominio…</p>
        )}
      </div>

      {/* Domini custom */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>Dominio personalizzato</span>
          <span style={{ fontSize: 11, background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Opzionale</span>
        </div>

        {/* Obiettivo chiaro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8faff', border: '1px solid #dde6ff', borderRadius: 8, padding: '10px 14px', margin: '12px 0 20px' }}>
          <span style={{ fontSize: 13, color: '#555' }}>I tuoi visitatori vedranno</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e', background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '3px 10px' }}>www.iltuosito.it</span>
          <ArrowRight size={14} strokeWidth={1.5} color="#888" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#555' }}>la tua pagina</span>
          <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>invece del sottodominio {STAYAPP_DOMAIN}</span>
        </div>

        {customDomains.map(dom => (
          <CustomDomainCard
            key={dom.id}
            dom={dom}
            onCopy={copyUrl}
            copied={copied}
            onVerify={handleVerify}
            onDelete={handleDelete}
          />
        ))}

        {/* Form aggiunta dominio */}
        {customDomains.length === 0 && (
          <p style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>
            Hai già un dominio acquistato (es. <em>www.iltuohotel.it</em>)? Inseriscilo qui sotto — ti mostreremo esattamente cosa configurare.
          </p>
        )}

        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginTop: customDomains.length ? 16 : 0 }}>
          <input
            value={newDominio}
            onChange={e => setNewDominio(e.target.value)}
            placeholder="www.iltuodominio.it oppure iltuodominio.it"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={adding || !newDominio.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: adding ? 0.6 : 1 }}
          >
            <Plus size={15} strokeWidth={1.5} /> {adding ? 'Aggiunta…' : 'Aggiungi'}
          </button>
        </form>
      </div>
    </div>
  )
}

function SubdomainCard({ dom, onCopy, copied, onRename }) {
  const DOMAIN = import.meta.env.VITE_STAYAPP_DOMAIN || 'oltrenova.com'
  const url = `https://${dom.dominio}`
  const currentSlug = dom.dominio.replace(`.${DOMAIN}`, '')

  const [editing, setEditing] = useState(false)
  const [slug, setSlug] = useState(currentSlug)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleSave() {
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
    if (!clean || clean === currentSlug) { setEditing(false); return }
    setSaving(true)
    setSaveError('')
    try {
      await onRename(dom.id, clean)
      setEditing(false)
    } catch (e) {
      setSaveError(e.message)
    }
    setSaving(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setSlug(currentSlug); setEditing(false) }
  }

  if (editing) {
    return (
      <div style={{ background: '#f8fffe', border: '1px solid #b2dfdb', borderRadius: 10, padding: '14px 18px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#555', fontWeight: 600 }}>Scegli il tuo URL su <strong>{DOMAIN}</strong>:</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #1a1a2e', borderRadius: 8, overflow: 'hidden', flex: 1, minWidth: 220 }}>
            <input
              autoFocus
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              onKeyDown={handleKeyDown}
              style={{ flex: 1, padding: '8px 10px', border: 'none', outline: 'none', fontSize: 14, fontWeight: 700 }}
            />
            <span style={{ padding: '8px 10px', background: '#f5f5f5', fontSize: 13, color: '#888', whiteSpace: 'nowrap' }}>.{DOMAIN}</span>
          </div>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            <Check size={14} strokeWidth={2} /> {saving ? 'Salvo…' : 'Salva'}
          </button>
          <button onClick={() => { setSlug(currentSlug); setEditing(false) }} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 6 }}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        {saveError && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c53030' }}>{saveError}</p>}
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#888' }}>Solo lettere minuscole, numeri e trattini. Premi Invio per salvare.</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#f8fffe', border: '1px solid #b2dfdb', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <CheckCircle size={16} strokeWidth={1.5} color="#2e7d32" style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', flex: 1 }}>{dom.dominio}</span>
        <button
          onClick={() => setEditing(true)}
          title="Personalizza URL"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4, display: 'flex' }}
        >
          <Pencil size={14} strokeWidth={1.5} />
        </button>
        <a href={url} target="_blank" rel="noreferrer" style={{ color: '#aaa', display: 'flex' }}>
          <ExternalLink size={15} strokeWidth={1.5} />
        </a>
        <button
          onClick={() => onCopy(url)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: copied === url ? '#e8f5e9' : '#f5f5f5', color: copied === url ? '#2e7d32' : '#555', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}
        >
          <Copy size={13} strokeWidth={1.5} /> {copied === url ? 'Copiato!' : 'Copia URL'}
        </button>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888' }}>
        Condividi questo link con i tuoi clienti. <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1565c0', fontSize: 12, padding: 0, textDecoration: 'underline' }}>Personalizza URL</button>
      </p>
    </div>
  )
}

function CustomDomainCard({ dom, onCopy, copied, onVerify, onDelete }) {
  const [verifying, setVerifying] = useState(false)
  const url = `https://${dom.dominio}`
  const istruzioni = dom.dns_istruzioni

  async function handleVerify() {
    setVerifying(true)
    await onVerify(dom.id)
    setVerifying(false)
  }

  if (dom.stato === 'attivo') {
    return (
      <div style={{ background: '#f8fffe', border: '1px solid #b2dfdb', borderRadius: 10, padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <CheckCircle size={16} strokeWidth={1.5} color="#2e7d32" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', flex: 1 }}>{dom.dominio}</span>
          <span style={{ fontSize: 12, color: '#2e7d32', fontWeight: 600 }}>Attivo</span>
          <a href={url} target="_blank" rel="noreferrer" style={{ color: '#aaa', display: 'flex' }}>
            <ExternalLink size={15} strokeWidth={1.5} />
          </a>
          <button onClick={() => onCopy(url)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: copied === url ? '#e8f5e9' : '#f5f5f5', color: copied === url ? '#2e7d32' : '#555', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>
            <Copy size={13} strokeWidth={1.5} /> {copied === url ? 'Copiato!' : 'Copia URL'}
          </button>
          <button onClick={() => onDelete(dom.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4 }}>
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    )
  }

  if (dom.stato === 'errore') {
    return (
      <div style={{ background: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: 10, padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <AlertCircle size={16} strokeWidth={1.5} color="#c62828" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', flex: 1 }}>{dom.dominio}</span>
          <button onClick={handleVerify} disabled={verifying} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff3e0', color: '#e65100', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: verifying ? 0.6 : 1 }}>
            <RefreshCw size={13} strokeWidth={1.5} /> {verifying ? 'Verifica…' : 'Riprova verifica'}
          </button>
          <button onClick={() => onDelete(dom.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4 }}>
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c62828' }}>
          Verifica fallita — controlla che i record DNS siano stati salvati correttamente e riprova.
        </p>
        {istruzioni && <DnsInstructions istruzioni={istruzioni} />}
      </div>
    )
  }

  // pending — mostra il flusso completo
  return (
    <div style={{ border: '1px solid #ffe0b2', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      {/* Header dominio */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: '#fff8f0', flexWrap: 'wrap' }}>
        <Clock size={16} strokeWidth={1.5} color="#e65100" style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', flex: 1 }}>{dom.dominio}</span>
        <span style={{ fontSize: 12, color: '#e65100', fontWeight: 600, background: '#fff3e0', padding: '2px 10px', borderRadius: 20 }}>In configurazione</span>
        <button onClick={() => onDelete(dom.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4 }}>
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
      </div>

      {/* Step progress */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', background: '#fffbf5', borderTop: '1px solid #ffe0b2', gap: 0 }}>
        <StepDot done label="1. Dominio aggiunto" />
        <div style={{ flex: 1, height: 2, background: '#ffe0b2', margin: '0 6px' }} />
        <StepDot active label="2. Configura DNS" />
        <div style={{ flex: 1, height: 2, background: '#ffe0b2', margin: '0 6px' }} />
        <StepDot label="3. Verifica" />
      </div>

      {/* DNS instructions — always visible when pending */}
      {istruzioni && <DnsInstructions istruzioni={istruzioni} />}

      {/* Verify CTA */}
      <div style={{ padding: '14px 18px', background: '#fff8f0', borderTop: '1px solid #ffe0b2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
          Dopo aver aggiunto i record DNS, clicca Verifica. I DNS possono impiegare fino a 48 ore — ma di solito bastano pochi minuti.
        </p>
        <button
          onClick={handleVerify}
          disabled={verifying}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e65100', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700, flexShrink: 0, opacity: verifying ? 0.6 : 1 }}
        >
          <RefreshCw size={14} strokeWidth={1.5} /> {verifying ? 'Verifica in corso…' : 'Verifica ora'}
        </button>
      </div>
    </div>
  )
}

function StepDot({ done, active, label }) {
  const bg = done ? '#2e7d32' : active ? '#e65100' : '#ddd'
  const textColor = done ? '#2e7d32' : active ? '#e65100' : '#aaa'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80, textAlign: 'center' }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {done
          ? <Check size={12} strokeWidth={2.5} color="#fff" />
          : <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#fff' : '#bbb' }} />
        }
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: textColor, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  )
}

function DnsInstructions({ istruzioni }) {
  const [copied, setCopied] = useState('')
  function copy(v) { navigator.clipboard.writeText(v); setCopied(v); setTimeout(() => setCopied(''), 2000) }

  return (
    <div style={{ padding: '16px 18px', background: '#fff', borderTop: '1px solid #ffe0b2' }}>
      <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
        Cosa fare — accedi al pannello DNS del tuo fornitore e aggiungi questi record
      </p>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: '#888', lineHeight: 1.5 }}>
        Il fornitore è dove hai <strong>acquistato il dominio</strong> (Aruba, GoDaddy, Cloudflare, Namecheap, Register.it…).
        Cerca la sezione <em>"DNS"</em> o <em>"Gestione DNS"</em> e aggiungi i record qui sotto — copia i valori esattamente con il pulsante.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {(istruzioni.records || []).map((r, i) => (
          <div key={i} style={{ background: '#f9f9f9', borderRadius: 8, padding: '12px 14px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: '#fff', background: '#1a1a2e', padding: '2px 8px', borderRadius: 4 }}>Tipo: {r.tipo}</span>
              <span style={{ fontSize: 11, color: '#aaa' }}>TTL: {r.ttl}</span>
              <button
                onClick={() => copy(r.valore)}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: copied === r.valore ? '#e8f5e9' : '#1a1a2e', color: copied === r.valore ? '#2e7d32' : '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                <Copy size={11} strokeWidth={1.5} /> {copied === r.valore ? 'Copiato!' : 'Copia valore'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px 8px', fontSize: 13 }}>
              <span style={{ color: '#888', fontWeight: 600 }}>Nome:</span>
              <code style={{ background: '#fff', border: '1px solid #e8e8e8', padding: '2px 8px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all' }}>{r.nome}</code>
              <span style={{ color: '#888', fontWeight: 600 }}>Valore:</span>
              <code style={{ background: '#fff', border: '1px solid #e8e8e8', padding: '2px 8px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all' }}>{r.valore}</code>
            </div>
          </div>
        ))}
      </div>

      {istruzioni.verifica_txt?.length > 0 && (
        <>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#888', fontWeight: 600 }}>Record di verifica aggiuntivi (richiesti da Vercel):</p>
          {istruzioni.verifica_txt.map((r, i) => (
            <div key={i} style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 6, padding: '8px 12px', display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, background: '#f0f0f0', padding: '1px 6px', borderRadius: 4 }}>{r.tipo}</span>
              <span><strong>Nome:</strong> {r.nome}</span>
              <span style={{ wordBreak: 'break-all' }}><strong>Valore:</strong> {r.valore}</span>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 12, background: '#fffde7', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#666' }}>
        <strong>Cloudflare:</strong> se usi Cloudflare, clicca sull'icona arancione accanto al record per disabilitare il proxy (deve diventare grigia) durante la verifica.
      </div>
    </div>
  )
}
