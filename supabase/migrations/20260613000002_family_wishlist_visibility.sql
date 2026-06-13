-- ============================================================
-- Family Wishlist Visibility
--
-- Adds 'family' as a new visibility mode for wishlists.
-- A 'family' wishlist is visible to friends who appear in the
-- owner's family_members rows — determined dynamically at query
-- time, requiring no per-wishlist rows in wishlist_access.
--
-- Only two changes:
--   1. Extend the CHECK constraint on wishlists.visibility.
--   2. Add the 'family' branch to can_friend_see_wishlist().
-- ============================================================


-- ---- wishlists: extend visibility constraint ----

ALTER TABLE public.wishlists
  DROP CONSTRAINT wishlists_visibility_check,
  ADD CONSTRAINT wishlists_visibility_check
    CHECK (visibility IN ('all_friends', 'family', 'private', 'selected_friends'));


-- ---- can_friend_see_wishlist: add 'family' branch ----

CREATE OR REPLACE FUNCTION public.can_friend_see_wishlist(caller uuid, wl_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wishlists w
    WHERE w.id = wl_id
      AND NOT w.is_archived
      AND CASE w.visibility
        WHEN 'all_friends' THEN
          is_friend(caller, w.owner_id)
        WHEN 'family' THEN
          is_friend(caller, w.owner_id)
          AND EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.user_id = w.owner_id
              AND fm.family_user_id = caller
          )
        WHEN 'selected_friends' THEN
          is_friend(caller, w.owner_id)
          AND EXISTS (
            SELECT 1 FROM public.wishlist_access wa
            WHERE wa.wishlist_id = w.id AND wa.user_id = caller
          )
        ELSE false  -- 'private'
      END
  )
$$;
