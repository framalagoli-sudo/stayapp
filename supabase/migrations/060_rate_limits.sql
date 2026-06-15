-- 060_rate_limits.sql
-- Rate limiting condiviso e affidabile su serverless (Vercel).
-- Il limitatore in-memory (Map) NON funziona: ogni invocazione Vercel può girare
-- su un'istanza diversa e usa-e-getta → lo stato in RAM si perde. Serve uno store
-- condiviso. Qui usiamo Postgres con una funzione atomica.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key        text PRIMARY KEY,
  count      int NOT NULL DEFAULT 0,
  reset_at   timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON public.rate_limits (reset_at);

-- Funzione atomica: incrementa il contatore per la chiave nella finestra corrente
-- e ritorna TRUE se la richiesta è ancora dentro il limite, FALSE se va bloccata.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now   timestamptz := now();
  v_count int;
BEGIN
  INSERT INTO public.rate_limits AS rl (key, count, reset_at)
  VALUES (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE
    SET count    = CASE WHEN rl.reset_at < v_now THEN 1 ELSE rl.count + 1 END,
        reset_at = CASE WHEN rl.reset_at < v_now
                        THEN v_now + make_interval(secs => p_window_seconds)
                        ELSE rl.reset_at END
  RETURNING rl.count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

-- Pulizia righe scadute (chiamabile dal cron di backup, opzionale).
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE reset_at < now() - interval '1 hour';
$$;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;
