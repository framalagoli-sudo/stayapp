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
