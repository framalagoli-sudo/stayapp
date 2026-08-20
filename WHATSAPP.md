# WhatsApp — Piano tecnico

> Stato: **piano approvato, non ancora implementato** (redatto 20/08/2026).
> Decisione presa: **strada autonoma** (Meta Tech Provider + Embedded Signup), **catalogo template nostro**.
> Origine: richiesta commerciale di Francesco, con due clienti che l'hanno chiesta esplicitamente (Garage 22, Debora Resinart).

---

## 1. Obiettivo

Il cliente deve poter fare **una cosa sola, senza sapere niente di WhatsApp**:

> scegliere una lista → scegliere un messaggio → inviare.

Tutto il resto (account, template, approvazioni, stati) deve essere invisibile o guidato.

## 2. Vincoli verificati sulla documentazione Meta

Verificati il 20/08/2026, da riverificare prima di implementare:

- **I template sono asset del singolo WABA** e non si condividono tra account diversi → *non esiste* un template unico globale per tutti i clienti.
- **I template si creano via API** (Message Templates API) → possiamo generarli noi sul WABA del cliente.
- **Con Embedded Signup il WABA appartiene al cliente**: possiede numero e dati, ha accesso a WhatsApp Manager.
- **Un WABA può contenere più numeri.**
- **Tech Provider**: servono Business Verification, App Review e Access Verification; permessi `whatsapp_business_management` e `whatsapp_business_messaging`. Limite di onboarding **10 clienti/settimana** finché le verifiche non sono complete, poi **200**.
- **Paga il cliente**: aggiunge da sé una carta al proprio account. La linea di credito riguarda i Solution Partner (percorso diverso, non il nostro).
- ⚠️ **Non verificato**: tariffe esatte per categoria e paese, tempi reali di approvazione dei template, dettagli di rifatturazione per Solution Partner. Da chiarire con Meta se serviranno.

## 3. Architettura

```
Cliente (Garage 22)
 └── WABA suo (Embedded Signup)      ← possiede numero, dati e fatturazione
      ├── numero verificato
      └── template creati DA NOI via API dal nostro catalogo
OltreNova
 ├── catalogo template versionato (nostro, unico per tutti i clienti)
 ├── motore campagne (riusa il modello newsletter: liste, batch, cron)
 └── webhook esiti (consegnato / letto / fallito) + risposte in ingresso
```

**Il "template unico" si realizza così**: il catalogo è nostro e uguale per tutti; al collegamento del numero i template vengono creati sul WABA del cliente e mandati in approvazione. Il cliente non scrive mai un template: sceglie e riempie le variabili.

**Perché non un WABA nostro con dentro i numeri dei clienti**: saremmo responsabili della condotta di tutti, e un cliente che se ne va porterebbe via un pezzo del nostro account. La proprietà al cliente è più sana anche legalmente.

## 4. Modello dati (migration da scrivere)

```sql
-- Collegamento del numero, per azienda
whatsapp_account
  id, azienda_id, waba_id, phone_number_id, numero_visualizzato,
  stato ('da_collegare'|'in_verifica'|'attivo'|'sospeso'),
  access_token_cifrato, quality_rating, limite_messaggi,
  collegato_il, ultima_verifica, dettaglio jsonb

-- Copie dei nostri template sul WABA del cliente + stato approvazione
whatsapp_template
  id, azienda_id, catalogo_key, catalogo_versione, lingua,
  template_meta_id, stato ('in_attesa'|'approvato'|'rifiutato'),
  motivo_rifiuto, created_at, updated_at

-- Campagne (specchio di newsletter)
whatsapp_campagna
  id, azienda_id, entity_tipo, entity_id, nome,
  catalogo_key, variabili jsonb, tag_filter text[],
  stato ('bozza'|'programmata'|'in_corso'|'completata'|'annullata'),
  programmata_per, destinatari_totali, inviati, consegnati, letti, falliti,
  costo_stimato, created_at

-- Un record per destinatario: è il registro che serve quando qualcosa va storto
whatsapp_messaggio
  id, azienda_id, campagna_id, contatto_id, telefono,
  message_id_meta, stato, errore, inviato_il, consegnato_il, letto_il

-- Consenso, sul contatto esistente
contatti += whatsapp_optin boolean default false,
            whatsapp_optin_il timestamptz,
            whatsapp_optin_fonte text,
            whatsapp_optout_il timestamptz
```

Regole non negoziabili: token **cifrato**, mai in chiaro e mai esposto al client; ogni tabella scopata per `azienda_id` con i controlli applicativi di sempre (`SECURITY.md` §0); grant e RLS come da nota 19 di `CLAUDE.md`.

## 5. Catalogo template (il cuore)

Nostro, versionato in `lib/whatsapp-catalogo.js`, con variabili al posto dei dati.
Partenza suggerita — pochi e utili, tarati sui verticali che abbiamo:

| chiave | categoria Meta | quando | variabili |
|---|---|---|---|
| `promemoria_appuntamento` | utility | 24h prima | nome, data, ora, luogo |
| `preventivo_pronto` | utility | preventivo emesso | nome, link |
| `nuovo_in_vetrina` | marketing | nuovi elementi vetrina | nome, titolo, link |
| `richiesta_recensione` | utility | dopo il servizio | nome, link |
| `riattivazione` | marketing | inattività (es. 12 mesi) | nome, offerta |

Cinque fatti bene valgono più di venti generici. Le migliorie al testo si fanno una volta e si ridistribuiscono a tutti (nuova versione → nuovo template sui WABA).

## 6. Flussi

**Collegamento numero** — pagina *Impostazioni → WhatsApp*: pulsante "Collega WhatsApp" → Embedded Signup di Meta → al ritorno salviamo `waba_id` e `phone_number_id`, creiamo i template dal catalogo, mostriamo lo stato di ciascuno. Il cliente deve inserire la carta sul proprio account: va spiegato **prima**, non dopo, altrimenti si blocca lì.

**Consenso** — casella dedicata e separata nei form pubblici e nella vetrina ("voglio ricevere aggiornamenti su WhatsApp"), salvata in `whatsapp_optin` con data e fonte. Revoca sempre possibile, come per la newsletter. **Da fare subito, prima del canale**: se iniziamo a raccoglierlo ora, quando il canale sarà pronto le liste saranno utilizzabili.

**Campagna** — scegli lista (tag) → scegli messaggio dal catalogo → compila variabili → anteprima reale → **stima costo** → invia o programma. Invio a blocchi riusando lo schema di `newsletter-send.js`, con lo stesso cron.

**Esiti** — webhook Meta → aggiorna `whatsapp_messaggio` → contatori sulla campagna. Un numero con qualità in calo va segnalato al cliente **prima** che Meta lo limiti.

## 7. Da costruire

- `lib/whatsapp.js` — unico punto di contatto con l'API Meta (stesso principio di `lib/vercel-domains.js`: nessun'altra parte del codice parla con Meta)
- `lib/whatsapp-catalogo.js` — il catalogo versionato
- `lib/whatsapp-send.js` — invio campagne a blocchi (gemello di `newsletter-send.js`)
- `app/api/whatsapp/{connect,templates,campagne,webhook}/route.js`
- `app/api/cron/whatsapp/route.js` — campagne programmate + ricontrollo stato template e qualità numero
- `components/admin/WhatsAppPage.jsx` — collegamento, template, campagne
- **`components/admin/ContattiImport.jsx` + `app/api/contatti/import`** — import CSV con assegnazione lista
- Sonda `tests/probe-whatsapp.mjs` — verifica dal vivo, come per domini e passkey

## 8. Fasi, e cosa è vendibile quando

| Fase | Contenuto | Vendibile |
|---|---|---|
| **0** | Import CSV + consenso WhatsApp nei form | "prepara le tue liste" — utile da subito, serve in ogni scenario |
| **1** | Collegamento numero + catalogo template + stato | "collega il tuo WhatsApp" |
| **2** | Campagne su lista + esiti + stima costi | **è la funzione che hanno chiesto i clienti** |
| **3** | WhatsApp come canale delle automazioni esistenti | promemoria e recensioni automatici |
| **4** | Risposte in arrivo (finestra 24h), inbox | conversazioni, non solo invii |

La fase 0 non dipende da Meta: si può fare mentre la verifica è in corso. **La fase lunga è la verifica Meta, non il codice.**

## 9. Rischi da tenere a vista

- **Il numero del cliente può essere limitato o bloccato** se i destinatari segnalano i messaggi. Consenso raccolto bene e testi curati sono la difesa; la qualità del numero va mostrata nel pannello.
- **Attrito onboarding**: verifica business + carta. È il punto dove si perdono i clienti: va accompagnato, non lasciato a un link.
- **Limite 10 clienti/settimana** finché le verifiche non sono complete.
- **Costo per messaggio a carico del cliente**: va mostrato *prima* dell'invio, altrimenti arriva la sorpresa in fattura e la colpa la danno a noi.

## 10. Cosa serve da Francesco

1. Avviare **Business Verification** e **App Review** su Meta (parte lunga, indipendente da noi).
2. Decidere se il modulo WhatsApp è incluso nel piano o è un supplemento.
3. Un cliente pilota: **Garage 22** — l'ha chiesto, ha acquisti ripetuti e il dominio già collegato.
