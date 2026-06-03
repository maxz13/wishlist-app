-- ============================================================
-- Wishlist Visibility — per-wishlist access control
-- ============================================================


-- ---- wishlists: add visibility column ----
-- Backfills existing rows to 'all_friends' (preserves current behavior).

ALTER TABLE public.wishlists
  ADD COLUMN visibility text NOT NULL DEFAULT 'all_friends'
    CHECK (visibility IN ('all_friends', 'private', 'selected_friends'));


-- ---- TABLE: wishlist_access ----
-- Rows exist only when visibility = 'selected_friends'.
-- ON DELETE CASCADE cleans up when wishlist or user is deleted.

CREATE TABLE public.wishlist_access (
  wishlist_id uuid NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (wishlist_id, user_id)
);

CREATE INDEX idx_wishlist_access_user_id ON public.wishlist_access(user_id);

ALTER TABLE public.wishlist_access ENABLE ROW LEVEL SECURITY;

-- Only the wishlist owner can read or write the access list.
CREATE POLICY "wishlist_access_owner"
  ON public.wishlist_access FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_id AND w.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_id AND w.owner_id = auth.uid()
    )
  );


-- ---- FUNCTION: can_friend_see_wishlist ----
-- Determines whether a non-owner caller may see a given wishlist.
-- SECURITY DEFINER avoids recursive RLS evaluation.
-- Called from wishlist/item/reservation SELECT and reservation INSERT policies.

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


-- ---- wishlists SELECT ----

DROP POLICY "wishlists_select_owner_or_friend" ON public.wishlists;

CREATE POLICY "wishlists_select_owner_or_friend"
  ON public.wishlists FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR can_friend_see_wishlist(auth.uid(), id)
  );


-- ---- wishlist_items SELECT ----

DROP POLICY "wishlist_items_select_owner_or_visible_friend" ON public.wishlist_items;

CREATE POLICY "wishlist_items_select_owner_or_visible_friend"
  ON public.wishlist_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND (
          w.owner_id = auth.uid()
          OR (
            wishlist_items.is_visible = true
            AND can_friend_see_wishlist(auth.uid(), w.id)
          )
        )
    )
  );


-- ---- reservations SELECT ----

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
          OR can_friend_see_wishlist(auth.uid(), w.id)
        )
    )
  );


-- ---- reservations INSERT ----

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
        AND wi.is_visible = true
        AND can_friend_see_wishlist(auth.uid(), w.id)
    )
  );
