---
name: reference-whatsapp-quale-numero
description: "Il vincolo vero di WhatsApp: un numero già su WhatsApp non si collega alle API. Le quattro strade per un cliente, la coesistenza (ora supportata in UE) e cosa fanno gli altri"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-21T05:37:41.271Z
---

**La regola di Meta, non nostra**: un numero **già attivo su WhatsApp** (anche consumer) **non si può registrare sulle Cloud API** se prima non si cancella quell'account WhatsApp. Lo chiedono identico 360dialog, Wati, respond.io, Twilio: non è una complicazione di OltreNova.

**Le quattro strade di un cliente** (20/09/2026):
1. **Ha già l'app WhatsApp Business** → **coesistenza**: tiene app e chat, e passa anche dalle API. È il caso migliore e, in Italia, il più comune fra negozi e ristoranti.
2. **Ha WhatsApp normale sul numero dell'attività** → passa a WhatsApp Business **con lo stesso numero** (gratis, chat trasferite dal backup) e rientra nel caso 1. ⚠️ **Non si torna indietro** senza perdere i dati, e le due app non convivono sullo stesso numero.
3. **Vuole il numero personale intatto** → numero nuovo **solo per le API**. Prezzo vero: **la continuità** — chi scrive al vecchio numero non arriva da noi.
4. **Non ha ancora un numero dell'attività** → numero nuovo, senza controindicazioni.

**Coesistenza, dati ufficiali Meta** (verificati sulla doc, non su blog): si spengono **messaggi effimeri**, **«visualizza una volta»** e **liste broadcast**; i **gruppi non si sincronizzano**; storico sincronizzato **180 giorni** (media 14 giorni), da completare **entro 24 ore**; throughput fisso **20 mps**; app **≥ 2.24.17**; il collegamento si interrompe dopo **~14 giorni** di inattività del dispositivo principale (~30 per i secondari). ⚠️ Il «7 giorni» che gira sui blog è **sbagliato**.

⚠️ **Allarme sollevato e rientrato**: la coesistenza **era esclusa in UE/SEE/UK**, ed è stata **abilitata verso fine 2025**. La doc Meta attuale non elenca più paesi esclusi; documentazioni di terzi (GoHighLevel, alcune guide) sono **rimaste indietro e dicono ancora di no**. Resta da **dimostrare dal vivo su un numero italiano**: rischio dichiarato, piano B = numero dedicato.

⚠️ Gli strumenti che si collegano «in due clic» spesso **non usano le API**: pilotano WhatsApp Web con un'estensione. Sembrano più semplici e fanno bannare il numero del cliente.

**Conseguenza di prodotto**: il pulsante unico «Collega WhatsApp» non può funzionare — presume che il cliente sappia in quale caso si trova. Prima del pulsante ci va **la domanda con le quattro risposte e il prezzo di ciascuna**. Bozza del testo concordata con Francesco il 20/09 (da rivedere con le sue parole).

**Da costruire perché il testo sia vero**: il webhook deve gestire **`smb_message_echoes`** (i messaggi scritti dall'app devono comparire nel pannello), **`account_update`** (obbligatorio per l'Embedded Signup) e **`message_template_status_update`** (approvazione dei modelli).

Vedi [[project_whatsapp_fase0]], [[reference_meta_app_setup]], [[reference_verifica_la_sequenza_del_fornitore]].
