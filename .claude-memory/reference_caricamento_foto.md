---
name: reference_caricamento_foto
description: "Il tetto vero per una foto caricata dal pannello è 4 MB (limite della piattaforma, misurato), e il campo di caricamento si sta unificando in CampoImmagine"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-14T19:45:43.669Z
---

**Il peso massimo di una foto caricata dal pannello è 4 MB, e non è una nostra prudenza: è il tetto della piattaforma.** Misurato in produzione il 14/09/2026 contro `/api/upload/blog-cover` senza credenziali, così non scrive niente:

- 4096 KB → **401** (la richiesta arriva alla nostra route, che rifiuta l'autenticazione)
- 4400 KB → **413** (risponde la piattaforma, *prima* che il nostro codice parta)
- 5 MB, 10 MB → 413

Sopra quella soglia non c'è messaggio che tenga, perché non ci arriviamo nemmeno. Il numero sta in `lib/formati-foto.js` (`LIMITE_FOTO`, `fotoTroppoPesante`), con la misura scritta accanto.

Prima era sbagliato **in entrambe le direzioni**, in sette punti diversi:
- **cinque a 2 MB** — scritti quando le foto si salvavano grezze; dal 24/08 (nota 30 del CLAUDE.md) il server le comprime da solo, quindi rifiutavano foto che il sistema gestirebbe benissimo. Da telefono la media è 1 MB con punte di 3,9: un cliente che fotografa un piatto col telefono poteva restare bloccato.
- **due a 5 MB** (eventi, risorse prenotabili) — promettevano più di quanto passi: il file partiva e tornava un 413 opaco dentro un `alert`.

## Il campo unico

`components/admin/CampoImmagine.jsx` — un solo posto per caricare una foto. Prima erano **19 file** con un caricatore proprio, **27 campi immagine**, di cui **uno solo** con Unsplash e **due** col punto focale: non una scelta, ma il posto in cui nessuno aveva ancora portato il miglioramento fatto altrove.

Le opzioni si dichiarano per punto (`unsplash`, `onFocale`, `anteprima`, `indirizzo`): un comando che non fa niente è peggio di un comando assente — il *formato* su una foto ritagliata a cerchio non cambierebbe nulla.

⚠️ **Non va forzato ovunque.** Le **gallerie a più foto** (prodotti, risorse, gallery) e le **miniature dentro liste fitte** (piatti del menu) hanno una forma diversa: infilarci dentro il campo grande snaturerebbe la pagina in cui il cliente lavora. Vanno affrontate a parte.

⚠️ **Un logo si guarda INTERO** (`adatta="contieni"`, su uno sfondo: chiaro per il normale, scuro per il negativo) — ritagliarlo per riempire il riquadro taglia il marchio del cliente. Una **copertina riempie**, perché è lo sfondo di qualcos'altro. Dove l'immagine si mostra intera il punto focale non compare: non c'è niente da scegliere.

Adottato: **copertina del blog**, **logo + logo negativo + copertina delle Info** dei tre tipi, **Foto+Testo**. Da fare: il resto (gallerie e miniature a parte).

## La forma la sceglie il cliente

`components/admin/SelettoreFormato.jsx` (estratto dall'editor eventi, ora condiviso). Attivo su: **evento**, **Team** (`FORME_SCHEDA`, col cerchio), **Foto+Testo**, **Carosello**, **Card paragrafi**.

⚠️ **Il rapporto storico non si perde mai.** Quei blocchi avevano il rapporto scritto nel codice (4/3 foto+testo e carosello, 16/9 card paragrafi): ora la prima voce è «Predefinito — come adesso» e **l'assenza di scelta vale ancora quel rapporto**, `rapportoOppure(chiave, storico)`. Senza quella voce la scelta sarebbe a senso unico, impossibile da annullare. Vale lo stesso per il Team: chiave assente = cerchio.

Il modo di provarlo è **nelle due direzioni**: pagina temporanea su un'entità di prova, resa pubblica prima con le forme scelte e poi togliendo le chiavi — devono tornare i rapporti storici. Poi si cancella la pagina.

⛔ Trovato adottandolo: **solo le strutture non avevano il campo del logo negativo**, mentre colonna (`logo_dark_url`, migration 064), route (accetta già `field=logo_dark_url`) e sito c'erano da tempo — costruito tutto tranne la porta, come in [[reference_motore_senza_porta]]. Lo stesso sguardo va dato agli altri campi quando si tocca una pagina Info.

Il punto focale della **copertina dell'entità** non è ancora possibile: `cover_focal` esiste solo su `eventi` (migration 083), su `entita` servirebbe una migration.
