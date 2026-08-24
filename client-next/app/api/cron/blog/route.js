import { runBlogScheduler } from '@/lib/blog-scheduler'
import { logError } from '@/lib/observability'
import { battitoEControllo } from '@/lib/cron-battito'

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await runBlogScheduler()
    await battitoEControllo('blog')
    return Response.json({ ok: true })
  } catch (e) {
    await logError('cron/blog', e, { alert: true })
    return Response.json({ error: e.message }, { status: 500 })
  }
}
