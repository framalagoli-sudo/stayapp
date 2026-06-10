---
name: project-session-2026-06-10b
description: "Inizio debug Fase 1 — sezione Sito & App, fix AttivitaApp useSearchParams"
metadata:
  node_type: memory
  type: project
  originSessionId: current
---

## Debug Fase 1 — Sito & App (2026-06-10) — IN CORSO

Avviato debug sistematico della checklist FEATURES.md, sezione "Sito & App".
Approccio: analisi statica del codice + test manuale in produzione da parte di Francesco.

### Bug trovato e fixato

**AttivitaApp.jsx:11** — `useSearchParams()` usato con array destructuring errata:
```js
// SBAGLIATO (era):
const [searchParams] = useSearchParams()
const isQR = searchParams.get('qr') === '1'

// CORRETTO (fix):
const searchParams = useSearchParams()
const isQR = searchParams?.get('qr') === '1'
```

`useSearchParams()` in Next.js restituisce `ReadonlyURLSearchParams` direttamente, non un array.
Con la destructuring errata, `searchParams` era `undefined` → crash su `.get('qr')` → le attività non distinguevano accesso da QR vs browser.

GuestApp, RestaurantApp, AttivitaPWA usavano già la sintassi corretta.

### Analisi statica completata — nessun altro bug critico

- Routing simmetrico struttura/ristorante/attività: OK
- useEffect dipendenze: OK in tutti i componenti
- DominiPage error handling: esplicito con try/catch
- middleware.js: OK (NEXT_INTERNAL_API_URL già presente dalla sessione 06-08)

### Test manuale in produzione — DA FARE (prossima sessione)

Francesco deve testare voce per voce su oltrenova.com:
1. Struttura Info — salva dati, logo/cover, tema colori
2. Struttura Sito web — 4 tab (Pagine/Menu/Impostazioni/SEO), DnD blocchi
3. Struttura App Clienti — chatbot, bottom nav
4. Ristorante Info — salva OK?
5. Ristorante Menu — DnD, accordion, icone catalogo
6. Ristorante Sito web — page builder
7. Attività Info — salva OK?
8. Attività Sito web — page builder
9. Domini — subdomain auto istruzioni, verifica dominio custom Fondaco Narni

**Why:** Fase 1 del piano tecnico — debug funzionale completo prima di migrare Railway → Vercel.
**How to apply:** Continuare da questa lista nella prossima sessione. Il fix AttivitaApp va deployato con .\deploy.ps1.
