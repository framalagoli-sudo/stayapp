import { useParams } from 'react-router-dom'
import { useAttivita } from '../../../hooks/useAttivita'
import ChatbotEditor from '../../../components/admin/ChatbotEditor'

export default function AttivitaChatbotPage() {
  const { id } = useParams()
  const { attivita, loading, saving, saved, saveError, save } = useAttivita(id)
  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>
  if (!attivita) return <p style={{ padding: 32, color: '#e53e3e' }}>Attività non trovata.</p>
  return (
    <ChatbotEditor
      chatbot={attivita.chatbot}
      onSave={(chatbot) => save({ chatbot })}
      saving={saving}
      saved={saved}
      saveError={saveError}
    />
  )
}
