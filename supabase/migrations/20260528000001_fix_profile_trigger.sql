-- ============================================================
-- Fix handle_new_user trigger to handle missing/empty metadata.
-- Previously COALESCE fell back to '' which violated CHECK (name <> '').
-- NULLIF converts '' to NULL first, then COALESCE picks a safe default.
-- ON CONFLICT DO NOTHING prevents duplicate-key errors on re-runs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, surname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), 'Участник'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'surname', ''), NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ============================================================
-- Backfill profiles for any auth users that have none.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
-- ============================================================

INSERT INTO public.profiles (id, email, name, surname)
SELECT
  u.id,
  u.email,
  COALESCE(NULLIF(u.raw_user_meta_data->>'name',    ''), 'Участник'),
  COALESCE(NULLIF(u.raw_user_meta_data->>'surname', ''), u.email)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
