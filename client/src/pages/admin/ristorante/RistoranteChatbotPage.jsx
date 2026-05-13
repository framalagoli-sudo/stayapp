import { useParams } from 'react-router-dom'
import { useRistorante } from '../../../hooks/useRistorante'
import ChatbotEditor from '../../../components/admin/ChatbotEditor'

export default function RistoranteChatbotPage() {
  const { id } = useParams()
  const { ristorante, loading, saving, saved, saveError, save } = useRistorante(id)
  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>
  if (!ristorante) return <p style={{ padding: 32, color: '#e53e3e' }}>Ristorante non trovato.</p>
  return (
    <ChatbotEditor
      chatbot={ristorante.chatbot}
      onSave={(chatbot) => save({ chatbot })}
      saving={saving}
      saved={saved}
      saveError={saveError}
    />
  )
}
