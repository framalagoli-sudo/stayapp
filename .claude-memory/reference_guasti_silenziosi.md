---
name: reference_guasti_silenziosi
description: "Il guasto peggiore è quello che non grida: try/catch non intercetta un processo che smette di girare. Battito dei cron (migr. 077), alert su tutti i cron, pagina /admin/diagnostica"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-24T10:49:53.248Z
---

Il filo che lega tre scoperte del 23-24/08/2026: **le cose si rompono in silenzio e nessuno se ne accorge**.

- Il webhook dei rimbalzi di Resend è rimasto muto **45 giorni**.
- Il chatbot rispondeva *"Entità non trovata"* a qualsiasi domanda su **due verticali su tre** (colonne inesistenti nella select) — probabilmente da sempre.
- Il backup girava, ma se avesse smesso nessuno l'avrebbe saputo fino al giorno in cui servivano i dati.

## Le due forme del guasto, e perché servono due difese

**Quando qualcosa fallisce** → `logError(source, err, { alert: true })` manda un'email (deduplicata a 1/ora per sorgente, così un errore ricorrente non diventa un diluvio). Ora lo fanno **tutti e sei i cron**: prima due su sei scrivevano solo in console e il backup nemmeno quello.

**Quando qualcosa smette di girare** → qui `try/catch` è cieco: *nessuno lancia un'eccezione se una funzione non viene mai chiamata*. Serve accorgersi di un'**assenza**. Soluzione (migration 077, `lib/cron-battito.js`): ogni processo lascia un segno quando ha lavorato, e **chiunque giri dopo controlla che gli altri non siano fermi** oltre la propria soglia. Non serve un guardiano dedicato — basta che uno qualsiasi sia vivo. Se tacciono tutti insieme è un guasto della piattaforma, che si nota per altre vie.

Soglie generose rispetto alla cadenza (newsletter 15 min, backup 30 ore): meglio accorgersi tardi che avere falsi allarmi a ogni rallentamento di Vercel.

## Dove si guarda

`/admin/diagnostica` (solo super_admin): dove arrivano gli allarmi + pulsante per **provarli davvero**, battito dei processi, uso reale dei moduli, errori recenti. Gli allarmi vanno a `fra.malagoli@gmail.com` via `DEMO_NOTIFY_EMAIL` (ripiego di `ERROR_ALERT_EMAIL`); verificato che arrivano davvero.

⚠️ Sullo storico errori la pagina dice esplicitamente che **non viene conservato**: una lista vuota si leggerebbe come "nessun errore" mentre significa "non li registriamo" — lo stesso inganno che stiamo eliminando.

## Il giro periodico

`tests/probe-e-vivo.mjs` percorre le funzioni con i dati veri e distingue **viva / spenta (nessun dato: non è un guasto) / rotta**. È il giro che avrebbe trovato il chatbot mesi prima. Da rilanciare ogni tanto, non solo dopo i deploy.

Vedi [[reference_webhook_url_www]], [[reference_email_resend]], [[project_check_sicurezza_punto_A]].

## Terza forma: la dipendenza che può non esserci (09/09/2026)

`lib/upload-helper.js` importava **sharp** senza che nessuno lo dichiarasse:
arrivava come `optionalDependency` di Next, e nel lock era `"optional": true`.
**Optional vuol dire che npm la salta senza errore** — piattaforma non
supportata, binari nativi, `--omit=optional` — uscendo con codice 0. Il
`try/catch` in `comprimi()` avrebbe pubblicato gli originali scrivendo una riga
su console: le foto dei clienti di nuovo da megabyte, e niente che gridasse.
Ora sta in `dependencies`.

⚠️ **Un import fallito resta appiccicato al processo**: l'istanza che sbaglia
una volta continua a pubblicare originali finché non viene riciclata. Visto dal
vivo mentre si rimetteva sharp al suo posto — il dev server continuava a servire
PNG finché non è stato riavviato.

⚠️ **Una sonda non deve dipendere da ciò che verifica.** Il primo tentativo di
`probe-compressione-immagini.mjs` usava sharp per costruire la foto di prova e
per misurare il risultato: togliendo sharp è morta la sonda invece del server,
e del guasto non ha detto niente. Riscritta senza — il PNG si costruisce con
`zlib`, le dimensioni del WebP si leggono dall'header a mano. **Controprova
eseguita**: senza sharp la route risponde **200** e pubblica un PNG 2400×1800
identico all'originale, e la sonda segnala 4 problemi. Una sonda mai vista
fallire non è ancora una sonda — vedi [[reference_sonda_misura_sbagliata]].
