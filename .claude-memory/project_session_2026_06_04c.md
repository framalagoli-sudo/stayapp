---
name: project-session-2026-06-04c
description: "Session 2026-06-04c — Fix reset password (Supabase Redirect URLs), smoke test setup, utente test da creare"
metadata: 
  node_type: memory
  type: project
  originSessionId: 892c8ecf-57dd-42fe-8347-eeea60ae3b4f
---

## Fix reset password

**Causa bug:** `https://oltrenova.com/admin/reset-password` non era nella whitelist Supabase Redirect URLs. Supabase ignorava il `redirectTo` e reindirizzava l'utente alla home invece che alla pagina di reset.

**Fix eseguito:**
- Francesco ha aggiunto alla whitelist Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
  - `https://oltrenova.com/admin/reset-password`
  - `https://www.oltrenova.com/admin/reset-password`
  - `https://oltrenova.com/admin/accept-invite`
  - `https://www.oltrenova.com/admin/accept-invite`
- Site URL Supabase confermato: `https://oltrenova.com` (senza www)
- Default `clientUrl` nel server corretto da `https://www.oltrenova.com` a `https://oltrenova.com`
- Aggiunto warning log server-side se `action_link` non contiene `/admin/reset-password`
- CLAUDE.md aggiornato con gli URL corretti

**Come applicare:** ad ogni cambio dominio, aggiornare ENTRAMBI con e senza www nella whitelist Supabase.

## Smoke test Playwright

**Stato:** setup funziona, login funziona, ma bloccato dal 2FA di Francesco.

**Fix config già applicato:** `storageState` spostato dal `use` globale al progetto `smoke` (il `use: { storageState: undefined }` nel progetto setup non annullava il valore globale).

**Pendente — chiedere a inizio prossima sessione:** creare utente dedicato ai test su Supabase senza 2FA:
1. Supabase Dashboard → Authentication → Users → Add user → email `test@oltrenova.com`, password senza caratteri speciali
2. SQL Editor:
   ```sql
   INSERT INTO profiles (id, role, full_name)
   SELECT id, 'super_admin', 'Test Runner'
   FROM auth.users WHERE email = 'test@oltrenova.com';
   ```
3. Aggiornare `tests/.env.test`:
   ```
   TEST_EMAIL=test@oltrenova.com
   TEST_PASSWORD="password-scelta"
   ```

**Why:** il 2FA è TOTP (cambia ogni 30s), non automatizzabile senza il secret. L'utente test non ha 2FA e non viene usato per accedere al pannello reale.

## Password di Francesco

Francesco ha cambiato la password dopo esposizione accidentale in chat. La nuova password è in `tests/.env.test` (file locale, in .gitignore). Quando si aggiorna la password, ricordarsi di aggiornare anche `tests/.env.test` con le virgolette doppie attorno al valore (i caratteri speciali come # vengono troncati da dotenv senza virgolette).
