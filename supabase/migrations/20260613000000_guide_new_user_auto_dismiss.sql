-- New users get all feature guides pre-dismissed at registration time.
-- Existing users with NULL remain eligible for the guides they haven't seen.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  v_username := lower(trim(COALESCE(
    nullif(trim(NEW.raw_user_meta_data->>'username'), ''),
    generate_username(
      COALESCE(NEW.raw_user_meta_data->>'name',    ''),
      COALESCE(NEW.raw_user_meta_data->>'surname', '')
    )
  )));

  INSERT INTO public.profiles (
    id, email, name, surname, birthday, username,
    wishlist_expiration_guide_completed_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name',    ''),
    COALESCE(NEW.raw_user_meta_data->>'surname', ''),
    CASE
      WHEN (NEW.raw_user_meta_data->>'birthday') IS NOT NULL
        AND (NEW.raw_user_meta_data->>'birthday') <> ''
      THEN (NEW.raw_user_meta_data->>'birthday')::date
      ELSE NULL
    END,
    v_username,
    now()
  );
  RETURN NEW;
END;
$$;
