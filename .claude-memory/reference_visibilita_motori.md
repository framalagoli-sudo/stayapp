---
name: reference-visibilita-motori
description: Chi finisce nei motori di ricerca — regola unica in lib/visibilita-motori.js; i siti nuovi nascono invisibili (migration 116)
metadata:
  type: reference
---

**Una domanda, un posto solo: `lib/visibilita-motori.js`** (`fuoriDaiMotori`).
Tre motivi legittimi per restare fuori: è l'**app del QR** (contiene la password
WiFi), il **minisito è spento**, o il cliente ha spento l'interruttore
**«Visibile ai motori di ricerca»** (`entita.indicizzabile`, migration 116).

⛔ **La regola esisteva solo per le strutture**: l'app del QR di ristoranti e
attività era indicizzabile. Trovato il 14/09/2026 mentre si aggiungeva
l'interruttore. *Una regola scritta in uno dei tre posti non è una regola.*

- **I siti nuovi nascono invisibili** (default `false`; le entità che esistevano
  restano `true`): il giorno della registrazione il sito ha il testo di esempio,
  ed è quello che Google fotograferebbe. Deciso da Francesco.
- Copre anche le porte laterali: pagine interne, vetrina, **eventi** (stanno su
  `/eventi/…`, indirizzo globale: il noindex del sito non li coprirebbe) e la
  **sitemap**, che per un sito nascosto risponde vuota.
- ⚠️ **Mai `Disallow` nel robots per nascondere**: per leggere un `noindex` il
  motore deve poter scaricare la pagina. Vedi [[reference_eventi_conclusi]].
- Nel pannello: banner **in cima** alla pagina «Sito web». Non promette Google —
  dice che i tempi li decide lui e rimanda a Search Console.
- I due siti di prova (`prova`, `struttura-test`) sono spenti e non indicizzabili
  dal 14/09.

## 🔗 Un sito, un indirizzo ufficiale (14/09/2026)

Lo stesso sito vive su **tre** indirizzi — `oltrenova.com/{s|r|a}/slug`, il
**sottodominio** `slug.oltrenova.com` e il **dominio del cliente** — e ognuno
dichiarava sé stesso come originale. Per un motore sono siti gemelli: sceglie
lui, e di solito vince il dominio più forte (il nostro). Il cliente paga un
dominio per farsi trovare col proprio nome e compariva col nostro.

`lib/indirizzo-ufficiale.js` → `hostUfficiale(entityId)`: **dominio del cliente
(`tipo=custom`, `stato=attivo`) → sottodominio → percorso su oltrenova.com**.
Applicato a siti, pagine interne, vetrina ed eventi (canonical **e** dati
strutturati).

⚠️ **L'ufficiale vince SEMPRE su quello da cui arriva la richiesta.** Con
l'ordine opposto la prima versione sistemava solo `oltrenova.com/r/garage22`
e lasciava `garage22.oltrenova.com` a dichiarare sé stesso — metà problema,
scoperto solo perché dopo il deploy sono stati controllati **tutti e tre** gli
indirizzi, non uno.

⏳ **Non fatto, deciso**: il redirect 301 da oltrenova al dominio del cliente
sarebbe più forte del canonical, ma se il dominio del cliente si rompe (DNS,
certificato) il sito diventa irraggiungibile **anche** dal nostro indirizzo,
che oggi è la rete di sicurezza. Da valutare quando i domini avranno mesi di
stabilità, eventualmente per singolo cliente.
