-- Allows an invited user to remove themselves from a private wishlist.
-- SECURITY DEFINER is required because wishlist_access has no DELETE RLS for non-owners.
CREATE OR REPLACE FUNCTION leave_wishlist_access(p_wishlist_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM wishlist_access
  WHERE wishlist_id = p_wishlist_id
    AND user_id = auth.uid();
END;
$$;
