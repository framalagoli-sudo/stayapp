import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'

// Chi ha comprato: ricavato dagli ordini, non da una tabella nuova.
//
// ⛔ Perché nessuna tabella `clienti_shop`: **ce n'è già una** — `contatti`, il
// CRM. Una seconda anagrafica sarebbe la classica seconda porta per la stessa
// stanza: due elenchi da tenere allineati, due posti dove cercare la stessa
// persona, e al primo disallineamento nessuno sa più quale sia quello giusto.
//
// È anche il modo in cui funziona Shopify: *Customers* non è un archivio che si
// compila a mano, è la conseguenza degli ordini. Chi compra diventa un cliente
// perché ha comprato.
//
// Qui si raggruppa per **email**, che è l'unica cosa che un ordine ha sempre, e
// si aggiunge il collegamento al contatto CRM dove esiste — così dalla scheda
// del cliente si arriva alla sua storia completa, non solo agli acquisti.

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response

    // ⚠️ `requireAuth` restituisce l'utente, **non** il profilo: il ruolo e
    // l'azienda si caricano a parte. Darlo per scontato qui avrebbe prodotto un
    // elenco sempre vuoto senza nessun errore — il guasto peggiore, quello che
    // sembra «non ci sono ancora clienti».
    const profile = await getProfile(user.id)
    const { searchParams } = new URL(request.url)
    const azienda_id = resolveAziendaId(profile, searchParams.get('azienda_id'))
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    // ⚠️ Solo le colonne che servono a fare i conti. `indirizzo` e `note_admin`
    // restano fuori: in un elenco non si mostrano, e ciò che non esce non si
    // può perdere.
    const { data: ordini, error } = await supabaseAdmin.from('ordini')
      .select('id, numero, email_cliente, nome_cliente, telefono_cliente, totale, stato, pagamento_stato, created_at')
      .eq('azienda_id', azienda_id)
      .order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const per = new Map()
    for (const o of ordini || []) {
      const email = (o.email_cliente || '').trim().toLowerCase()
      if (!email) continue
      if (!per.has(email)) {
        per.set(email, {
          email, nome: o.nome_cliente || '', telefono: o.telefono_cliente || '',
          ordini: 0, speso: 0, ultimo_ordine: o.created_at, primo_ordine: o.created_at,
          ultimo_numero: o.numero, contatto_id: null,
        })
      }
      const c = per.get(email)
      c.ordini += 1
      // ⚠️ Si somma **solo ciò che è stato incassato davvero**. Contare anche
      // gli ordini non pagati gonfierebbe il totale speso, e quel numero è
      // quello su cui un cliente decide chi trattare bene: dev'essere vero.
      if (o.pagamento_stato === 'pagato' || o.stato === 'pagato') c.speso += Number(o.totale) || 0
      // Gli ordini arrivano dal più recente: il primo visto è l'ultimo fatto.
      if (o.created_at < c.primo_ordine) c.primo_ordine = o.created_at
      if (!c.nome && o.nome_cliente) c.nome = o.nome_cliente
      if (!c.telefono && o.telefono_cliente) c.telefono = o.telefono_cliente
    }

    // Il collegamento al CRM, dove la persona c'è già.
    const email = [...per.keys()]
    if (email.length) {
      const { data: contatti } = await supabaseAdmin.from('contatti')
        .select('id, email').eq('azienda_id', azienda_id).in('email', email)
      for (const c of contatti || []) {
        const riga = per.get((c.email || '').trim().toLowerCase())
        if (riga) riga.contatto_id = c.id
      }
    }

    const elenco = [...per.values()].sort((a, b) => (b.ultimo_ordine || '').localeCompare(a.ultimo_ordine || ''))
    return Response.json(elenco)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
