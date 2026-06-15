import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function PATCH(request, { params }) {
  try {
    const { response } = await requireRecordAccess(request, 'blog_categories', params.id)
    if (response) return response
    const { name, description } = await request.json()
    const updates = {}
    if (name?.trim()) { updates.name = name.trim(); updates.slug = slugify(name) }
    if (description !== undefined) updates.description = description
    const { data, error } = await supabaseAdmin.from('blog_categories').update(updates).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { response } = await requireRecordAccess(request, 'blog_categories', params.id)
    if (response) return response
    const { error } = await supabaseAdmin.from('blog_categories').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
