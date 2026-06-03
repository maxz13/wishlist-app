-- Lower search prefix minimum from 3 → 2 characters.
CREATE OR REPLACE FUNCTION public.search_profiles_by_username_prefix(p_prefix text)
RETURNS TABLE (
  id         uuid,
  name       text,
  surname    text,
  avatar_url text,
  username   text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.name, p.surname, p.avatar_url, p.username
  FROM   public.profiles p
  WHERE  char_length(p_prefix) >= 2
    AND  p.username LIKE lower(p_prefix) || '%'
    AND  p.id <> auth.uid()
  ORDER  BY p.username
  LIMIT  10;
$$;
