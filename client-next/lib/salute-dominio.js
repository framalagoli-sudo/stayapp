// Possiamo ancora mandare i visitatori sul dominio del cliente?
//
// Sono due domande diverse che fino al 15/09/2026 dipendevano dallo stesso
// interruttore (`domini.stato`):
//   · SERVIRE il sito quando qualcuno arriva sul dominio del cliente;
//   · MANDARE la gente lì, dal nostro indirizzo, dal sottodominio, dal QR.
//
// La prima non ha bisogno di nessun controllo: se il dominio è morto non ci
// arriva nessuno, quindi non c'è niente da proteggere. E NON va spenta in
// automatico: la prova aspetta 10–15 secondi mentre una pagina a freddo ne
// impiega 9–14 (misurato il 14/09), e un falso allarme farebbe comparire la
// nostra pagina al posto del sito del cliente.
//
// La seconda invece sì: mandare qualcuno su un dominio scaduto è peggio che
// lasciarlo dov'è. Si decide qui, con una misura propria e con pazienza.
//
// ⚠️ File senza dipendenze di proposito: la regola si prova da sola, in tutti i
// casi, compresi quelli che su un dominio vero non si possono provocare.

// Tre prove fallite DI FILA, a 15 minuti una dall'altra: circa tre quarti d'ora.
// Una sola non basta a sospendere, perché un avvio a freddo può superare
// l'attesa anche con il dominio sano.
export const FALLIMENTI_PER_SOSPENDERE = 3

// Dalla salute di prima e dall'esito della prova di adesso, la salute nuova.
// `evento` dice a chi chiama se è appena successo qualcosa da raccontare.
export function prossimaSalute(prima, raggiungibile, adesso = new Date().toISOString()) {
  const precedente = prima || {}
  const eraSospeso = precedente.sospeso === true

  if (raggiungibile) {
    return {
      salute: { ok: true, fallimenti_consecutivi: 0, sospeso: false, ultima_prova: adesso, ultimo_ok: adesso },
      // Riparte alla PRIMA prova riuscita: il dominio è tornato, non c'è motivo
      // di tenere i visitatori lontani un minuto di più.
      evento: eraSospeso ? 'ripreso' : null,
    }
  }

  const fallimenti = (Number(precedente.fallimenti_consecutivi) || 0) + 1
  const sospeso = fallimenti >= FALLIMENTI_PER_SOSPENDERE
  return {
    salute: {
      ok: false,
      fallimenti_consecutivi: fallimenti,
      sospeso,
      ultima_prova: adesso,
      ultimo_ok: precedente.ultimo_ok || null,
    },
    // L'avviso parte UNA volta, nel momento in cui si sospende — non a ogni
    // giro in cui resta sospeso.
    evento: sospeso && !eraSospeso ? 'sospeso' : null,
  }
}

// Il redirect si fa? In assenza di misure — un dominio mai provato, o provato
// prima che esistesse questa regola — sì: è il comportamento di sempre.
export function redirectConsentito(salute) {
  return salute?.sospeso !== true
}
