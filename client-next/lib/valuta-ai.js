// Il credito AI si legge e si imposta in euro, ma si conta in dollari: Anthropic
// fattura in dollari e il costo di ogni chiamata nasce dal suo listino. Il
// database resta in dollari (`costo_usd`, `ai_budget_mensile_usd`, `ai_extra_usd`)
// e l'euro è solo il modo in cui le cifre entrano ed escono dal pannello.
//
// ⚠️ File senza dipendenze: lo importano anche le pagine del pannello, che sono
// codice di browser. Non importare qui niente che tocchi `supabaseAdmin`.

// Cambio BCE del 16/09/2026. Fisso di proposito: un tetto che cambia da solo
// col mercato non è un tetto. Da aggiornare a mano se il cambio si sposta molto.
export const USD_PER_EUR = 1.1537

const centesimi = n => Math.round(n * 100) / 100

export const euroDaDollari = usd => centesimi(Number(usd) / USD_PER_EUR)
export const dollariDaEuro = eur => centesimi(Number(eur) * USD_PER_EUR)

// Sotto i dieci centesimi servono tre decimali, altrimenti una spesa vera si legge «0,00 €».
export function formatoEuro(usd) {
  const eur = Number(usd) / USD_PER_EUR
  const decimali = eur > 0 && eur < 0.1 ? 3 : 2
  // regola-ok: formatta un numero, non una data — il fuso orario non entra in gioco
  return eur.toLocaleString('it-IT', { minimumFractionDigits: decimali, maximumFractionDigits: decimali }) + ' €'
}
