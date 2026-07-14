-- 069 — RLS lockdown profiles/aziende (chiude escalation client-side CRITICA)
--
-- Trovato con l'audit RLS Fase 1 (14/7). Le policy esistenti erano troppo aperte:
--   - profiles "self profile": cmd=ALL, using (auth.uid()=id) → un utente loggato
--     poteva UPDATE la PROPRIA riga profilo (role/permissions/azienda_id) dal
--     browser (grant UPDATE presente su `authenticated`) → AUTO-PROMOZIONE a
--     super_admin → accesso totale cross-tenant.
--   - aziende "aziende_update": stessa dinamica su piano/moduli/require_2fa.
--
-- L'app NON scrive mai profiles/aziende dal client (AuthContext fa solo SELECT,
-- gli hook usano l'API; tutte le scritture passano dal server con service_role,
-- che bypassa la RLS). Quindi si riduce l'accesso client a SOLO SELECT: RLS nega
-- UPDATE/INSERT/DELETE anche se il grant resta. Verificato live (login integro +
-- escalation bloccata) in tests/smoke/security.spec.js.

begin;
  -- profiles: da ALL a SOLO SELECT del proprio profilo
  create policy "self profile read" on public.profiles
    for select using (auth.uid() = id);
  drop policy "self profile" on public.profiles;

  -- aziende: via la UPDATE client-side (la SELECT scoping resta)
  drop policy "aziende_update" on public.aziende;

  -- properties/ristoranti: avevano UPDATE-policy scoped all'azienda (NON escalation,
  -- ma porta di scrittura client inutile — l'app scrive solo via server). Via anche
  -- quelle: restano le SELECT scoping. Chiude la Fase 1 dell'audit RLS.
  drop policy "property update" on public.properties;
  drop policy "ristoranti_update" on public.ristoranti;
commit;
