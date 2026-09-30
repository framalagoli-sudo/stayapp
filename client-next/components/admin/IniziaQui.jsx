'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Rocket } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'

// «Inizia qui»: la strada dal primo accesso al sito pubblicato. I passi si
// spuntano da soli leggendo i dati (lib/primi-passi.js): chi ha già tutto non
// vede niente. In Dashboard è un riquadro che si può nascondere; su
// /admin/onboarding è la pagina intera, ed è lì che porta l'email di benvenuto.
export default function IniziaQui({ pagina = false }) {
  const router = useRouter()
  const { profile } = useAuth()
  const { azienda, activeAziendaId } = useAzienda()
  const aziendaId = profile?.role === 'super_admin' ? (azienda?.id || activeAziendaId) : profile?.azienda_id
  const [dati, setDati] = useState(null)
  const [errore, setErrore] = useState('')
  const [nascosto, setNascosto] = useState(false)
  const chiave = `inizia_qui_nascosto_${aziendaId}`

  useEffect(() => {
    if (!aziendaId) return
    try { setNascosto(!pagina && localStorage.getItem(chiave) === '1') } catch {}
    const q = profile?.role === 'super_admin' ? `?azienda_id=${aziendaId}` : ''
    apiFetch(`/api/primi-passi${q}`).then(setDati).catch(e => setErrore(e.message))
  }, [aziendaId]) // eslint-disable-line

  if (!profile || !['admin_azienda', 'super_admin'].includes(profile.role)) return null
  if (!aziendaId) return pagina ? <p style={{ color: '#888' }}>Scegli un'azienda dal menu per vedere i suoi primi passi.</p> : null
  if (errore) return pagina ? <p style={{ color: '#c53030' }}>{errore}</p> : null
  if (!dati) return null

  const obbligatori = [...dati.entita.flatMap(e => e.passi.filter(p => !p.facoltativo)), ...(dati.contatto ? [dati.contatto] : [])]
  const fatti = obbligatori.filter(p => p.fatto).length
  const tuttoFatto = fatti === obbligatori.length

  if (!pagina && (tuttoFatto || nascosto || dati.entita.length === 0)) return null

  function nascondi() {
    try { localStorage.setItem(chiave, '1') } catch {}
    setNascosto(true)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '20px 22px', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <Rocket size={22} strokeWidth={1.5} color="#1a1a2e" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>Inizia qui</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
            {tuttoFatto
              ? 'Hai fatto tutto: il tuo sito è online e raccoglie contatti.'
              : `I passi per avere il tuo sito online. Si spuntano da soli man mano che li completi — ${fatti} di ${obbligatori.length} fatti.`}
          </div>
        </div>
        {!pagina && (
          <button type="button" onClick={nascondi}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
            Nascondi
          </button>
        )}
      </div>

      <div style={{ height: 6, borderRadius: 3, background: '#eee', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ width: `${obbligatori.length ? Math.round(fatti / obbligatori.length * 100) : 0}%`, height: '100%', background: '#38a169', transition: 'width .3s' }} />
      </div>

      {dati.entita.map(e => (
        <div key={e.id} style={{ marginBottom: 14 }}>
          {dati.entita.length > 1 && (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px', overflowWrap: 'anywhere' }}>{e.nome}</div>
          )}
          {/* Un'entità che ha già tutto è una riga sola: le righe verdi
              allungherebbero il riquadro senza dire niente di utile. */}
          {e.passi.every(p => p.fatto || p.facoltativo)
            ? <Passo passo={{ titolo: dati.entita.length > 1 ? 'Tutto fatto' : 'Il tuo sito è pronto', dettaglio: 'Dati completi, sito online e visibile su Google', fatto: true }} onApri={() => router.push(e.passi[1].link)} />
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 6 }}>
                {e.passi.map(p => <Passo key={p.chiave} passo={p} onApri={() => router.push(p.link)} />)}
              </div>
            )}
        </div>
      ))}
      {dati.contatto && <Passo passo={dati.contatto} onApri={() => router.push(dati.contatto.link)} />}
    </div>
  )
}

function Passo({ passo, onApri }) {
  const { titolo, dettaglio, fatto, facoltativo } = passo
  return (
    <button type="button" onClick={onApri}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        border: `1px solid ${fatto ? '#e6f4ea' : '#eee'}`, background: fatto ? '#f6fbf7' : '#fff' }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: fatto ? '#38a169' : '#fff', border: fatto ? 'none' : `2px solid ${facoltativo ? '#ccc' : '#1a1a2e'}` }}>
        {fatto && <Check size={14} strokeWidth={2.5} color="#fff" />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: fatto ? '#276749' : '#1a1a2e' }}>
          {titolo}{facoltativo && <span style={{ fontSize: 11, fontWeight: 500, color: '#888', marginLeft: 6 }}>facoltativo</span>}
        </span>
        <span style={{ display: 'block', fontSize: 12.5, color: '#666', marginTop: 1, overflowWrap: 'anywhere' }}>{dettaglio}</span>
      </span>
      {!fatto && <ChevronRight size={18} strokeWidth={1.5} color="#1a1a2e" style={{ flexShrink: 0 }} />}
    </button>
  )
}
