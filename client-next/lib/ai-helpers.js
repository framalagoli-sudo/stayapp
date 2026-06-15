const MONTHLY_LIMIT = parseInt(process.env.AI_MONTHLY_LIMIT || '20')
const usageMap = new Map()
const genRateMap = new Map()
const GEN_LIMIT_PER_HOUR = 10

function currentMonth() { return new Date().toISOString().slice(0, 7) }

export function getRemainingCredits(azienda_id) {
  const month = currentMonth()
  const rec = usageMap.get(azienda_id)
  if (!rec || rec.month !== month) return MONTHLY_LIMIT
  return Math.max(0, MONTHLY_LIMIT - rec.count)
}

export function consumeCredit(azienda_id) {
  const month = currentMonth()
  const rec = usageMap.get(azienda_id)
  const count = (!rec || rec.month !== month) ? 1 : rec.count + 1
  usageMap.set(azienda_id, { count, month })
  return MONTHLY_LIMIT - count
}

export function checkAndConsumeGenRate(userId) {
  const now = Date.now()
  const times = (genRateMap.get(userId) || []).filter(t => now - t < 3_600_000)
  if (times.length >= GEN_LIMIT_PER_HOUR) return false
  genRateMap.set(userId, [...times, now])
  return true
}

export { MONTHLY_LIMIT }

export async function callClaude(prompt, maxTokens = 500) {
  const apiKey = (process.env.ANTHROPIC_API_KEY ?? '').trim()
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurata')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90_000)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Anthropic API error ${res.status}`)
    }
    const data = await res.json()
    return data.content[0].text.trim()
  } finally { clearTimeout(timer) }
}
