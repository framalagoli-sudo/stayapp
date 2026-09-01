---
name: todo-prossima-sessione
description: "Da dove riprendere — le recensioni, con le 6 route da sbloccare e il percorso da percorrere davvero; deciso il 01/09/2026"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-01T22:57:35.890Z
---

# Si riprende dalle RECENSIONI

Deciso con Francesco a fine sessione del **1 settembre 2026**. Sue parole:
«chiudiamo sessione, riprendiamo domani mattina con queste cose».

## Perché proprio quelle, e perché adesso

Misurato sul database il 01/09: **2 recensioni in tutto, 0 richieste inviate, 0
compilate** in tutta la storia del progetto. Un'altra funzione a uso zero
([[reference_motore_senza_porta]]).

⛔ **Ma ora è urgente**: il modello «Grazie, e com'è andata?» messo live il 01/09
manda a `{{link_recensione}}`. È fatto perché i clienti lo accendano — e li
porterebbe dentro una funzione mai usata da nessuno, con tre route
verosimilmente spente. *È una porta appena costruita che dà su una stanza mai
aperta.*

## L'ordine concordato

1. **Le 6 route con la guardia su `azienda_id`** — `recensioni/`,
   `recensioni/[id]`, `recensioni/genera-link`, `webhooks/`, `webhooks/[id]`,
   `webhooks/[id]/test`. Da super_admin sono verosimilmente spente. Il come sta
   in [[reference_super_admin_senza_azienda]]: è la **terza** ricorrenza in un
   giorno solo.
2. **Percorrere il giro vero, col browser**: generare un link, aprirlo come
   farebbe un ospite, lasciare una recensione, vedere se arriva nel pannello.
   Non il codice — il percorso ([[feedback_verificare_il_contesto]]).
3. **Pulsanti Google / TripAdvisor**. Strada approvata da Francesco col suo
   caveat: *«se i pulsanti dicono il vero»*. Il modo onesto: il cliente incolla
   il **link al suo profilo**, noi mostriamo un pulsante «Lasciaci una recensione
   su Google» — e **non scriviamo mai un voto**. Un «4,8 su Google» digitato a
   mano è vero il giorno che lo scrivi e falso il mese dopo. Francesco non ha
   ancora detto se vuole comunque il voto: **chiedere prima di metterlo**.

Francesco ha dato mandato di fare 1 e 2 senza ricontrollare, e di **fermarsi
prima di aggiungere qualcosa che il cliente vedrebbe sul sito**.

## Dopo: l'onboarding

Resta il capitolo che vale di più ([[project_onboarding_mappa]]), ma Francesco lo
tiene per ultimo: *«c'è da fare un ragionamento profondo di marketing»*. È una
sua decisione di prodotto, si aspetta lui.

## Fermo, e dipende da Francesco

- **Nessun cliente ha collegato il conto Stripe**: il primo incasso vero non è
  mai avvenuto. Provato, non collaudato ([[reference_stripe_connect]]).
- **Meta**: fermi sulla verifica business, il codice Tech Provider è pronto
  ([[reference_meta_blocco_dispositivo]]). Confermato il 01/09 che restiamo Tech
  Provider e non passiamo da un BSP.
- **Termini e privacy** da far leggere a un avvocato
  ([[reference_documenti_legali]]).
- **2FA** su Vercel, Supabase, Cloudflare, GitHub.
- Le 10 aziende devono accettare i Termini.
- Ripristino del backup mai provato ([[reference_backup_e_ripristino]]).

## Altro in coda (nessuno urgente)

Next 16, multilingua DE, import documento v2, QR con logo, PWA installabile,
notifiche realtime, integrazione PMS.

⚠️ **Prima di deployare**: `npx vercel` ha avuto una giornata storta il 01/09
(59.11.0 con una dipendenza rotta, poi «Not authorized» transitorio sulla
59.11.1). Il ripiego sta in [[reference_anteprima_social]].
