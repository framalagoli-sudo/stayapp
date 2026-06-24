import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { localizeEntity } from '@/lib/translate'

// Copre la traduzione Haiku della definizione form al primo caricamento EN (cache miss).
export const maxDuration = 30

export async function GET(request, { params }) {
  try {
    const { token } = await params
    const { data, error } = await supabaseAdmin
      .from('form_builder')
      .select('id, nome, descrizione, campi, redirect_url, attivo, multi_step')
      .eq('token', token)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Form non trovato' }, { status: 404 })
    if (!data.attivo) return NextResponse.json({ error: 'Form non attivo' }, { status: 403 })
    // EN: traduce solo testo display-only (descrizione, label/placeholder dei campi).
    // Le opzioni restano in italiano (sono valori inviati: tradurle romperebbe le submission).
    const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it'
    const out = lang === 'en' ? await localizeEntity(data, 'form', lang) : data
    return NextResponse.json(out)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
