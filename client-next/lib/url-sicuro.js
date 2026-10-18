import { lookup } from 'node:dns/promises'

// Un URL verso cui il SERVER farà una richiesta (webhook in uscita del cliente)
// non deve poter puntare a un indirizzo interno: senza questo controllo è una
// SSRF — l'azienda configura `http://169.254.169.254/…` o `http://localhost:…`
// e il nostro server, dal suo interno della rete, va a bussare lì per conto suo.
// (Trovato dall'agente il 17/10/2026 su /api/webhooks + /api/webhooks/[id]/test.)
//
// La difesa: solo http/https, e l'host — risolto a indirizzo IP — non deve
// cadere in un intervallo privato/loopback/link-local. Si risolve il DNS, così
// non basta un nome che punta a 127.0.0.1.

// Un indirizzo IPv4 interno? (privati, loopback, link-local, 0.x, CGNAT)
function interno4(ip) {
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true // malformato → tratta come non sicuro
  const [a, b] = p
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true          // link-local / metadata cloud
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a === 192 && b === 0) return true             // 192.0.0.0/24 (incl. 192.0.0.x)
  return false
}

// Un indirizzo IPv6 interno? (loopback, ULA fc00::/7, link-local fe80::/10,
// unspecified, e i mappati ::ffff:a.b.c.d che vanno controllati come IPv4)
function interno6(ip) {
  const x = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (x === '::1' || x === '::') return true
  const mapped = x.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return interno4(mapped[1])
  if (/^f[cd]/.test(x)) return true                 // fc00::/7 (ULA)
  if (/^fe[89ab]/.test(x)) return true              // fe80::/10 (link-local)
  return false
}

function internoIP(ip) {
  return ip.includes(':') ? interno6(ip) : interno4(ip)
}

const PARE_IP = /^[0-9.]+$|:/

// Restituisce { ok:true, url } se l'URL è esterno e sicuro, altrimenti { errore }.
export async function urlEsternoSicuro(raw) {
  let u
  try { u = new URL(String(raw || '').trim()) } catch { return { errore: 'URL non valido' } }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { errore: 'Sono ammessi solo indirizzi http(s)' }
  const host = u.hostname.toLowerCase()
  if (!host) return { errore: 'URL senza host' }
  // Nomi interni espliciti, mai leciti per un webhook.
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return { errore: 'Indirizzo interno non ammesso' }
  // Un IP scritto a mano: controllo diretto.
  if (PARE_IP.test(host)) {
    if (internoIP(host)) return { errore: 'Indirizzo interno non ammesso' }
    return { ok: true, url: u.toString() }
  }
  // Un nome: si risolve e si controlla DOVE punta davvero (un nome può puntare a 127.0.0.1).
  try {
    const indirizzi = await lookup(host, { all: true })
    if (indirizzi.some(a => internoIP(a.address))) return { errore: 'Indirizzo interno non ammesso' }
  } catch {
    // Non si risolve: la fetch fallirebbe comunque senza raggiungere nulla di interno. Si lascia passare.
  }
  return { ok: true, url: u.toString() }
}
