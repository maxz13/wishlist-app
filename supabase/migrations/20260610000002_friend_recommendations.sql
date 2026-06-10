-- Phase 3: Friend Recommendations
--
-- 1. friend_recommendation_dismissals
--    Stores per-user dismissals. Dismissed profiles are excluded from
--    get_friend_recommendations for that user permanently.
--    RLS (not SECURITY DEFINER) is sufficient — users only write their own rows.
--
-- 2. get_friend_recommendations(p_limit int)
--    Returns friend-of-friend recommendations ranked by:
--      mutual_count DESC, visible_wishlist_count DESC, visible_item_count DESC, username ASC
--    Excludes: existing friends, self, pending outgoing requests, dismissals.
--    Traverses ALL friendships regardless of friends_list_visibility — that flag
--    is display-only and must not affect graph logic (see 20260610000001).
--
-- After applying: run  NOTIFY pgrst, 'reload schema';  in the SQL editor.


-- ─── 1. friend_recommendation_dismissals ─────────────────────────────────────

CREATE TABLE public.friend_recommendation_dismissals (
  user_id           uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dismissed_user_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dismissed_user_id)
);

ALTER TABLE public.friend_recommendation_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can only read and write their own dismissal rows.
CREATE POLICY "dismissals_own"
  ON public.friend_recommendation_dismissals
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ─── 2. get_friend_recommendations ───────────────────────────────────────────

CREATE FUNCTION public.get_friend_recommendations(p_limit int DEFAULT 20)
RETURNS TABLE (
  id           uuid,
  name         text,
  surname      text,
  avatar_url   text,
  username     text,
  mutual_count int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH
    my_friends AS (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid()
    ),
    -- 2nd-degree candidates: friends-of-friends only (not 3rd degree).
    -- Traverses ALL friendships regardless of friends_list_visibility
    -- (display-only flag — does not affect graph logic).
    -- Excludes: self, existing friends, pending outgoing requests, dismissals.
    fof AS (
      SELECT DISTINCT f2.friend_id AS candidate_id
      FROM   friendships f2
      WHERE  f2.user_id IN (SELECT friend_id FROM my_friends)
        AND  f2.friend_id <> auth.uid()
        AND  f2.friend_id NOT IN (SELECT friend_id FROM my_friends)
        AND  f2.friend_id NOT IN (
               SELECT to_user_id FROM friend_requests WHERE from_user_id = auth.uid()
             )
        AND  f2.friend_id NOT IN (
               SELECT dismissed_user_id FROM friend_recommendation_dismissals
               WHERE  user_id = auth.uid()
             )
    ),
    -- Mutual friend count: how many of my_friends are also friends with each candidate.
    -- Always >= 1 for any FOF (the shared friend through whom they were found).
    mutual_counts AS (
      SELECT  f2.user_id    AS candidate_id,
              COUNT(*)::int AS cnt
      FROM    friendships f2
      WHERE   f2.user_id   IN (SELECT candidate_id FROM fof)
        AND   f2.friend_id IN (SELECT friend_id FROM my_friends)
      GROUP BY f2.user_id
    ),
    -- Visible wishlists (all_friends, not archived) — used for ranking only.
    visible_wishlists AS (
      SELECT owner_id, id AS wishlist_id
      FROM   wishlists
      WHERE  owner_id    IN (SELECT candidate_id FROM fof)
        AND  visibility  = 'all_friends'
        AND  is_archived = false
    ),
    wishlist_counts AS (
      SELECT owner_id AS candidate_id, COUNT(*)::int AS cnt
      FROM   visible_wishlists
      GROUP BY owner_id
    ),
    -- Visible items in those wishlists — used for ranking only.
    item_counts AS (
      SELECT  vw.owner_id AS candidate_id,
              COUNT(*)::int AS cnt
      FROM    visible_wishlists vw
      JOIN    wishlist_items wi ON wi.wishlist_id = vw.wishlist_id
      WHERE   wi.is_visible = true
      GROUP BY vw.owner_id
    )
  SELECT
    p.id,
    p.name,
    p.surname,
    p.avatar_url,
    p.username,
    COALESCE(mc.cnt, 0) AS mutual_count
  FROM   fof f
  JOIN   profiles p ON p.id = f.candidate_id
  LEFT JOIN mutual_counts  mc ON mc.candidate_id = f.candidate_id
  LEFT JOIN wishlist_counts wc ON wc.candidate_id = f.candidate_id
  LEFT JOIN item_counts    ic ON ic.candidate_id = f.candidate_id
  ORDER BY
    COALESCE(mc.cnt, 0) DESC,
    COALESCE(wc.cnt, 0) DESC,
    COALESCE(ic.cnt, 0) DESC,
    p.username           ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_recommendations(int) TO authenticated;
