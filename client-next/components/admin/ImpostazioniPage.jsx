'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import { elencoFusi, fusoDelBrowser, FUSO_PREDEFINITO } from '@/lib/fuso'
import { ToggleLeft, ToggleRight, RefreshCw, Clock } from 'lucide-react'

// Dove si trova l'attivita', in termini di orologio.
//
// ⚠️ Non e' una preferenza estetica: un'ora scritta su una prenotazione («10:00»)
// non e' un istante finche' non si sa dove. Senza questo dato il server la
// leggeva nel PROPRIO fuso — Vercel gira in UTC — e per un'attivita' italiana il
// promemoria «24 ore prima» partiva due ore prima del dovuto.
function FusoOrarioCard({ azienda }) {
  const [valore, setValore] = useState(azienda?.fuso_orario || FUSO_PREDEFINITO)
  const [salvando, setSalvando] = useState(false)
  const [salvato, setSalvato] = useState(false)
  const [errore, setErrore] = useState('')
  const suggerito = fusoDelBrowser()

  async function salva(nuovo) {
    setValore(nuovo); setSalvando(true); setSalvato(false); setErrore('')
    try {
      await apiFetch(`/api/aziende/${azienda.id}`, { method: 'PATCH', body: JSON.stringify({ fuso_orario: nuovo }) })
      setSalvato(true); setTimeout(() => setSalvato(false), 2500)
    } catch (e) { setErrore(e.message); setValore(azienda?.fuso_orario || FUSO_PREDEFINITO) }
    setSalvando(false)
  }

  // L'ora di adesso in quel fuso: e' la verifica che chiunque puo' fare senza
  // sapere cosa sia un nome IANA — se l'orologio qui sotto e' il tuo, e' giusto.
  let adesso = ''
  try { adesso = new Date().toLocaleTimeString('it-IT', { timeZone: valore, hour: '2-digit', minute: '2-digit' }) } catch { /* fuso non valido */ }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Clock size={16} strokeWidth={1.5} color="#1a1a2e" />
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>Fuso orario</div>
        {salvato && <span style={{ fontSize: 12, color: '#276749', background: '#f0fff4', padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>Salvato</span>}
      </div>
      <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 14 }}>
        Serve a capire che ora sono «le 10:00» quando qualcuno prenota: da qui dipendono
        i promemoria automatici e il termine entro cui si può disdire.
      </div>
      <select value={valore} onChange={e => salva(e.target.value)} disabled={salvando}
        style={{ width: '100%', maxWidth: 420, padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
        {elencoFusi().map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
      </select>
      {adesso && (
        <div style={{ marginTop: 10, fontSize: 13, color: '#555' }}>
          Adesso qui sono le <strong>{adesso}</strong>. Se non è l’ora del tuo orologio, il fuso è sbagliato.
        </div>
      )}
      {/* Suggerito, non imposto: il titolare potrebbe stare in viaggio, e l'attivita' resta dov'e'. */}
      {suggerito !== valore && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: '#8a5a12' }}>
          Il tuo computer dice <strong>{suggerito.replace(/_/g, ' ')}</strong>.{' '}
          <button onClick={() => salva(suggerito)} style={{ background: 'none', border: 'none', padding: 0, color: '#8a5a12', textDecoration: 'underline', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>Usa questo</button>
        </div>
      )}
      {errore && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c53030' }}>{errore}</p>}
    </div>
  )
}

function SyncSubdomainsCard() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleSync() {
    if (!confirm('Registra tutti i sottodomini esistenti su Vercel? Operazione una tantum.')) return
    setSyncing(true); setResult(null); setError('')
    try {
      const data = await apiFetch('/api/domini/sync-subdomains', { method: 'POST' })
      setResult(data)
    } catch (e) { setError(e.message) }
    setSyncing(false)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>Sincronizza sottodomini su Vercel</div>
      <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 14 }}>
        Registra su Vercel tutti i sottodomini <code style={{ background: '#f0f0f0', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>slug.oltrenova.com</code> delle entità esistenti.
        Operazione una tantum — le nuove entità vengono registrate automaticamente.
      </div>
      <button
        onClick={handleSync}
        disabled={syncing}
        style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: syncing ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, opacity: syncing ? 0.6 : 1 }}
      >
        <RefreshCw size={14} strokeWidth={1.5} /> {syncing ? 'Sincronizzazione…' : 'Sincronizza sottodomini'}
      </button>
      {error && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c53030' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 12, background: '#f0fff4', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
          <strong style={{ color: '#276749' }}>✓ {result.synced} sottodomini elaborati</strong>
          {result.results?.filter(r => r.error).length > 0 && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#888' }}>
              {result.results.filter(r => r.error).map(r => (
                <li key={r.dominio}>{r.dominio}: {r.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default function ImpostazioniPage() {
  const { profile } = useAuth()
  const { azienda } = useAzienda()
  // ⚠️ Il contesto carica l'azienda da `profile.azienda_id`, che un super_admin
  // NON ha: sceglierla dal menu in cima riempie solo la sua chiave in sessione.
  // Senza questo, la scheda del fuso non sarebbe mai comparsa proprio a chi
  // amministra la piattaforma — la stessa trappola gia' vista sulle automazioni.
  const [aziendaScelta, setAziendaScelta] = useState(null)
  const router = useRouter()
  const [config, setConfig] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ⛔ Prima chi non era super_admin veniva rimandato via: «Impostazioni» sta nel
  // menu di ogni cliente, quindi cliccarla lo sbatteva fuori senza spiegazioni.
  // Ora ognuno vede le impostazioni che gli riguardano — quelle della
  // piattaforma restano di chi la amministra.
  useEffect(() => {
    if (azienda) { setAziendaScelta(null); return }
    const id = typeof window !== 'undefined' && sessionStorage.getItem('sa_azienda_id')
    if (!id) { setAziendaScelta(null); return }
    let vivo = true
    apiFetch(`/api/aziende/${id}`)
      .then(a => { if (vivo) setAziendaScelta(a) })
      .catch(() => { if (vivo) setAziendaScelta(null) })
    return () => { vivo = false }
  }, [azienda, profile?.id])

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      apiFetch('/api/auth/platform-config').then(setConfig).catch(console.error)
    }
  }, [profile]) // eslint-disable-line

  async function toggle(key) {
    if (!config || saving) return
    const newVal = !config[key]
    setConfig(c => ({ ...c, [key]: newVal }))
    setSaving(true); setSaved(false)
    try {
      const updated = await apiFetch('/api/auth/platform-config', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: newVal }),
      })
      setConfig(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setConfig(c => ({ ...c, [key]: !newVal }))
      alert('Errore salvataggio: ' + e.message)
    }
    setSaving(false)
  }

  const superAdmin = profile?.role === 'super_admin'
  const aziendaAttiva = azienda || aziendaScelta
  if (!profile) return <div style={{ color: '#999', padding: 20 }}>Caricamento…</div>
  if (superAdmin && !config) return <div style={{ color: '#999', padding: 20 }}>Caricamento…</div>


  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{superAdmin ? 'Impostazioni piattaforma' : 'Impostazioni'}</h1>
        {saved && (
          <span style={{ fontSize: 13, color: '#276749', background: '#f0fff4', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
            Salvato
          </span>
        )}
      </div>

      <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {aziendaAttiva && <FusoOrarioCard key={aziendaAttiva.id} azienda={aziendaAttiva} />}

        {!superAdmin && !aziendaAttiva && (
          <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#999' }}>
            Nessuna azienda collegata a questo profilo.
          </div>
        )}

        {superAdmin && <>
        {/* Toggle signup */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>Registrazioni pubbliche</div>
              <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
                Quando attivo, chiunque può registrarsi su{' '}
                <code style={{ background: '#f0f0f0', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>/signup</code>.{' '}
                Disattiva per operare solo tramite inviti manuali.
              </div>
            </div>
            <button onClick={() => toggle('signup_enabled')} style={{ background: 'none', border: 'none', cursor: saving ? 'wait' : 'pointer', flexShrink: 0, padding: 0, opacity: saving ? 0.6 : 1 }}>
              {config.signup_enabled
                ? <ToggleRight size={40} strokeWidth={1.5} color="#276749" />
                : <ToggleLeft  size={40} strokeWidth={1.5} color="#bbb" />}
            </button>
          </div>
          <div style={{
            marginTop: 14, fontSize: 12, padding: '8px 12px', borderRadius: 8, fontWeight: 600,
            background: config.signup_enabled ? '#f0fff4' : '#f9f9f9',
            color: config.signup_enabled ? '#276749' : '#999',
          }}>
            {config.signup_enabled ? '✓ Registrazioni aperte — /signup è accessibile pubblicamente' : '✕ Registrazioni chiuse — solo accesso manuale'}
          </div>
        </div>

        {/* Link alla pagina */}
        {config.signup_enabled && (
          <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#b7791f', border: '1px solid #fef3c7' }}>
            Link registrazione:{' '}
            <a href="/signup" target="_blank" rel="noreferrer" style={{ color: '#b7791f', fontWeight: 600 }}>
              {window.location.origin}/signup
            </a>
          </div>
        )}

        {/* Sync sottodomini Vercel */}
        <SyncSubdomainsCard />

        {/* Placeholder future settings */}
        <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
          Altre impostazioni (piani Stripe, limiti trial, white-label) saranno disponibili nelle prossime versioni.
        </div>
        </>}
      </div>
    </div>
  )
}
