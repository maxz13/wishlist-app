-- Updates remove_friend to also delete wishlist_access rows between the two users.
-- Runs in the same transaction — if either DELETE fails, both roll back.
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

  -- Remove cross-access in both directions before deleting friendship rows.
  DELETE FROM wishlist_access
  WHERE (
    user_id = p_friend_id
    AND wishlist_id IN (SELECT id FROM wishlists WHERE owner_id = auth.uid())
  )
  OR (
    user_id = auth.uid()
    AND wishlist_id IN (SELECT id FROM wishlists WHERE owner_id = p_friend_id)
  );

  DELETE FROM friendships
  WHERE (user_id = auth.uid() AND friend_id = p_friend_id)
     OR (user_id = p_friend_id AND friend_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;
