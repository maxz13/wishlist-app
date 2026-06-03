-- Targeted fix: restore is_username_available RPC that was missing from remote.
-- Idempotent — safe to run even if the function already exists.

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = lower(trim(p_username))
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;
