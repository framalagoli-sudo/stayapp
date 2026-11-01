// Le due costanti che la sentinella condivide con i webhook che prova. Senza
// dipendenze: i webhook non devono importare la sentinella intera.

// Il tipo dell'evento di prova. Lo produce solo chi ha il segreto di firma:
// un webhook che lo riceve DOPO aver verificato la firma può fermarsi lì.
export const TIPO_PROVA_SENTINELLA = 'oltrenova.sentinella.prova'

// Il pozzo di Resend: accetta e «consegna», ma non arriva a nessuno.
export const INDIRIZZO_POZZO_SENTINELLA = 'delivered+sentinella@resend.dev'
