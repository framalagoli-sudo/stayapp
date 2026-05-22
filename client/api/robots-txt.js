import { createClient } from '@supabase/supabase-js'

const AI_BOTS = [
  'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web',
  'PerplexityBot', 'CCBot', 'cohere-ai', 'anthropic-ai',
  'Google-Extended', 'FacebookBot', 'Applebot-Extended',
]

function buildRobots(aiAllowed) {
  const aiRules = AI_BOTS.map(bot =>
    `User-agent: ${bot}\n${aiAllowed ? 'Allow' : 'Disallow'}: /`
  ).join('\n\n')

  return `User-agent: *\nAllow: /\n\n${aiRules}\n\nSitemap: https://oltrenova.com/sitemap.xml`
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )
    const { data } = await supabase.from('landing_seo').select('ai_bots_allowed').single()
    res.send(buildRobots(data?.ai_bots_allowed !== false))
  } catch {
    res.send(buildRobots(true))
  }
}
