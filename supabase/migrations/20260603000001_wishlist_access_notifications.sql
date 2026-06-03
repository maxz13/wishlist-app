-- ============================================================
-- wishlist_access: add created_at for activity feed events
-- ============================================================

-- Step 1: Add column without DEFAULT so existing rows get NULL.
--         NULL rows are excluded from "created_at >= 7 days ago" queries,
--         preventing old access grants from generating spurious feed events.
ALTER TABLE public.wishlist_access
  ADD COLUMN created_at timestamptz;

-- Step 2: Set default for future inserts only.
ALTER TABLE public.wishlist_access
  ALTER COLUMN created_at SET DEFAULT now();


-- ============================================================
-- wishlist_access: self-select policy
-- Allows each user to read their own access rows.
-- Required for the home-feed wishlist_access_granted query.
-- Write access (INSERT / UPDATE / DELETE) remains owner-only
-- via the existing wishlist_access_owner policy WITH CHECK.
-- ============================================================

CREATE POLICY "wishlist_access_self_select"
  ON public.wishlist_access FOR SELECT TO authenticated
  USING (user_id = auth.uid());
