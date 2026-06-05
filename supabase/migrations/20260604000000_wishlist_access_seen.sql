-- ============================================================
-- wishlist_access: seen_at for unread indicator
-- ============================================================

-- 1. Add column. NULL = unread; timestamp = user has opened the wishlist.
ALTER TABLE public.wishlist_access
  ADD COLUMN seen_at timestamptz DEFAULT NULL;

-- 2. Backfill all existing rows as already seen.
--    Prevents surprise dots for access grants that predate this feature.
--    COALESCE handles rows where created_at is also NULL (pre-notification migration).
UPDATE public.wishlist_access
  SET seen_at = COALESCE(created_at, now())
  WHERE seen_at IS NULL;

-- 3. SECURITY DEFINER function: updates only seen_at on the caller's own row.
--    Bypasses RLS internally; all constraints enforced via WHERE clause.
--    No UPDATE RLS policy on wishlist_access is required.
CREATE OR REPLACE FUNCTION public.mark_wishlist_access_seen(p_wishlist_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.wishlist_access
    SET    seen_at    = now()
    WHERE  wishlist_id = p_wishlist_id
      AND  user_id     = auth.uid()
      AND  seen_at     IS NULL
      AND  auth.uid()  IS NOT NULL;
$$;
