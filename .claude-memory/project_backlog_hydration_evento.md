---
name: project_backlog_hydration_evento
description: DA RIPARARE — il dettaglio evento dà un errore di hydration sugli ATTRIBUTI; causa e soluzione già individuate il 22/09/2026
metadata:
  type: project
---

**Sintomo**: lo smoke `public-flows › dettaglio evento carica + bottone
Indietro presente` fallisce con **React #418** (in produzione è minificato).
La pagina **funziona**: contenuto completo, 1093 parole in SSR, H1 presente,
«già svolto» servito dal server. Non è una pagina bianca.

**Diagnosi fatta il 22/09/2026** sul dev locale, dove React non è minificato:

> A tree hydrated but some **attributes** of the server rendered HTML didn't
> match the client properties. […] This can happen if a SSR-ed Client Component
> used: a server/client branch `if (typeof window !== 'undefined')`.

Sono **attributi**, non testo — quindi nessuna parola cambia sotto gli occhi di
chi legge. Il candidato è `suDominioDelCliente()` in
`components/guest/EventoPage.jsx`:

```js
function suDominioDelCliente() {
  return typeof window !== 'undefined' && !/(^|\.)oltrenova\.com$/.test(window.location.hostname)
}
```

Alimenta `baseSito()`, che costruisce gli **href** di «privacy», «cookie» e
«torna al sito»: sul server quel ramo è sempre falso, sul client dipende
dall'host. È esattamente il primo caso che React elenca.

**Soluzione proposta** (non applicata: 22/09 erano già stati fatti sei deploy
su un sito di un cliente, e questo merita una verifica a mente fresca): il
**server sa già** su quale dominio siamo — il middleware mette `_domain` nei
searchParams. `app/eventi/[id]/page.js` può passarlo come prop a `EventoPage`,
che smette di dedurlo da `window`. Deterministico, e toglie il ramo.

⚠️ Da verificare dopo il cambio: pagina evento aperta **da un dominio cliente**
(garage22terni.it) e da oltrenova.com, controllando che i link di privacy,
cookie e «torna al sito» puntino ancora al posto giusto in entrambi i casi.

Parente: [[project_backlog_hydration_landing]].
