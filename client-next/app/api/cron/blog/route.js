import { runBlogScheduler } from '@/lib/blog-scheduler'

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await runBlogScheduler()
    return Response.json({ ok: true })
  } catch (e) {
    console.error('[cron/blog]', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
