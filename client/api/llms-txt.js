import { createClient } from '@supabase/supabase-js'

const DEFAULT = `# OltreNova

> All-in-one digital platform for service businesses.

## Links
- Platform: https://oltrenova.com
- Contact: fra.malagoli@gmail.com`

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )
    const { data } = await supabase.from('landing_seo').select('llms_txt').single()
    res.send(data?.llms_txt || DEFAULT)
  } catch {
    res.send(DEFAULT)
  }
}
