# Il catalogo e i suoi strati

> Deciso il 27/08/2026 con Francesco. Da leggere **prima** di aggiungere
> qualsiasi cosa a Vetrine, Offerte o Shop.

## Il problema

Abbiamo costruito tre volte lo stesso catalogo.

| tabella | cosa contiene | colonne | righe al 27/08 |
|---|---|---|---|
| `vetrina_elementi` | il catalogo, con filtri e ricerca | titolo, copertina, dati, immagini, prezzo | 1 |
| `offerte` | attività ed escursioni migrate | titolo, descrizione, cover, prezzo, posti, date | 3 (di prova) |
| `prodotti` (shop) | i prodotti in vendita | nome, descrizione, prezzo, immagini, stock, categoria | **0** |

Sono la stessa cosa scritta tre volte. Il cliente che vuole mettere online un
suo prodotto deve chiedersi «questo va in Vetrine, in Offerte o nello Shop?» —
e non c'è una risposta giusta, perché spesso è tutte e tre.

Nessuno ci ha ancora messo dati veri: **è il momento più economico per
sistemarlo che avremo mai.**

## Il modello

**La cosa vive in un posto solo. Sopra ci vanno gli strati.**

```
                    ┌─ in vendita  → stock, carrello, pagamento
la cosa (vetrina) ──┤
  esiste, si mostra └─ in offerta  → posti, date, «prenota». Finisce.
```

- **In vetrina** è lo stato base: il prodotto o il servizio esiste, si mostra,
  si filtra, si cerca. **Non finisce mai.**
- **In offerta** è un atto con un inizio e una fine: lo stai amplificando
  adesso. Quando l'offerta finisce, il prodotto **resta** in vetrina.
- **In vendita** è la possibilità di comprarlo subito.

Gli strati sono indipendenti: una cosa può essere solo in vetrina, in vetrina e
in offerta, in vetrina e in vendita, o tutt'e tre.

## Come si presenta al cliente

Le voci di menu **restano** — quello che cambia è dove finiscono i dati.

In **Offerte**, «Nuova offerta» chiede:
- **Seleziona dalla vetrina** → scegli una cosa che hai già e la amplifichi;
- **Nuovo** → ti porta a crearla in vetrina, e torni con l'offerta impostata.

Il cliente non deve sapere che esistono due tabelle: sa che sta amplificando
una cosa che possiede. Ed è il motivo per cui «Offerte» non diventa un
interruttore sull'elemento di vetrina: un flag farebbe sparire l'idea che
un'offerta è un **atto** con una durata, e la voce di menu perderebbe il suo
mestiere.

## Cosa resta fuori, di proposito

**Gli eventi restano a parte** (deciso il 27/08, vedi `CLAUDE.md`). Hanno una
voce propria, una pagina pubblica, le loro prenotazioni — e sono l'unica cosa
che i clienti usano davvero. Non si toccano.

## Perché non l'abbiamo fatto subito

Perché le tre parti sono nate in momenti diversi e ognuna sembrava piccola. È
lo «sviluppare a pezzi»: nessun singolo passo era sbagliato, la somma sì.
La regola che ne esce: **prima di aggiungere un posto dove il cliente mette le
sue cose, verificare che non ce ne sia già uno.**
