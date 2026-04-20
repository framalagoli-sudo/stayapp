import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function QRCodePage() {
  const { profile } = useAuth()
  const [slug, setSlug] = useState(null)
  const [error, setError] = useState(null)
  const baseUrl = window.location.origin

  useEffect(() => {
    if (!profile) return
    if (!profile.property_id) {
      setError('Nessuna struttura associata al tuo account.')
      return
    }
    fetchSlug()
  }, [profile])

  async function fetchSlug() {
    const { data, error } = await supabase
      .from('properties')
      .select('slug')
      .eq('id', profile.property_id)
      .single()
    if (error || !data) {
      setError('Impossibile caricare i dati della struttura.')
    } else {
      setSlug(data.slug)
    }
  }

  const guestUrl = slug ? `${baseUrl}/s/${slug}` : ''
  const qrUrl = slug
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(guestUrl)}`
    : ''

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>QR Code</h2>
      {error ? (
        <p style={{ color: '#c00' }}>{error}</p>
      ) : slug === null ? (
        <p>Caricamento…</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, display: 'inline-block', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <img src={qrUrl} alt="QR Code struttura" style={{ display: 'block', width: 240, height: 240 }} />
          <p style={{ marginTop: 16, fontSize: 13, color: '#666', wordBreak: 'break-all' }}>{guestUrl}</p>
          <a
            href={qrUrl}
            download={`qr-${slug}.png`}
            style={{ display: 'inline-block', marginTop: 8, padding: '8px 20px', background: '#1a1a2e', color: '#fff', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}
          >
            Scarica PNG
          </a>
        </div>
      )}
    </div>
  )
}
