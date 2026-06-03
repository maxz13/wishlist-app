-- ============================================================
-- Wishlist Item Visibility / Draft Mode
-- ============================================================

-- Existing rows become visible (default true).
-- New items are inserted as is_visible: false by the application layer.
ALTER TABLE public.wishlist_items
  ADD COLUMN is_visible boolean NOT NULL DEFAULT true;


-- ---- wishlist_items SELECT ----
-- Friends now only see visible items. Owner sees all.

DROP POLICY "wishlist_items_select_if_can_see_wishlist" ON public.wishlist_items;

CREATE POLICY "wishlist_items_select_owner_or_visible_friend"
  ON public.wishlist_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_id
        AND (
          w.owner_id = auth.uid()
          OR (is_friend(auth.uid(), w.owner_id) AND is_visible = true)
        )
    )
  );


-- ---- reservations INSERT ----
-- Friends cannot reserve draft items even if they know the UUID.

DROP POLICY "reservations_insert_if_friend_of_owner" ON public.reservations;

CREATE POLICY "reservations_insert_if_friend_of_owner"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (
    reserved_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.wishlist_items wi
      JOIN public.wishlists w ON w.id = wi.wishlist_id
      WHERE wi.id = wishlist_item_id
        AND is_friend(auth.uid(), w.owner_id)
        AND wi.is_visible = true
    )
  );
