import { requireAuth } from '@/lib/server-auth'
import { sendNewsletterById } from '@/lib/newsletter-send'

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response

    const sent = await sendNewsletterById(params.id)
    return Response.json({ ok: true, sent })
  } catch (e) {
    const status = e.message.includes('non trovata') ? 404 : e.message.includes('già inviata') ? 400 : 500
    return Response.json({ error: e.message }, { status })
  }
}
