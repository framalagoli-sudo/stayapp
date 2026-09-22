// «Questa persona ha pagato?» — una risposta sola, con le stesse parole ovunque.
//
// ⛔ Il 22/09/2026, primo incasso vero di Garage 22: Agnese paga 1 € per un
// posto, il webhook di Stripe arriva, il database segna `pagamento_stato:
// pagato`. Nel pannello la riga mostrava `€1` **e basta**: identica alla riga di
// chi pagherà sul posto. Il dato c'era e non lo disegnava nessuno.
//
// Parole di Francesco: «nella piattaforma che succede? nulla».
//
// Il vocabolario esisteva già, ma **solo dentro `ShopPage`**: una scala di stati
// scritta in un componente è una scala che gli altri due punti in cui si incassa
// non hanno. Ora sta qui, e chi incassa la importa.
//
// ⚠️ File di sola presentazione: nessun import che tocchi `supabaseAdmin`, o se
// lo trascina nel bundle del browser (regola 5).

const SCALA = {
  pagato:       { label: 'Pagato',       color: '#276749', bg: '#f0fff4', bordo: '#c6f6d5' },
  non_pagato:   { label: 'Da pagare',    color: '#b7791f', bg: '#fffbeb', bordo: '#feebc8' },
  rimborsato:   { label: 'Rimborsato',   color: '#718096', bg: '#f7fafc', bordo: '#e2e8f0' },
  sul_posto:    { label: 'Paga sul posto', color: '#4a5568', bg: '#f7fafc', bordo: '#e2e8f0' },
}

/**
 * Come si chiama lo stato di questo incasso.
 *
 * ⚠️ `non_richiesto` non vuol dire «non pagato»: vuol dire che per questa cosa
 * non abbiamo chiesto soldi online. Se c'è un importo si paga sul posto, se non
 * c'è è gratis — e «gratis» lo dice già la cifra accanto, quindi qui **niente**.
 * Mettere «Da pagare» su un evento gratuito sarebbe una richiesta inventata.
 */
export function statoPagamento(riga) {
  const stato = riga?.pagamento_stato
  const importo = Number(riga?.total_amount ?? riga?.importo_totale ?? riga?.totale ?? 0) || 0
  if (stato === 'pagato' || stato === 'rimborsato' || stato === 'non_pagato') return SCALA[stato]
  // `non_richiesto`, null, o una colonna che una risposta in cache non ha ancora.
  return importo > 0 ? SCALA.sul_posto : null
}

export default function StatoPagamento({ riga, importo = null, compatto = false }) {
  const s = statoPagamento(riga)
  if (!s) return null
  // Sul «Pagato» la cifra sta dentro la pastiglia: è l'informazione che si
  // cerca, e tenerla staccata obbliga a incrociare due punti della riga.
  const testo = s === SCALA.pagato && importo > 0 ? `${s.label} €${Number(importo).toFixed(2)}` : s.label
  return (
    <span style={{
      display: 'inline-block',
      padding: compatto ? '2px 7px' : '3px 9px',
      borderRadius: 999,
      fontSize: compatto ? 11 : 11.5,
      fontWeight: 700,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.bordo}`,
      whiteSpace: 'nowrap',
    }}>{testo}</span>
  )
}
