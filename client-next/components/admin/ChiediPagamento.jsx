'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { Copy, Check, Mail, X, CreditCard, MessageCircle } from 'lucide-react'

// «Chiedi il pagamento»: il titolare crea un link per una prenotazione presa a
// voce e lo manda — copiandolo dove vuole, o per email.
//
// Idea di Francesco (08/10/2026): l'hotel che riceve una telefonata e manda il
// link per pagare. Vale per eventi e risorse; le regole stanno nel server
// (`lib/link-pagamento.js`), qui c'è solo la finestra.
//
// ⚠️ Definito in un file suo e montato una volta sola dalla pagina: dentro una
// riga cambierebbe identità a ogni render e perderebbe quello che si sta
// scrivendo (nota 22 di CLAUDE.md).

const campo = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box', fontFamily: 'inherit' }
const etichetta = { display: 'block', fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }
const pulsante = (pieno = true) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  background: pieno ? '#1a1a2e' : '#fff', color: pieno ? '#fff' : '#1a1a2e', border: pieno ? 'none' : '1px solid #ccc' })
const euro = n => `€${(Number(n) || 0).toFixed(2)}`
const fino = iso => new Date(iso).toLocaleString('it-IT', { weekday: 'long', hour: '2-digit', minute: '2-digit' })

export default function ChiediPagamento({ tipo, id, onChiudi, onCambiato }) {
  const [dati, setDati] = useState(null)        // la prenotazione, com'è adesso
  const [errore, setErrore] = useState('')
  const [importo, setImporto] = useState('')
  const [email, setEmail] = useState('')
  const [fa, setFa] = useState('')              // '' | 'crea' | 'invia'
  const [copiato, setCopiato] = useState(false)
  const [inviata, setInviata] = useState('')    // l'indirizzo a cui è partita
  const [rifai, setRifai] = useState(false)     // ha chiesto un link nuovo

  useEffect(() => {
    let vivo = true
    apiFetch(`/api/pagamenti/link?tipo=${tipo}&id=${id}`)
      .then(d => { if (!vivo) return; setDati(d); setImporto(String(d.link?.importo ?? d.proposta ?? '')); setEmail(d.email || '') })
      .catch(e => { if (vivo) setErrore(e.message || 'Non riesco a leggere la prenotazione') })
    return () => { vivo = false }
  }, [tipo, id])

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onChiudi() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])

  async function crea() {
    setFa('crea'); setErrore(''); setInviata('')
    try {
      const r = await apiFetch('/api/pagamenti/link', { method: 'POST', body: JSON.stringify({ tipo, id, importo }) })
      setDati(d => ({ ...d, link: r.link })); setRifai(false)
      onCambiato?.()
    } catch (e) { setErrore(e.message || 'Non sono riuscito a creare il link') }
    finally { setFa('') }
  }

  async function copia() {
    try { await navigator.clipboard.writeText(dati.link.url); setCopiato(true); setTimeout(() => setCopiato(false), 2500) }
    catch { setErrore('Non riesco a copiare da solo: seleziona il link e copialo a mano.') }
  }

  async function invia() {
    setFa('invia'); setErrore(''); setInviata('')
    try {
      await apiFetch('/api/pagamenti/link/invia', { method: 'POST', body: JSON.stringify({ tipo, id, email }) })
      setInviata(email.trim())
    } catch (e) { setErrore(e.message || 'L’email non è partita') }
    finally { setFa('') }
  }

  const link = dati?.link && !rifai ? dati.link : null
  const parziale = dati && dati.totale > 0 && Number(String(importo).replace(',', '.')) < dati.totale
  // WhatsApp senza integrazione: apre la chat con il messaggio già scritto.
  // Quando il numero sarà collegato partirà da solo; intanto è un clic.
  // Il numero arriva già in forma internazionale dal server (`normalizzaTelefono`,
  // la stessa dei contatti): un cellulare scritto «333 1234567» resterebbe
  // senza prefisso e WhatsApp aprirebbe la chat di un altro paese.
  const numero = dati?.whatsapp || ''
  const messaggio = link ? `Ciao${dati.nome ? ' ' + dati.nome.split(' ')[0] : ''}, ecco il link per pagare ${dati.titolo} (${euro(link.importo)}): ${link.url}` : ''

  return (
    <div onClick={onChiudi} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6vh 16px', overflowY: 'auto' }}>
      <div data-chiedi-pagamento role="dialog" aria-modal="true" aria-label="Chiedi il pagamento" onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, padding: '22px 22px 20px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><CreditCard size={18} strokeWidth={1.5} color="#1a1a2e" /> Chiedi il pagamento</h3>
          <button type="button" aria-label="Chiudi" onClick={onChiudi} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}><X size={20} strokeWidth={1.5} color="#666" /></button>
        </div>

        {!dati && !errore && <p style={{ color: '#767676', fontSize: 14 }}>Un momento…</p>}

        {dati && (
          <>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#555', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
              <strong style={{ color: '#1a1a2e' }}>{dati.nome}</strong> · {dati.titolo}{dati.quando ? ` · ${dati.quando}` : ''}
              {dati.totale > 0 && <> · totale {euro(dati.totale)}</>}
            </p>

            {dati.non_si_puo ? (
              <div data-non-si-puo style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#9b2c2c', borderRadius: 8, padding: '10px 12px', fontSize: 13.5, lineHeight: 1.5 }}>{dati.non_si_puo}</div>
            ) : !dati.conto_collegato ? (
              <div data-senza-conto style={{ background: '#fffbeb', border: '1px solid #f6e05e', color: '#744210', borderRadius: 8, padding: '10px 12px', fontSize: 13.5, lineHeight: 1.6 }}>
                Per chiedere un pagamento online serve un conto collegato su cui incassare.{' '}
                <Link href="/admin/pagamenti" style={{ color: '#2b6cb0', fontWeight: 600 }}>Collegalo in «Pagamenti»</Link>: i soldi arrivano direttamente a te.
              </div>
            ) : !link ? (
              <>
                <label style={etichetta} htmlFor="importo-link">Quanto chiedi</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#666' }}>€</span>
                  <input id="importo-link" inputMode="decimal" value={importo} onChange={e => setImporto(e.target.value)} style={{ ...campo, maxWidth: 160 }} />
                </div>
                <p style={{ fontSize: 12.5, color: '#767676', margin: '6px 0 14px', lineHeight: 1.5 }}>
                  {dati.totale > 0
                    ? (parziale ? <>È un acconto: resteranno {euro(dati.totale - Number(String(importo).replace(',', '.') || 0))} da saldare.</> : <>È il totale: la prenotazione risulterà saldata.</>)
                    : <>Questa prenotazione non ha un importo suo: scrivi tu la cifra.</>}
                </p>
                <button type="button" data-crea-link onClick={crea} disabled={fa === 'crea'} style={{ ...pulsante(), width: '100%', opacity: fa === 'crea' ? 0.6 : 1 }}>
                  {fa === 'crea' ? 'Creo il link…' : 'Crea il link di pagamento'}
                </button>
                <p style={{ fontSize: 12.5, color: '#767676', margin: '10px 0 0', lineHeight: 1.5 }}>
                  Il link vale {dati.ore} ore. La prenotazione resta com’è: non si annulla se non paga.
                </p>
              </>
            ) : (
              <>
                <div style={{ background: '#f0f7f2', border: '1px solid #c6e6d0', color: '#22543d', borderRadius: 8, padding: '9px 12px', fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>
                  Link pronto per <strong>{euro(link.importo)}</strong>. Vale fino a {fino(link.scade_il)}.
                </div>
                <label style={etichetta} htmlFor="url-link">Il link</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input id="url-link" data-url-link readOnly value={link.url} onFocus={e => e.target.select()} style={{ ...campo, fontSize: 13, color: '#444', minWidth: 0 }} />
                  <button type="button" data-copia-link onClick={copia} style={{ ...pulsante(), flexShrink: 0 }}>
                    {copiato ? <><Check size={15} strokeWidth={2} /> Copiato</> : <><Copy size={15} strokeWidth={1.5} /> Copia link</>}
                  </button>
                </div>
                {numero && (
                  <a data-apri-whatsapp href={`https://wa.me/${numero}?text=${encodeURIComponent(messaggio)}`} target="_blank" rel="noopener noreferrer"
                    style={{ ...pulsante(false), marginTop: 10, textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}>
                    <MessageCircle size={15} strokeWidth={1.5} color="#128C7E" /> Apri WhatsApp con il messaggio già scritto
                  </a>
                )}

                <div style={{ borderTop: '1px solid #eee', margin: '16px 0 14px' }} />
                <label style={etichetta} htmlFor="email-link">Oppure mandalo per email</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input id="email-link" type="email" value={email} onChange={e => { setEmail(e.target.value); setInviata('') }} placeholder="nome@esempio.it" style={{ ...campo, minWidth: 0 }} />
                  <button type="button" data-invia-link onClick={invia} disabled={fa === 'invia' || !email.trim()} style={{ ...pulsante(false), flexShrink: 0, opacity: fa === 'invia' || !email.trim() ? 0.5 : 1 }}>
                    <Mail size={15} strokeWidth={1.5} /> {fa === 'invia' ? 'Invio…' : 'Invia'}
                  </button>
                </div>
                {inviata && <p data-inviata style={{ fontSize: 13, color: '#22543d', margin: '8px 0 0' }}>Inviata a {inviata}.</p>}

                <p style={{ fontSize: 12.5, color: '#767676', margin: '14px 0 0', lineHeight: 1.5 }}>
                  Quando paga, la prenotazione diventa «Pagato» da sola e lui riceve la conferma. Se non paga resta com’è.{' '}
                  <button type="button" onClick={() => setRifai(true)} style={{ background: 'none', border: 'none', padding: 0, color: '#2b6cb0', cursor: 'pointer', fontSize: 12.5, textDecoration: 'underline' }}>Cambia l’importo</button>
                  {' '}(il link di prima smette di valere).
                </p>
              </>
            )}
          </>
        )}

        {errore && <p data-errore-link style={{ fontSize: 13.5, color: '#c53030', margin: '12px 0 0', lineHeight: 1.5 }}>{errore}</p>}
      </div>
    </div>
  )
}
