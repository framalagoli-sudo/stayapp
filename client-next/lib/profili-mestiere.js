import { FUNZIONI, FUNZIONI_AZIENDA } from '@/lib/funzioni'

// I profili di mestiere: cosa un cliente nuovo si trova acceso il primo giorno
// (STRATEGIA.md §6.1). Qui la sola regola di cosa un profilo può contenere;
// le route in app/api/admin/profili la applicano prima di scrivere.
//
// ⚠️ Tutto ciò che arriva dal browser passa da un catalogo chiuso: una chiave
// di funzione che non esiste in lib/funzioni.js non entra, un tipo che non è
// uno dei tre non entra. Il profilo finirà, nella fase F3, dentro le entità dei
// clienti: quello che non si ferma qui arriverebbe fino a loro.

export const TIPI_ENTITA = ['struttura', 'ristorante', 'attivita']

// Le funzioni di entità «sempre» accese (Informazioni, Sito, Assistente) non si
// scelgono: sono l'ossatura.
export const CHIAVI_ENTITA = FUNZIONI.filter(f => !f.sempre).map(f => f.chiave)
export const CHIAVI_AZIENDA = FUNZIONI_AZIENDA.map(f => f.chiave)

export const COLONNE_PROFILO = 'id, chiave, nome, descrizione, tipo_entita, funzioni_entita, funzioni_azienda, ordine, versione, updated_at'

// Solo le chiavi del catalogo, e solo quelle accese: un profilo dice cosa si
// accende, e «spento» è l'assenza della chiave.
function soloAccese(valore, ammesse) {
  if (!valore || typeof valore !== 'object' || Array.isArray(valore)) return null
  const out = {}
  for (const [k, v] of Object.entries(valore)) {
    if (!ammesse.includes(k)) return null
    if (typeof v !== 'boolean') return null
    if (v) out[k] = true
  }
  return out
}

// Restituisce { dati } pronti per il database, oppure { errore }.
// `nuovo` = creazione: allora la chiave è obbligatoria (dopo non si cambia).
export function validaProfilo(body, { nuovo }) {
  if (!body || typeof body !== 'object') return { errore: 'Dati mancanti' }
  const dati = {}

  if (nuovo) {
    if (typeof body.chiave !== 'string' || !/^[a-z0-9_]{2,40}$/.test(body.chiave)) {
      return { errore: 'La chiave va scritta in minuscolo, con lettere, numeri e trattini bassi (2–40 caratteri)' }
    }
    dati.chiave = body.chiave
  }
  if (nuovo || 'nome' in body) {
    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    if (!nome || nome.length > 60) return { errore: 'Il nome è obbligatorio, al massimo 60 caratteri' }
    dati.nome = nome
  }
  if ('descrizione' in body) {
    const d = typeof body.descrizione === 'string' ? body.descrizione.trim() : null
    if (d === null || d.length > 300) return { errore: 'La descrizione è al massimo di 300 caratteri' }
    dati.descrizione = d
  }
  if (nuovo || 'tipo_entita' in body) {
    if (!TIPI_ENTITA.includes(body.tipo_entita)) return { errore: 'Tipo di entità non valido' }
    dati.tipo_entita = body.tipo_entita
  }
  if ('funzioni_entita' in body) {
    const f = soloAccese(body.funzioni_entita, CHIAVI_ENTITA)
    if (!f) return { errore: 'Funzioni dell\'entità non valide' }
    dati.funzioni_entita = f
  }
  if ('funzioni_azienda' in body) {
    const f = soloAccese(body.funzioni_azienda, CHIAVI_AZIENDA)
    if (!f) return { errore: 'Funzioni dell\'azienda non valide' }
    dati.funzioni_azienda = f
  }
  if ('ordine' in body) {
    if (!Number.isInteger(body.ordine) || body.ordine < 0 || body.ordine > 10000) return { errore: 'Ordine non valido' }
    dati.ordine = body.ordine
  }
  return { dati }
}
