-- Update handle_new_user to also persist birthday from registration metadata.
-- birthday is optional in the schema; existing users without it get NULL.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, surname, birthday)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'surname', ''),
    CASE
      WHEN (NEW.raw_user_meta_data->>'birthday') IS NOT NULL
        AND (NEW.raw_user_meta_data->>'birthday') <> ''
      THEN (NEW.raw_user_meta_data->>'birthday')::date
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;
