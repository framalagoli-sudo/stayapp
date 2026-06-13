import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

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
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
