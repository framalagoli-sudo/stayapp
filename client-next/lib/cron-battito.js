import { supabaseAdmin } from '@/lib/supabase-server'
import { logError } from '@/lib/observability'

// Accorgersi di un processo che ha smesso di girare.
//
// `logError` avvisa quando un cron FALLISCE. Il guasto peggiore però è l'altro:
// quello che non parte più. Nessuno lancia un'eccezione se una funzione non
// viene mai chiamata — è così che il webhook dei rimbalzi è rimasto muto per 45
// giorni senza che nessuno lo sapesse.
//
// Il meccanismo: ogni processo lascia un segno quando ha lavorato, e chiunque
// giri dopo controlla che gli altri non siano fermi. Non serve un guardiano
// dedicato: basta che UNO qualsiasi dei processi sia vivo per accorgersi degli
// altri. Se tacciono tutti insieme siamo davanti a un guasto della piattaforma,
// che si nota per altre vie.

export async function registraBattito(nome, esito = 'ok') {
  // Non lancia mai: l'osservabilità non deve rompere il processo che osserva.
  // Il contatore non è atomico ed è giusto così — serve a farsi un'idea, non a
  // tenere la contabilità, e un pezzo in più sarebbe un pezzo in più da rompere.
  try {
    const { data } = await supabaseAdmin.from('cron_battiti').select('esecuzioni').eq('nome', nome).maybeSingle()
    await supabaseAdmin.from('cron_battiti').upsert({
      nome, ultimo_ok: new Date().toISOString(),
      esecuzioni: (data?.esecuzioni || 0) + 1, ultimo_esito: esito,
    }, { onConflict: 'nome' })
  } catch {}
}

// Restituisce i processi fermi da più della loro soglia. Usata sia per avvisare
// sia per mostrarne lo stato nel pannello.
export async function processiFermi() {
  const { data, error } = await supabaseAdmin.from('cron_battiti').select('*')
  if (error || !data) return []
  const ora = Date.now()
  return data
    .map(r => ({ ...r, fermoDaMinuti: Math.floor((ora - new Date(r.ultimo_ok).getTime()) / 60000) }))
    .filter(r => r.fermoDaMinuti > r.soglia_minuti)
}

// Chiamata dai cron dopo aver registrato il proprio battito: se qualcun altro è
// fermo, avvisa. L'avviso è deduplicato a uno all'ora per processo da logError,
// quindi si può chiamare anche da un cron che gira ogni minuto.
export async function controllaAltriProcessi(nomeChiamante) {
  try {
    for (const p of await processiFermi()) {
      if (p.nome === nomeChiamante) continue
      await logError(`cron-fermo/${p.nome}`,
        `Il processo "${p.nome}" non gira da ${p.fermoDaMinuti} minuti (soglia: ${p.soglia_minuti}). Ultima esecuzione riuscita: ${new Date(p.ultimo_ok).toLocaleString('it-IT')}.`,
        { alert: true })
    }
  } catch {}
}

// Da chiamare a fine esecuzione riuscita: registra il proprio battito e dà
// un'occhiata agli altri.
export async function battitoEControllo(nome) {
  await registraBattito(nome)
  await controllaAltriProcessi(nome)
}
