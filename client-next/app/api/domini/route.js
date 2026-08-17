import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, requireEntityAccess, ENTITY_TABLES } from '@/lib/server-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { assicuraSottodominio } from '@/lib/create-subdomain'
import { riallineaSlug, ricontrolla } from '@/lib/domini-manutenzione'
import {
  normalizzaDominio, addProjectDomain, gemelloDi, diagnosticaDominio, vercelReady,
} from '@/lib/vercel-domains'

const STAYAPP_DOMAIN = process.env.STAYAPP_DOMAIN?.trim() || 'oltrenova.com'

// Un dominio non ricontrollato da un po' viene riverificato all'apertura della
// pagina: così il cliente non vede mai uno stato vecchio di giorni.
const FRESCHEZZA_MS = 6 * 60 * 60 * 1000

// Il ricontrollo interroga Vercel e prova l'indirizzo dal vivo: serve più dei
// 10 secondi di default.
export const maxDuration = 30

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const entity_tipo = searchParams.get('entity_tipo')
    const entity_id   = searchParams.get('entity_id')

    let q = supabaseAdmin.from('domini').select('*').order('created_at', { ascending: true })
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    if (entity_tipo) q = q.eq('entity_tipo', entity_tipo)
    if (entity_id)   q = q.eq('entity_id', entity_id)

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    let lista = data || []

    if (entity_tipo && entity_id) {
      const { response: accessDenied } = await requireEntityAccess(request, entity_tipo, entity_id)
      if (accessDenied) return accessDenied

      // Ogni entità deve avere il suo indirizzo pronto: se manca lo si crea ora.
      if (!lista.some(d => d.tipo === 'subdomain')) {
        const table = ENTITY_TABLES[entity_tipo]
        const { data: entity } = await supabaseAdmin.from(table).select('azienda_id, slug').eq('id', entity_id).single()
        if (entity?.slug) {
          await assicuraSottodominio({ azienda_id: entity.azienda_id, entity_tipo, entity_id, entity_slug: entity.slug })
          const { data: fresh } = await supabaseAdmin.from('domini').select('*')
            .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).order('created_at', { ascending: true })
          lista = fresh || lista
        }
      }

      lista = await Promise.all(lista.map(aggiornaSeStantio))
    }

    return Response.json(lista)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

async function aggiornaSeStantio(record) {
  await riallineaSlug(record)
  const eta = record.ultima_verifica ? Date.now() - new Date(record.ultima_verifica).getTime() : Infinity
  if (eta < FRESCHEZZA_MS) return record
  return (await ricontrolla(record)) || record
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { entity_tipo, entity_id, dominio } = await request.json()
    if (!entity_tipo || !entity_id) {
      return Response.json({ error: 'entity_tipo ed entity_id obbligatori' }, { status: 400 })
    }
    const { response: accessDenied } = await requireEntityAccess(request, entity_tipo, entity_id)
    if (accessDenied) return accessDenied

    // Collegare un dominio costa chiamate a Vercel: limitiamo i tentativi.
    const { allowed } = await rateLimit(request, { name: 'domini-add', limit: 10, windowSec: 3600 })
    if (!allowed) return tooManyRequests()

    const { dominio: pulito, error: erroreFormato } = normalizzaDominio(dominio)
    if (erroreFormato) return Response.json({ error: erroreFormato }, { status: 400 })

    // Il dominio della piattaforma non è collegabile come "dominio personalizzato":
    // altrimenti un cliente potrebbe prenotarsi l'indirizzo di un altro.
    if (pulito === STAYAPP_DOMAIN || pulito.endsWith(`.${STAYAPP_DOMAIN}`)) {
      return Response.json({
        error: `${STAYAPP_DOMAIN} è il nostro dominio. Per cambiare il tuo indirizzo su ${STAYAPP_DOMAIN} usa "Personalizza indirizzo"; qui va il dominio che hai acquistato tu.`,
      }, { status: 400 })
    }

    const { data: giaPresente } = await supabaseAdmin.from('domini').select('id, entity_id').eq('dominio', pulito).maybeSingle()
    if (giaPresente) {
      return Response.json({
        error: giaPresente.entity_id === entity_id
          ? 'Questo dominio è già collegato a questa scheda.'
          : 'Questo dominio risulta già collegato. Rimuovilo prima dall’altra scheda.',
      }, { status: 409 })
    }

    const table = ENTITY_TABLES[entity_tipo]
    const { data: entity } = await supabaseAdmin.from(table).select('azienda_id, slug').eq('id', entity_id).single()
    if (!entity) return Response.json({ error: 'Entità non trovata' }, { status: 404 })

    // Registrazione su Vercel. Senza questo passo il cliente può configurare i DNS
    // alla perfezione e il sito non risponderà comunque.
    let apexName = null
    let variante = null
    if (vercelReady()) {
      const r = await addProjectDomain(pulito)
      if (!r.ok) return Response.json({ error: messaggioVercel(r.error, pulito) }, { status: 400 })
      apexName = r.data?.apexName || null

      // Il gemello (apex↔www) va registrato come redirect sul dominio scelto:
      // chi digita l'indirizzo senza www deve arrivare lo stesso.
      variante = gemelloDi(pulito, apexName)
      if (variante) {
        const g = await addProjectDomain(variante, { redirect: pulito })
        if (!g.ok) variante = null // già usato altrove: non è un motivo per bloccare il principale
      }
    }

    const diagnosi = await diagnosticaDominio(pulito)

    const { data, error } = await supabaseAdmin.from('domini').insert({
      azienda_id: entity.azienda_id, entity_tipo, entity_id, entity_slug: entity.slug,
      dominio: pulito, tipo: 'custom', stato: diagnosi.stato,
      vercel_domain_id: diagnosi.registrato_su_vercel ? pulito : null,
      variante_dominio: variante,
      dns_istruzioni: { records: diagnosi.records, verifica_txt: diagnosi.verifica_txt },
      verifica_dettaglio: diagnosi,
      ultima_verifica: diagnosi.controllato_il,
    }).select().single()

    if (error) {
      if (error.code === '23505') return Response.json({ error: 'Questo dominio è già registrato' }, { status: 409 })
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

// Gli errori di Vercel sono in inglese e parlano di progetti e account: al cliente
// serve sapere cosa deve fare lui.
function messaggioVercel(errore, dominio) {
  const t = String(errore || '')
  if (/already in use|is already assigned|domain_already_in_use/i.test(t)) {
    return `${dominio} risulta già collegato a un altro sito. Scollegalo da lì e riprova, oppure scrivici.`
  }
  if (/invalid|not a valid/i.test(t)) return `${dominio} non sembra un dominio valido.`
  if (/forbidden|not authorized/i.test(t)) return 'Non riusciamo a completare il collegamento: riprova tra poco.'
  return `Non siamo riusciti a collegare il dominio: ${t}`
}
