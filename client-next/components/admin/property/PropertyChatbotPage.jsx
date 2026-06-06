'use client'
import { useState, useEffect } from 'react'
import { useProperty } from '../../../hooks/useProperty'
import ChatbotEditor from '../../../components/admin/ChatbotEditor'

export default function PropertyChatbotPage() {
  const { property, loading, saving, saved, saveError, save } = useProperty()
  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>
  if (!property) return <p style={{ padding: 32, color: '#e53e3e' }}>Struttura non trovata.</p>
  return (
    <ChatbotEditor
      chatbot={property.chatbot}
      onSave={(chatbot) => save({ chatbot })}
      saving={saving}
      saved={saved}
      saveError={saveError}
    />
  )
}
