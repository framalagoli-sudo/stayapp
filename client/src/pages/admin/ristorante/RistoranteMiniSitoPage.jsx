import { useParams } from 'react-router-dom'
import { useRistorante } from '../../../hooks/useRistorante'
import MiniSitoEditor from '../MiniSitoPage'

export default function RistoranteMiniSitoPage() {
  const { id } = useParams()
  const { ristorante, loading, saving, saved, saveError, save } = useRistorante(id)
  return (
    <MiniSitoEditor
      entity={ristorante}
      entityType="ristorante"
      save={save}
      loading={loading}
      saving={saving}
      saved={saved}
      saveError={saveError}
    />
  )
}
