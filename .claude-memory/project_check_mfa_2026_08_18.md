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
- **il 2FA è spento**: 0 utenti su 12 con TOTP verificato, 0 aziende con `require_2fa`. L'impianto è buono e inutilizzato — la sicurezza degli account dipende solo dalla password, incluso il super_admin che vede i dati di tutti i clienti;
- **audit log morto**: `audit_log` ha 965 righe e l'ultima è del **2026-06-09**; nessun punto del codice ci scrive più (il middleware che lo popolava non è stato riportato nella migrazione a Next). La pagina admin mostra dati fermi. È il monitoraggio post-autenticazione che manca proprio dove servirebbe dopo un furto di sessione;
- **passkey/WebAuthn disabilitati** sul progetto Supabase: `enroll({factorType:'webauthn'})` → "MFA enroll is disabled for WebAuthn" (anche `phone` disabilitato). Sono l'unica difesa strutturale contro l'AiTM;
- access token **60 minuti** + refresh token: una sessione rubata resta utile fino a un'ora, e senza audit log non ce ne accorgeremmo.

Priorità concordata da proporre: (1) TOTP sull'account super_admin, (2) ripristino audit log, (3) `require_2fa` per le aziende clienti (scelta di prodotto), (4) passkey quando abilitabili.

Vedi [[reference_security_audit]] e [[feedback_sicurezza_priorita]].
