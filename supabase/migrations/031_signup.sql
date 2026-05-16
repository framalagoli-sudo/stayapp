-- Sprint 7: Self-signup + Trial

-- Platform configuration (single row, id = 1 enforced by CHECK)
CREATE TABLE IF NOT EXISTS public.platform_config (
  id             int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  signup_enabled boolean DEFAULT false,
  updated_at     timestamptz DEFAULT now()
);

INSERT INTO public.platform_config (id, signup_enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- anon needs SELECT to check signup_enabled on the public /signup page
GRANT SELECT ON public.platform_config TO anon;
GRANT SELECT, UPDATE ON public.platform_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.platform_config TO service_role;

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Trial + subscription tracking on aziende
ALTER TABLE public.aziende
  ADD COLUMN IF NOT EXISTS trial_ends_at       timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none';
-- subscription_status: 'trial' | 'active' | 'canceled' | 'none'
