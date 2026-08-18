---
name: project_check_mfa_2026_08_18
description: Check sicurezza MFA del 18/08/2026 — l'impianto 2FA regge ai test avversariali, ma è spento (0 utenti su 12) e l'audit log è fermo dal 9 giugno
metadata:
  type: project
---

Check richiesto da Francesco su spunto di un articolo sui bypass dell'MFA (AiTM, percorsi laterali, MFA come passaggio e non fortezza). Verificato con test reali (`tests/probe-mfa-bypass.mjs`, utente + azienda effimeri, sempre eliminati).

**Regge — provato, non dedotto:**
- sessione a un solo fattore (`aal1`) → `403 mfa_required` su `/api/properties`, `/api/contatti`, `/api/aziende/{id}`;
- `mfa.unenroll()` con `aal1` → **rifiutato da Supabase**: "AAL2 required to unenroll verified factor";
- `PATCH require_2fa=false` con `aal1` → `403`, flag invariato nel DB;
- revoca sessione (`admin.signOut(token,'global')`) → il token diventa `401` **subito**, non alla scadenza;
- enforcement server-side unico in `requireAuth`→`enforceMfa`; il browser legge da Supabase solo `profiles` (proprio) e `aziende.require_2fa`, nessun dato di business;
- `/api/auth/*` è esente da MFA ma contiene solo flussi pre-login + `me` (solo il proprio profilo); `/api/upload` è uno stub 404.

**Non regge:**
- **il 2FA è spento**: **3 utenti su 12** con TOTP verificato (Francesco, Inlingua Terni, Borgo del Lago) e **0 aziende** con `require_2fa`: il secondo fattore è volontario, quindi 9 utenti su 12 ne sono privi. L'impianto è buono e inutilizzato — la sicurezza degli account dipende solo dalla password, incluso il super_admin che vede i dati di tutti i clienti;
- **audit log morto**: `audit_log` ha 965 righe e l'ultima è del **2026-06-09**; nessun punto del codice ci scrive più (il middleware che lo popolava non è stato riportato nella migrazione a Next). La pagina admin mostra dati fermi. È il monitoraggio post-autenticazione che manca proprio dove servirebbe dopo un furto di sessione;
- **passkey/WebAuthn disabilitati** sul progetto Supabase: `enroll({factorType:'webauthn'})` → "MFA enroll is disabled for WebAuthn" (anche `phone` disabilitato). Sono l'unica difesa strutturale contro l'AiTM;
- access token **60 minuti** + refresh token: una sessione rubata resta utile fino a un'ora, e senza audit log non ce ne accorgeremmo.

Priorità concordata da proporre: (1) TOTP sull'account super_admin, (2) ripristino audit log, (3) `require_2fa` per le aziende clienti (scelta di prodotto), (4) passkey quando abilitabili.

Vedi [[reference_security_audit]] e [[feedback_sicurezza_priorita]].

**⚠️ Errore di misura da non ripetere**: `admin.auth.admin.listUsers()` **non popola il campo `factors`** — con quel metodo risultavano 0 utenti con TOTP. Il dato vero si ottiene solo leggendo ogni utente con `admin.auth.admin.getUserById(id)`, che restituisce `factors` con il loro `status`.

## Seguito operativo (stesso giorno)

- **2FA reso obbligatorio ovunque**: migration `072` porta il default di `aziende.require_2fa` a `true` (il default sta sulla colonna perché le aziende nascono da tre percorsi diversi) + attivato su tutte le 9 aziende esistenti su decisione di Francesco. Prima di attivarlo, `tests/probe-onboarding-2fa.mjs` ha verificato che chi se lo trova imposto riesca davvero a uscirne: legge il flag via RLS (senza, nessuno lo guiderebbe), registra l'app, conferma il codice, torna operativo.
- **Passkey attive**. Francesco le ha abilitate dal dashboard (RP ID `oltrenova.com`, origins **con e senza www** — il pannello gira su `www.oltrenova.com`, senza quell'origin la registrazione fallisce). Fatti verificati con autenticatore virtuale CDP (`tests/probe-passkey.mjs`):
  - in Supabase la passkey è un **metodo di accesso** (`auth.registerPasskey` / `signInWithPasskey`, endpoint `/auth/v1/passkeys/*`), **non** un fattore MFA: `mfa.enroll({factorType:'webauthn'})` resta "disabled" ed è normale;
  - richiede `createClient(..., { auth: { experimental: { passkey: true } } })`, altrimenti i metodi lanciano;
  - le options arrivano come `{ challenge_id, options: {...} }` e `challenge_id` va rimandato nella verify;
  - **la sessione che ne risulta è `aal1`** con `amr: [{method:'passkey'}]` → con `require_2fa` attivo veniva respinta con 403. `enforceMfa` ora accetta anche `amr` con passkey/webauthn: chiedere un codice a chi è entrato con una credenziale legata al dominio sarebbe chiedere il metodo più debole a chi ha usato il più forte.
- Regressione verificata: una sessione `aal1` **senza** passkey resta bloccata (403 su properties/contatti/aziende), unenroll e `require_2fa=false` restano rifiutati. Smoke 66/66.

**Trappola dei nomi nella libreria** (`@supabase/supabase-js` 2.107): `registerPasskey` e `signInWithPasskey` stanno su `auth`, ma **elenco, modifica e cancellazione stanno nel namespace `auth.passkey`** (`list()`, `update()`, `delete({passkeyId})`). `auth.listPasskeys()` non esiste: chiamarlo lancia un TypeError che, se non catturato, lascia l'elenco vuoto e fa ricomparire il pulsante "Aggiungi una passkey" anche dopo una registrazione riuscita — sembra un mancato salvataggio e non lo è. `GET /auth/v1/passkeys` restituisce un **array diretto** con `id, friendly_name, created_at, last_used_at`.

**Percorso utente verificato in un browser vero** (`tests/probe-login-passkey.mjs`, autenticatore virtuale CDP): password → `/admin/security` (il gate ci manda chi non ha ancora il secondo fattore) → registrazione passkey → logout → "Entra con impronta o volto" → **`/admin`, senza codice**. Chi ha già il TOTP attivo non passa da `/admin/security`.

## Chiusi i due punti aperti (stesso giorno)

- **Audit log ripristinato**: `lib/audit.js` agganciato a `requireAuth` — l'unico punto da cui passano tutte le route amministrative, così la copertura non dipende dal ricordarsene route per route. Registra solo le mutazioni (POST/PATCH/PUT/DELETE), **anche i tentativi respinti** (401/403), con payload **redatto** (`password|secret|token|api_key|…` → `[REDACTED]`) e troncato a 4 KB — il vecchio registro archiviava interi menù di ristorante. Il body si legge da `request.clone()`, altrimenti la route non potrebbe più leggerlo. Verificato con `tests/probe-audit.mjs`: letture registrate 0, segreti in chiaro 0, tentativi respinti registrati. Costo misurato: **~20 ms** per mutazione (762 ms contro 744 di una lettura).
  - Limite noto e voluto: lo `status_code` è nullo per le richieste ammesse, perché l'esito lo decide la route; il registro dice *chi ha tentato cosa*, che è ciò che serve per ricostruire l'attività di una sessione rubata.
- **`.single()` di AuthContext**: risolto, vedi [[reference_authcontext_406]].
