-- I consumi AI li legge e scrive solo il server.
--
-- La 119 concedeva i permessi alla service_role ma non li toglieva ai ruoli
-- pubblici, che su Supabase li ricevono in automatico per ogni tabella nuova.
-- Verificato il 15/09/2026: un anonimo otteneva risposta 200 con zero righe —
-- fermato solo dalla RLS senza policy. Regge, ma è un muro solo: un domani una
-- policy aggiunta per sbaglio aprirebbe la spesa AI di tutte le aziende.
REVOKE ALL ON public.ai_consumi FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.ai_consumi_id_seq FROM anon, authenticated;
