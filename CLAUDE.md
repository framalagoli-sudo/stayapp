# StayApp — Documentazione per sviluppo

> ⚠️ **IMPORTANTE — leggere prima di tutto:** StayApp è una piattaforma SaaS **worldwide per qualsiasi business di servizi** — hotel, ristoranti, attività, MA ANCHE freelancer, studi professionali, agenzie, palestre, coach, negozi, ecc. I nomi nel codice (`struttura`, `ristorante`, `attivita`) sono i primi template verticali, non il limite del prodotto. Ogni feature deve funzionare per un avvocato a Berlino tanto quanto per un hotel in Puglia. Non inquadrare mai StayApp come "tool per hospitality italiana".

Piattaforma SaaS multi-modulo per qualsiasi business di servizi. Il cliente finale inquadra un QR code e accede a una PWA installabile. Ogni entità può attivare anche un **minisito pubblico** (landing page marketing).

**Architettura multi-modulo:**
```
Azienda (top-level)
├── moduli: { struttura, ristorante, attivita, ... }
├── Struttura 1 → PWA /s/:slug  |  Minisito /s/:slug (se attivo)
├── Ristorante 1 → PWA /r/:slug |  Minisito /r/:slug (se attivo)
└── Attività 1  → Minisito /a/:slug
```

> **Schema DB, endpoint API, note backend** → `server/CLAUDE.md` (auto-caricato quando si lavora in server/)
> **Route frontend, JSONB structures, moduli admin/guest** → `client/CLAUDE.md` (auto-caricato quando si lavora in client/)

---

## Setup nuovo sviluppatore

**Prerequisiti:** Node.js 18+, Git, credenziali Supabase/Railway/Vercel (da Francesco — fra.malagoli@gmail.com)

```bash
git clone <repo-url> && cd hospitality
cd client && npm install
cd ../server && npm install
```

**Variabili d'ambiente:**
- `server/.env` → copia da Railway → Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL`, `CLIENT_URL`, `DEMO_NOTIFY_EMAIL`, `PORT=3001`
- `client/.env` → copia da Vercel → Settings → Env Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

**Avvio locale:**
```bash
cd server && npm run dev   # → http://localhost:3001
cd client && npm run dev   # → http://localhost:5173
```
Proxy `/api/*` → `localhost:3001` via `vite.config.js`

**Deploy Vercel (manuale):**
```bash
npx vercel --prod --yes   # dalla root del repo
```
Progetto Vercel: `rootDirectory: client`. `client/vercel.json` → SPA routing (rewrites → index.html).

**⚠️ Dopo ogni deploy: eseguire sempre gli smoke test:**
```bash
cd tests && npm test      # ~3 minuti — verifica 36 pagine admin su prod
```
Oppure usa lo script unico dalla root: `.\deploy.ps1`
Questo script fa deploy Vercel + smoke test in sequenza. Se i test falliscono, il deploy è già avvenuto ma il problema è identificato subito.

> ⚠️ Migration SQL: eseguire a mano su Supabase Dashboard → SQL Editor. Non sono automatiche.

**Account:** Supabase Pro ($25/mese), Vercel Pro ($20/mese), Railway Starter ($5/mese), Cloudflare Free, Resend Free — tutti gestiti da Francesco.

---

## Stack tecnico

| Layer | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 (PWA via vite-plugin-pwa) |
| Backend | Node.js + Express 4 (ES modules) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Icone | lucide-react ^1.8.0 |
| Router | react-router-dom v6 |
| Email | Resend (RESEND_API_KEY in env) |
| Pagamenti | Stripe (installato, non integrato) |
| Hosting frontend | **Vercel** — `https://stayapp-henna.vercel.app` |
| Hosting backend | **Railway** |

---

## Architettura repository

```
hospitality/
├── client/
│   ├── vercel.json                 # SPA routing: tutte le route → index.html
│   └── src/
│       ├── App.jsx                 # Router principale
│       ├── context/AuthContext.jsx
│       ├── hooks/useProperty.js, useRistorante.js, useAttivita.js
│       ├── lib/api.js, supabase.js
│       ├── components/
│       │   ├── admin/AdminLayout.jsx, ProtectedRoute.jsx, ChatbotEditor.jsx
│       │   ├── CookieBanner.jsx    # React Portal, key cookie_consent_v2
│       │   ├── BookingWidget.jsx   # wizard pubblico prenotazione risorse
│       │   └── ChatbotWidget.jsx   # chatbot floating (PWA=absolute, landing=fixed)
│       └── pages/
│           ├── admin/              # vedi client/CLAUDE.md
│           ├── guest/              # vedi client/CLAUDE.md
│           └── public/PolicyPage.jsx, CancellaPrenotazionePage.jsx
├── server/
│   └── src/
│       ├── index.js
│       ├── middleware/auth.js
│       ├── lib/supabase.js         # service role key — bypassa RLS
│       └── routes/
│           ├── auth.js, properties.js, ristoranti.js, attivita.js
│           ├── guest.js            # endpoint pubblici (no auth)
│           ├── requests.js, upload.js, eventi.js, blog.js
│           ├── contatti.js, newsletter.js, analytics.js
│           ├── booking.js          # sistema booking risorse (slot/coperti)
│           └── demo.js
└── supabase/migrations/            # 015–028, eseguire a mano su Supabase
    ├── 015_blog, 016_contatti, 017_attivita, 018_privacy_data
    ├── 019_demo_requests, 020_newsletter, 021_page_views, 022_newsletter_v2
    ├── 023_booking, 024_booking_visibility, 025_chatbot
    ├── 026_staff_permissions, 027_staff_permissions, 028_pagine
```

---

## Convenzioni di codice

### Icone (lucide-react)
- `strokeWidth={1.5}` sempre
- `color={primary}` sempre
- Bottom nav inattiva: `opacity: 0.4`; attiva: `opacity: 1`

### Form e input in liste dinamiche
```jsx
function ItemForm({ item, onPatch }) {
  const [name, setName] = useState(item.name)
  return <input value={name} onChange={e => setName(e.target.value)} onBlur={() => onPatch({ name })} />
}
```
Testo: onChange locale → onBlur propaga. Select/toggle/file: onChange diretto.

### API calls
- `apiFetch(path, options)` — Bearer token, gestisce JSON
- `uploadMedia(endpoint, file)` — multipart, NON impostare Content-Type

### Hook pattern
- `useProperty()` — struttura corrente da `profile.property_id`
- `useRistorante(id)` / `useAttivita(id)` — by ID
- Tutti espongono: `{ data, loading, saving, saved, saveError, save }`

### Stile
- Tutto inline styles, nessun CSS framework
- Admin: sidebar 220px + main `#f5f5f5`
- Guest PWA: flex column con bottom nav fixed; scroll area `flex:1; overflow-y:auto`
- Desktop mockup guest: 390px, `border-radius:44px`, `overflow:hidden`

---

## Note importanti

1. **Slug**: generato al momento della creazione, non modificabile dopo. Conflitti → aggiunge `-{timestamp base36}`.

2. **cache-buster URL**: `?v={timestamp}` su tutti gli URL Storage. Non rimuovere.

3. **`slug` nella select guest**: tutti e tre gli endpoint guest (`/api/guest/:slug`, `/r/:slug`, `/a/:slug`) devono includere `slug` nella `.select()`. Senza, i link privacy/cookie nel minisito restano `undefined`.

4. **CookieBanner**: usa `createPortal(document.body)` per evitare problemi di stacking context in Firefox. Key localStorage: `cookie_consent_v2`.

5. **vercel.json**: in `client/vercel.json`, configura `rewrites → index.html` per SPA routing. Senza, Firefox e accessi diretti a URL profondi restituiscono 404.

6. **Deploy Vercel**: il progetto `stayapp` su Vercel ha `rootDirectory: client`. Deployare dalla root del repo con `npx vercel --prod --yes`. GitHub auto-deploy non ancora collegato — deploy manuale per ora.

7. **Server Railway**: riavvio automatico al push. `EADDRINUSE :3001` in locale = istanza precedente attiva → `Stop-Process -Id <PID> -Force`.

8. **Supabase service role**: il server usa sempre la service role key → bypassa RLS. La RLS vale solo per query client-side (AuthContext, useProperty).

9. **Discriminazione booking vs richieste**: prenotazioni salvate in `requests` con `message` che inizia con `[Prenotazione attività]`, `[Prenotazione escursione]` o `[Interesse offerta: nome]`. `BookingsPage` filtra con `message.startsWith('[Prenotazione') || message.startsWith('[Interesse offerta')`, `RequestsPage` le esclude.

10. **Newsletter — double opt-in**: `POST /api/contatti/subscribe` salva con `iscritto_newsletter: false` + invia email conferma `/confirm-subscription?token=uuid`. Token azzerato su conferma. `runScheduledSends()` gira ogni 60s via `setInterval` in `index.js`.

11. **Newsletter — named exports**: `newsletter.js` esporta router (`export default`) + `sendNewsletterById` e `runScheduledSends` come named exports. `index.js`: `import newsletterRouter, { runScheduledSends } from './routes/newsletter.js'`.

12. **Pageview tracking**: landing page fanno `POST /api/guest/pageview` al mount, deduplicato con `sessionStorage` key `pv_{entity.id}`. 1 visita per sessione browser.

13. **Analytics route**: tutto inside async handlers con try-catch. Express 4 non gestisce automaticamente eccezioni async.

18. **⚠️ Supabase Redirect URLs**: aggiornare ad ogni cambio dominio in `Supabase Dashboard → Authentication → URL Configuration → Redirect URLs`:
    ```
    https://www.oltrenova.com/admin/reset-password
    https://www.oltrenova.com/admin/accept-invite
    https://stayapp-henna.vercel.app/admin/reset-password
    http://localhost:5173/admin/reset-password
    http://localhost:5173/admin/accept-invite
    ```
    Site URL: `https://oltrenova.com` (senza www — impostato su Supabase Dashboard)

19. **⚠️ Supabase Grant espliciti — obbligatori da ottobre 2026**: ogni migration futura deve includere:
    ```sql
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.nuova_tabella TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.nuova_tabella TO service_role;
    -- Solo per tabelle pubbliche (/api/guest/* senza auth):
    -- GRANT SELECT ON public.nuova_tabella TO anon;
    ALTER TABLE public.nuova_tabella ENABLE ROW LEVEL SECURITY;
    ```

22. **⚠️ Drag & drop con componenti React inline**: definire un componente React DENTRO un altro componente causa unmount/remount ad ogni render (nuova identità di funzione) → interrompe il drag. **Fix**: usare funzione normale `renderXxx()` chiamata direttamente `{renderXxx(item)}`. Applicato a `renderMenuRow` in `SitoPage.jsx`. Stesso vale per qualsiasi altro editor drag & drop futuro.

---

## Roadmap

### Completato
- Analytics, Newsletter (4 fasi), Booking risorse, Chatbot, Password reset, Sicurezza Fase 1+2, Gestione staff, Sistema pagine CMS (23 tipi blocchi, drag&drop, SEO, header/footer configuratore) ✅ 2026-05-14

### Da fare (in ordine)
- [ ] **Upgrade Supabase Pro + Vercel Pro** — azione manuale ($45/mese totale)
- [ ] **Dominio** — acquisto + configurazione (vedi nota 21 in `server/CLAUDE.md`)
- [ ] **Pagamenti Stripe** — checkout booking risorse ed eventi (colonne `pagamento_stato/pagamento_id` già su prenotazioni)
- [ ] **Multi-lingua** — IT/EN/DE per PWA ospite
- [ ] **Collegare GitHub → Vercel auto-deploy**
- [ ] **Notifiche real-time** — Supabase Realtime su `requests` (bassa priorità)
- [ ] Email reminder booking, QR Code con logo, Modalità offline PWA, Recensioni ospiti, Integrazione PMS

> Per il dettaglio completo vedere `FEATURES.md` nella root del repo.
