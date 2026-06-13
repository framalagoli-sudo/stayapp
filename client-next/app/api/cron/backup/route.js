import { runBackup } from '@/lib/backup'

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await runBackup()
    return Response.json({ ok: true })
  } catch (e) {
    console.error('[cron/backup]', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
