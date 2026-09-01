// Su quale canale esce un messaggio automatico.
//
// ⚠️ Email e WhatsApp NON sono due modi di mandare lo stesso testo. Su WhatsApp
// un messaggio che parte da noi — non una risposta a chi ci ha scritto — deve
// usare un **template approvato da Meta**: il testo libero che il cliente scrive
// nell'automazione lì non può viaggiare. Non è una nostra limitazione, è la
// condizione per poter scrivere a qualcuno su WhatsApp senza farsi segnalare.
//
// Perciò uno step con canale WhatsApp non porta un testo: porta la **scelta di
// quale messaggio del catalogo** usare (`wa_template`). I buchi del template si
// riempiono dalle stesse variabili dell'automazione.
//
// ⚠️ Nessun import di `supabaseAdmin` da qui: questo file lo legge il browser.

export const CANALI = [
  { key: 'email',    label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'entrambi', label: 'Email e WhatsApp' },
]

// Le righe di coda da creare per uno step. «Entrambi» ne fa due: partono,
// falliscono e si leggono separatamente — se il numero non è collegato deve
// arrivare comunque l'email, non perdersi tutt'e due.
export function canaliDelloStep(step) {
  const c = step?.canale || 'email'
  if (c === 'whatsapp') return ['whatsapp']
  if (c === 'entrambi') return ['email', 'whatsapp']
  return ['email']
}

// I valori del template, nell'ordine in cui compaiono nel testo.
//
// ⚠️ Un buco lasciato vuoto non è un dettaglio estetico: Meta rifiuta l'invio se
// il numero dei valori non torna, e un «Ciao , ti aspettiamo il  alle » sarebbe
// comunque un messaggio che il cliente non vorrebbe aver mandato. Per questo
// ogni chiave ha un ripiego, e chi non ne ha uno sensato torna stringa vuota
// **dichiarando** il buco a chi chiama.
export function valoriTemplate(template, vars = {}, { nomeEntita = '' } = {}) {
  const mancanti = []
  const valori = (template?.variabili || []).map(v => {
    let valore = vars[v.chiave]
    if (!valore && v.chiave === 'luogo') valore = vars.servizio || nomeEntita
    if (!valore && v.chiave === 'link')  valore = vars.link_recensione || vars.link
    if (!valore) mancanti.push(v.chiave)
    // Meta rifiuta i valori con a capo o doppi spazi: il testo di una variabile
    // arriva da un campo libero, quindi si appiattisce sempre.
    return String(valore ?? '').replace(/\s+/g, ' ').trim()
  })
  return { valori, mancanti }
}
