import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

export function useRistorante(id) {
  const [ristorante, setRistorante] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/ristoranti/${id}`)
      setRistorante(data)
    } catch {
      setRistorante(null)
    } finally {
      setLoading(false)
    }
  }

  async function save(updates) {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const data = await apiFetch(`/api/ristoranti/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setRistorante(r => ({ ...r, ...data }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveError(e.message || 'Errore nel salvataggio')
      throw e
    } finally {
      setSaving(false)
    }
  }

  return { ristorante, setRistorante, loading, saving, saved, saveError, save }
}
