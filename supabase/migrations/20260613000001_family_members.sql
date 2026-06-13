-- ============================================================
-- Family Members
--
-- Allows users to designate a subset of their friends as "family".
-- Family is directional — same philosophy as the friendships table:
-- A having B in their family does not imply B has A in theirs.
--
-- Membership is managed exclusively through update_family_members(),
-- which enforces the is_friend() constraint before inserting.
--
-- remove_friend() is updated to clean up family_members rows in
-- both directions when a friendship is dissolved.
--
-- After applying: run  NOTIFY pgrst, 'reload schema';  in SQL editor.
-- ============================================================


-- ---- TABLE ----

CREATE TABLE public.family_members (
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_user_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, family_user_id),
  CONSTRAINT family_no_self CHECK (user_id <> family_user_id)
);

-- Efficient lookup: "which users have person X in their family?"
CREATE INDEX idx_family_members_family_user_id ON public.family_members(family_user_id);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Users can only read and write their own family rows.
-- All mutations go through update_family_members() SECURITY DEFINER,
-- which enforces the is_friend() guard before inserting.
CREATE POLICY "family_members_own"
  ON public.family_members FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ---- RPC: update_family_members ----
-- Replace-all pattern: deletes the caller's current family list and
-- re-inserts only the IDs that pass the is_friend() check.
-- IDs that are no longer friends are silently dropped.
-- Passing NULL or an empty array clears the family list entirely.

CREATE OR REPLACE FUNCTION public.update_family_members(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clear existing family list for this user.
  DELETE FROM family_members WHERE user_id = auth.uid();

  -- Re-insert only IDs that are current friends.
  -- unnest(NULL) and unnest('{}') both return 0 rows — no-op on empty input.
  INSERT INTO family_members (user_id, family_user_id)
  SELECT DISTINCT auth.uid(), id
  FROM   unnest(p_ids) AS id
  WHERE  is_friend(auth.uid(), id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_family_members(uuid[]) TO authenticated;


-- ---- UPDATE: remove_friend ----
-- Adds family_members cleanup in both directions before deleting
-- friendship rows. Prevents stale family rows after unfriending.
-- Runs atomically in the same transaction as the existing cleanup.

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

  -- Remove family membership in both directions.
  DELETE FROM family_members
  WHERE (user_id = auth.uid() AND family_user_id = p_friend_id)
     OR (user_id = p_friend_id AND family_user_id = auth.uid());

  -- Remove cross-wishlist-access in both directions before deleting friendship rows.
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
