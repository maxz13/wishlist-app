-- Allow a user to see the profile of someone who has reserved a visible item
-- on a wishlist accessible to them.
-- The existing profiles_select_own_or_friend policy is unchanged.
-- Postgres ORs permissive policies together, so this adds an access path.

CREATE POLICY "profiles_select_reserver_of_visible_item"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reservations r
      JOIN public.wishlist_items wi ON wi.id = r.wishlist_item_id
      JOIN public.wishlists w ON w.id = wi.wishlist_id
      WHERE r.reserved_by_user_id = profiles.id
        AND wi.is_visible = true
        AND (w.owner_id = auth.uid() OR is_friend(auth.uid(), w.owner_id))
    )
  );
