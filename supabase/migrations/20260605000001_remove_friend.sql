-- Allows a user to remove an existing friendship.
-- Deletes both mirrored rows atomically.
-- SECURITY DEFINER is required — no direct DELETE RLS exists on friendships.
CREATE OR REPLACE FUNCTION public.remove_friend(p_friend_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_friend_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;

  DELETE FROM friendships
  WHERE (user_id = auth.uid() AND friend_id = p_friend_id)
     OR (user_id = p_friend_id AND friend_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;
