# Registrazione domini — piano tecnico

> Stato: **da fare**, priorità alta (redatto 23/08/2026).
> Principio guida deciso con Francesco: **nessun vincolo a un singolo fornitore**. Si sceglie un partner quando sarà il momento; il codice non deve accorgersene.

---

## 1. Perché conta più di quanto sembri

Non è "vendere domini": è **togliere l'unico passaggio dell'onboarding che dipende da terzi**.

Oggi sito, AI builder e contenuti funzionano. Ciò che blocca la messa online è il DNS, che sta a casa di qualcun altro — e il cliente deve entrarci e capire cosa fare. Prova provata: **Fondaco Narni** ha il sito pronto e l'indirizzo senza `www` fermo da giorni, in attesa che qualcuno metta un record su SiteGround. **Garage 22** ha impiegato giorni per lo stesso motivo.

Se il dominio lo registriamo noi, il DNS è nostro e in automatico:

- il sito va online in **minuti**, senza istruzioni al cliente
- apex e `www` li configuriamo noi: il caso Fondaco Narni sparisce
- l'**inoltro email** (`info@suodominio.it` → la sua casella) diventa quasi gratis, perché controlliamo i record
- certificato, redirect, sottodomini: tutto senza chiedergli niente

È il pezzo mancante dell'onboarding "Inizia qui": *scegli il nome → lo registriamo → sei online*, senza mai pronunciare la parola DNS.

## 2. Cosa è verificato (23/08/2026)

Sulla documentazione Cloudflare, da riverificare prima di implementare:

- **Esiste la Registrar API** (beta): `search` (nomi candidati da una parola), `check` (disponibilità + prezzo in tempo reale), `register`.
- **Non ci sono** ancora nell'API: **rinnovi**, trasferimenti, aggiornamento contatti → si fanno a mano dal pannello.
- Servono: token con permessi Registrar, profilo di fatturazione, **contatto intestatario predefinito** sull'account, accettazione della Domain Registration Agreement.
- Prezzi **a costo**: nessun ricarico, nessuna tariffa-civetta del primo anno (a differenza di Aruba e GoDaddy).
- ⚠️ **Il `.it` NON è supportato**, e nemmeno `.eu`, `.de`, `.fr`, `.es`. Dei country-code europei c'è in pratica solo `.uk`. Cloudflare dichiara di volerli aggiungere, senza date.
- ⚠️ Chi registra lì resta **vincolato ai nameserver Cloudflare**.

Per confronto: **Vercel** vende domini via CLI/API (`.com` a 11,25 $) ma **neanche lui fa i `.it`**.

**Conseguenza**: per i nostri clienti — officine, ristoranti, artigiane in Umbria — il `.it` è la richiesta *normale*, non l'eccezione. Un sistema che registra solo `.com` risolve la metà sbagliata del problema.

## 3. Architettura: il fornitore è sostituibile

Stesso principio già applicato a `lib/vercel-domains.js` (Vercel) e `lib/whatsapp.js` (Meta): **un solo punto di contatto**, tutto il resto non sa chi c'è dietro.

```
lib/registrar/
  index.js        ← l'unica interfaccia che il resto del codice conosce
  cloudflare.js   ← implementazione (.com, .net, .org…)
  <italiano>.js   ← implementazione per i .it, partner da scegliere
```

Interfaccia minima, uguale per tutti i fornitori:

```
cerca(parola)                  → nomi candidati
verifica(dominio)              → { disponibile, prezzo, valuta }
registra(dominio, intestatario)→ { ok, scadenza, id }
statoDominio(dominio)          → { scadenza, rinnovo_automatico, nameserver }
```

Chi implementa cosa lo decide una tabella di instradamento per estensione (`.it` → partner italiano, resto → Cloudflare), **non il codice chiamante**. Cambiare fornitore = riscrivere un file.

Un fornitore che non copre un'operazione (per esempio il rinnovo via API) la dichiara non disponibile, e la piattaforma mostra al cliente cosa fare invece di fallire in silenzio.

## 4. Le tre domande da risolvere, che non sono tecniche

**1. A nome di chi è intestato il dominio?**
Se è intestato a noi, il cliente è legato: per andarsene deve chiedercelo. È un vincolo che si ritorce contro — il passaparola di chi si sente in ostaggio è pessimo. La posizione onesta è **intestarlo al cliente**, con noi come gestori tecnici. Costa qualche complicazione in più nel flusso (servono i suoi dati anagrafici reali), ma è la differenza fra un fornitore e un carceriere.

**2. Chi paga il rinnovo, e cosa succede se non paga?**
Un dominio scaduto è un'azienda che sparisce da internet, email comprese. Serve una regola scritta e visibile: rinnovo incluso nel canone oppure addebito separato con avvisi in anticipo. ⚠️ I rinnovi **non sono nell'API di Cloudflare**: finché non ci saranno, va presidiato a mano — un promemoria automatico interno è il minimo.

**3. Quale partner per i `.it`?**
Aruba, OVH e Namecheap hanno API, ma **quale funzioni davvero va verificato**, non dedotto dai loro siti. Criteri: API di registrazione vera (non solo gestione), prezzi di rinnovo onesti, possibilità di intestare al cliente, supporto raggiungibile in italiano.

## 5. Fasi

| Fase | Contenuto | Nota |
|---|---|---|
| **0** | Scelta del partner `.it` + prova reale della sua API con un dominio vero | è la verifica che decide tutto |
| **1** | `lib/registrar/` con Cloudflare + ricerca e verifica disponibilità nell'onboarding | senza ancora registrare |
| **2** | Registrazione vera, intestata al cliente, con DNS configurato da noi | il salto |
| **3** | Inoltro email `info@` incluso, ora che il DNS è nostro | quasi gratis a quel punto |
| **4** | Presidio scadenze: promemoria, stato rinnovo visibile in pannello | prima che serva, non dopo |

## 6. Quando farlo

**Dopo l'onboarding "Inizia qui"**, non prima: registrare domini dentro un flusso che non esiste ancora significa aggiungere responsabilità legali e di rinnovo senza il contenitore che le giustifica.

Nel frattempo, se un cliente lo chiede **oggi**: si compra il dominio a mano intestandolo a lui e lo si mette su Cloudflare. Dieci minuti, zero codice, cliente online in giornata. Automatizzare ha senso quando i casi diventano molti.
