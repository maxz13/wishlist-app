-- ============================================================
-- Wishlist Archiving — RLS policy updates
--
-- is_archived already exists on wishlists (DEFAULT false).
-- This migration restricts friend visibility so that archived
-- wishlists, their items, and their reservations are hidden
-- from friends. Owners always retain full access.
-- ============================================================


-- ---- wishlists SELECT ----
-- Friends may only see non-archived wishlists.

DROP POLICY "wishlists_select_owner_or_friend" ON public.wishlists;

CREATE POLICY "wishlists_select_owner_or_friend"
  ON public.wishlists FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (is_friend(auth.uid(), owner_id) AND NOT is_archived)
  );


-- ---- wishlist_items SELECT ----
-- Friends may only see items whose parent wishlist is not archived.

DROP POLICY "wishlist_items_select_owner_or_visible_friend" ON public.wishlist_items;

CREATE POLICY "wishlist_items_select_owner_or_visible_friend"
  ON public.wishlist_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND (
          w.owner_id = auth.uid()
          OR (is_friend(auth.uid(), w.owner_id) AND wishlist_items.is_visible = true AND NOT w.is_archived)
        )
    )
  );


-- ---- reservations SELECT ----
-- Friends may only see reservations on items in non-archived wishlists.

DROP POLICY "reservations_select_if_can_see_wishlist" ON public.reservations;

CREATE POLICY "reservations_select_if_can_see_wishlist"
  ON public.reservations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wishlist_items wi
      JOIN public.wishlists w ON w.id = wi.wishlist_id
      WHERE wi.id = reservations.wishlist_item_id
        AND (
          w.owner_id = auth.uid()
          OR (is_friend(auth.uid(), w.owner_id) AND NOT w.is_archived)
        )
    )
  );


-- ---- reservations INSERT ----
-- Friends may not reserve items in archived wishlists.

DROP POLICY "reservations_insert_if_friend_of_owner" ON public.reservations;

CREATE POLICY "reservations_insert_if_friend_of_owner"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (
    reserved_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.wishlist_items wi
      JOIN public.wishlists w ON w.id = wi.wishlist_id
      WHERE wi.id = reservations.wishlist_item_id
        AND is_friend(auth.uid(), w.owner_id)
        AND wi.is_visible = true
        AND NOT w.is_archived
    )
  );
