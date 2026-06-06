'use client'
import { useProperty } from '../../../hooks/useProperty'
import MiniSitoEditor from '../MiniSitoPage'

export default function PropertyMiniSitoPage() {
  const { property, loading, saving, saved, saveError, save } = useProperty()
  return (
    <MiniSitoEditor
      entity={property}
      entityType="struttura"
      save={save}
      loading={loading}
      saving={saving}
      saved={saved}
      saveError={saveError}
    />
  )
}
