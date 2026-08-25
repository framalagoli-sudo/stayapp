---
name: reference_signup_trigger_profili
description: Un trigger crea già la riga in profiles (role staff, senza azienda) alla creazione dell'utente — usare upsert, mai insert; il signup era rotto e nessuno poteva accorgersene
metadata:
  type: reference
---

**Il fatto** (25/08/2026): `supabase.auth.admin.createUser()` fa scattare un trigger che
inserisce **già** una riga in `public.profiles` con `role = 'staff'` e `azienda_id = null`.

Chi scrive poi il profilo con `.insert()` prende `23505 duplicate key`. È esattamente ciò
che faceva `/api/auth/signup`: errore 500, e il rollback cancellava utente e azienda appena
creati. **La registrazione self-serve non poteva riuscire** — e non se n'era accorto nessuno
perché le iscrizioni sono chiuse (`platform_config.signup_enabled = false`) e ogni account
esistente è nato da invito o a mano.

**Regola**: scrivendo un profilo dopo `createUser`, sempre
`.upsert({...}, { onConflict: 'id' })`. Le sonde lo facevano già — è per questo che
funzionavano mentre il codice vero era rotto: una divergenza fra come si prova e come si
esegue nasconde il difetto invece di rivelarlo.

**Il metodo che l'ha trovato**: `tests/probe-percorso-cliente.mjs` non legge il codice,
**percorre i passi** di un cliente il primo giorno (accede → crea l'entità → compila →
pubblica → collega il dominio) e segnala dove servirebbe una telefonata. Da rilanciare
prima di aprire le registrazioni.

Altri punti aperti trovati con la stessa sonda: `/admin/onboarding` risponde **404** benché
l'email di benvenuto ci mandi, e l'azienda nasce con i tre moduli spenti — solo un
super_admin può accenderli, quindi il menu «Sito & App» non compare e il cliente non trova
la strada per creare il proprio sito.

Vedi [[project_onboarding_mappa]].
