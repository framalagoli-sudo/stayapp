# Posta in uscita — piano tecnico

> Stato: **da fare**, deciso con Francesco il 20/11/2026.
> Principio guida (lo stesso di `REGISTRAR.md`): **nessun vincolo a un singolo fornitore**.
> Un'interfaccia unica per spedire, i fornitori sotto, intercambiabili con un'impostazione.

---

## 1. Perché

Il 19/11/2026 Resend ha scritto: *«You have reached 100% of your daily quota of 100 emails»*.
Garage 22 aveva mandato due newsletter a undici minuti di distanza: 53 + 55 = 108 destinatari.

- Il piano gratuito di Resend ha **un tetto unico per tutta la piattaforma**: 100 email al giorno
  (e, secondo fonti di terzi, 3.000 al mese). Lo consumano **insieme** newsletter, conferme di
  prenotazione, link di pagamento, avvisi dei moduli, reset password, allarmi.
- Quando è pieno **si ferma tutto, per tutti i clienti**: la newsletter di uno può impedire al
  titolare di un altro di ricevere gli avvisi dei suoi moduli. Da noi non si vede nessun errore.
- Il rischio più grande non è il costo ma la **reputazione**: una lista sporca (rimbalzi,
  segnalazioni di spam) può far sospendere l'account, e l'account è uno solo.
- Resend Pro (circa 20 $/mese) toglie il tetto giornaliero, ma Francesco non vuole un costo fisso
  in più finché a mandare newsletter è un cliente solo.

Resend è entrato il 28/04/2026 (primo commit che manda email) perché era gratis e veloce da
collegare; il tetto unico non era stato valutato.

## 2. La decisione

1. **Un'interfaccia unica per spedire**: `lib/posta/` (nome indicativo). Nessun altro file del
   codice parla con un fornitore di posta.
2. **Due implementazioni sotto**: Resend e **Amazon SES**.
3. **Due flussi**, ognuno col suo fornitore scelto da un'impostazione su Vercel:
   - **servizio** (conferme, link di pagamento, avvisi, moduli, reset, allarmi, sentinella)
     → resta su **Resend gratis**: senza newsletter, 100 al giorno avanzano;
   - **newsletter** → **Amazon SES**, a consumo (circa 0,10 $ ogni 1.000 email).
4. Il giorno in cui la posta di servizio supera il tetto (es. più di 100 richieste al giorno dai
   moduli — vuol dire decine di clienti paganti), si sposta anche quella su SES **cambiando
   l'impostazione**, oppure si paga Resend Pro: si decide allora, coi numeri di allora.
5. Vantaggi in più: le due reputazioni sono separate (una newsletter finita male non ferma le
   conferme) e c'è una **riserva** se un fornitore si blocca o ci sospende.

## 3. Amazon SES — cosa sappiamo (da riverificare prima di implementare)

- **Solo a consumo**, nessun abbonamento. Addebito a fine mese sulla carta dell'account AWS: il
  credito non si compra in anticipo. Si imposta un **avviso di spesa** (AWS Budgets, es. 5 $).
- Il piano gratuito per i nuovi account non è affidabile (fonti discordi): non conta, il costo è
  di centesimi.
- Ha quello che usiamo: invio, DKIM/SPF, rimbalzi e reclami, aperture e clic (configuration set
  con pubblicazione degli eventi), lista di soppressione, intestazioni personalizzate
  (`List-Unsubscribe`). Regione europea (Irlanda o Milano) per il GDPR.
- Manca la comodità: nessun elenco delle singole email inviate nel pannello, pannello AWS
  complicato.
- All'inizio **sandbox** (solo indirizzi verificati, pochi invii al giorno): va chiesta l'uscita
  ad AWS spiegando come raccogliamo i consensi. Può richiedere un giorno, e può essere rifiutata.
- Indirizzi di test: il «mailbox simulator» di AWS (es. `success@simulator.amazonses.com`), al
  posto di `delivered@resend.dev`.

## 4. I passi

**Francesco**
1. Crea l'account AWS con la carta (Ettore guida passo passo).
2. Manda la richiesta di uscita dalla sandbox (la scrive Ettore).

**Ettore**
1. Utente AWS (IAM) con il **solo permesso di inviare** — nient'altro. Chiavi su Vercel.
2. Sottodominio dedicato alle newsletter, record DNS su Cloudflare. ⛔ **Non toccare** i record di
   Resend (`send`, `resend._domainkey`, `_dmarc`) né gli MX di Cloudflare per `info@`.
3. `lib/posta/`: interfaccia + implementazione Resend (il codice di oggi spostato) + SES. Oggi
   parlano con Resend `lib/send-email.js`, `lib/newsletter-send.js`,
   `lib/automazioni-scheduler.js`, `lib/sentinella.js`.
4. Eventi di ritorno da SES (SNS o EventBridge, **con verifica della firma**): consegne, rimbalzi,
   reclami, aperture, clic → stessi effetti del webhook Resend di oggi (`email_non_valida`,
   `lib/newsletter-statistiche.js`). La colonna `resend_id` va generalizzata (id del messaggio +
   fornitore).
5. Disiscrizione: `List-Unsubscribe` + `List-Unsubscribe-Post` su www anche da SES (nota 56).
6. **Tetto newsletter per azienda**, sullo schema del credito AI (nota 37): predefinito +
   su misura + ricarica valida solo per il mese, gestiti da Aziende (solo super_admin); il cliente
   vede «X su Y questo mese»; una newsletter che sforerebbe non parte (né a metà); email a
   Francesco all'80% e al 100%. Valore predefinito proposto: 1.000 destinatari/mese (da decidere).
   Le email di servizio **non** hanno tetto.
7. **Freno di reputazione**: rimbalzi o segnalazioni oltre soglia (indicativo: >5% rimbalzi,
   >1 segnalazione su 1.000) → le newsletter di quell'azienda si fermano finché Francesco non
   sblocca, con allarme.
8. **Allarme sul totale della piattaforma** all'80% di quanto incluso nel piano del fornitore.
9. Sentinella: una prova per ogni fornitore attivo.
10. Prove: ogni tipo di email di servizio, una per una, con gli indirizzi di test, prima del
    deploy; newsletter con il simulatore di AWS. Nessuna email a persone vere.

Stima: due o tre giorni di lavoro più le prove.

## 5. Nel frattempo

- Newsletter ancora su Resend gratis: chiedere a Garage 22 **al massimo una newsletter al giorno**.
- Aperture e clic: il tracciamento sul dominio Resend non si accende (sarebbe da rifare su SES, e
  su Resend è legato alla scelta di Forge — vedi `DA_FARE.md`, C1).
- L'avviso di Resend su **Forge** (nuovo motore di invio) si ignora finché non si decide il
  passaggio: tocca i record `send`.
