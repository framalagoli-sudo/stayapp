import { useParams } from 'react-router-dom'
import { useAttivita } from '../../../hooks/useAttivita'
import MiniSitoEditor from '../MiniSitoPage'

export default function AttivitaMiniSitoPage() {
  const { id } = useParams()
  const { attivita, loading, saving, saved, saveError, save } = useAttivita(id)
  return (
    <MiniSitoEditor
      entity={attivita}
      entityType="attivita"
      save={save}
      loading={loading}
      saving={saving}
      saved={saved}
      saveError={saveError}
    />
  )
}
