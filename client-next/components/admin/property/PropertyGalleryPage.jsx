'use client'
import { useProperty } from '../../../hooks/useProperty'
import GallerySection from '../GallerySection'
import { apiFetch, uploadMedia } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
import { useState } from 'react'
import RimandoAlMarchio from '@/components/admin/RimandoAlMarchio'

function getStoragePath(url) {
  const marker = '/property-media/'
  const idx = url?.indexOf(marker) ?? -1
  return idx !== -1 ? url.slice(idx + marker.length).split('?')[0] : null
}

export default function PropertyGalleryPage() {
  const { property, loading, save, propertyId } = useProperty()

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!property) return <p style={errorStyle}>Nessuna struttura associata al profilo.</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={titleStyle}>Galleria foto</h2>
      <p style={descStyle}>Le foto vengono mostrate nell'app ospite con scroll orizzontale. Tocca una foto per vederla a schermo intero.</p>

      <RimandoAlMarchio href={`/admin/struttura/${propertyId || property?.id}/theme`} />

      {/* Gallery */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Galleria</h3>
        <GallerySection
          gallery={property.gallery || []}
          onChange={v => save({ gallery: v }).catch(() => {})}
        />
      </div>
    </div>
  )
}

const titleStyle      = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle       = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle       = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }
const sectionTitle    = { marginTop: 0, marginBottom: 16, fontSize: 15 }
const lblStyle        = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }
const hintStyle       = { margin: '6px 0 0', fontSize: 11, color: '#aaa' }
const uploadLabelStyle = { padding: '8px 16px', background: '#f0f0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, border: '1px solid #ddd', fontWeight: 600, color: '#333' }
const removeBtnStyle  = { fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }
const loadingStyle    = { padding: 32, color: '#888' }
const errorStyle      = { padding: 32, color: '#e53e3e' }
