-- Phase 1: mutual friend counts in friends list and search results.
--
-- 1. get_mutual_friend_counts — batch RPC for the friends list page.
--    For each user_id in p_user_ids, counts how many of their friends are
--    also friends of auth.uid(). Returns only (user_id, count) pairs where
--    a friendship intersection exists; callers treat missing rows as 0.
--    Does NOT expose which specific users are mutual — count only.
--
-- 2. search_social_graph — extended to include mutual_count per result.
--    Return type changes from 5 to 6 columns; DROP + CREATE required because
--    PostgreSQL does not allow CREATE OR REPLACE to change RETURNS TABLE columns.
--    All matching, ranking, transliteration, degree, and limit logic is preserved
--    verbatim from migration 20260606000003_search_query_transliteration.sql.
--
-- 3. search_global — same extension as search_social_graph.
--    Restructured to CTEs so mutual_counts can join against the matched set.
--    All matching, ranking, transliteration, and limit logic is preserved verbatim.
--
-- After applying: run  NOTIFY pgrst, 'reload schema';  in the SQL editor.


-- ─── 1. get_mutual_friend_counts ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_mutual_friend_counts(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, mutual_count int)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT  f2.user_id,
          COUNT(*)::int AS mutual_count
  FROM    friendships f2
  WHERE   f2.user_id   = ANY(p_user_ids)
    AND   f2.friend_id IN (
            SELECT f1.friend_id
            FROM   friendships f1
            WHERE  f1.user_id = auth.uid()
          )
  GROUP BY f2.user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_mutual_friend_counts(uuid[]) TO authenticated;


-- ─── 2. search_social_graph (extended return type) ───────────────────────────

-- DROP required: PostgreSQL rejects CREATE OR REPLACE when RETURNS TABLE columns change.
-- No database objects depend on this function (callers are application-level RPC only).
DROP FUNCTION IF EXISTS public.search_social_graph(text);

CREATE FUNCTION public.search_social_graph(p_prefix text)
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
    -- Transliterate the query once; reused in WHERE and ORDER BY.
    translit_prefix AS (
      SELECT transliterate_ru(lower(p_prefix)) AS v
    ),
    -- Guard: short-circuits all graph CTEs when prefix is too short.
    my_friends AS (
      SELECT friend_id
      FROM   friendships
      WHERE  user_id = auth.uid()
        AND  char_length(p_prefix) >= 2
    ),
    -- 2nd degree: friends-of-friends, excluding self and direct friends.
    fof AS (
      SELECT DISTINCT f2.friend_id AS id
      FROM   friendships f2
      WHERE  f2.user_id    IN (SELECT friend_id FROM my_friends)
        AND  f2.friend_id <> auth.uid()
        AND  f2.friend_id NOT IN (SELECT friend_id FROM my_friends)
    ),
    -- 3rd degree: friends-of-fof, excluding self, direct friends, and fof.
    fofof AS (
      SELECT DISTINCT f3.friend_id AS id
      FROM   friendships f3
      WHERE  f3.user_id    IN (SELECT id FROM fof)
        AND  f3.friend_id <> auth.uid()
        AND  f3.friend_id NOT IN (SELECT friend_id FROM my_friends)
        AND  f3.friend_id NOT IN (SELECT id FROM fof)
    ),
    candidates AS (
      SELECT id, 2 AS degree FROM fof
      UNION ALL
      SELECT id, 3 AS degree FROM fofof
    ),
    -- Mutual friend count per candidate: how many of their friends are also
    -- in the current user's friend set. Uses my_friends which is empty when
    -- p_prefix < 2 chars, so all mutual_counts COALESCE to 0 in that case.
    mutual_counts AS (
      SELECT  f2.user_id,
              COUNT(*)::int AS mutual_count
      FROM    friendships f2
      WHERE   f2.user_id   IN (SELECT id FROM candidates)
        AND   f2.friend_id IN (SELECT friend_id FROM my_friends)
      GROUP BY f2.user_id
    )
  SELECT p.id, p.name, p.surname, p.avatar_url, p.username,
         COALESCE(mc.mutual_count, 0) AS mutual_count
  FROM   candidates c
  JOIN   profiles p   ON p.id = c.id
  CROSS  JOIN translit_prefix tp
  LEFT   JOIN mutual_counts mc ON mc.user_id = p.id
  WHERE  (
           p.username        LIKE lower(p_prefix) || '%'
        OR p.username        LIKE tp.v            || '%'
        OR lower(p.name)     LIKE lower(p_prefix) || '%'
        OR lower(p.name)     LIKE tp.v            || '%'
        OR lower(p.surname)  LIKE lower(p_prefix) || '%'
        OR lower(p.surname)  LIKE tp.v            || '%'
        OR transliterate_ru(p.name)    LIKE lower(p_prefix) || '%'
        OR transliterate_ru(p.surname) LIKE lower(p_prefix) || '%'
         )
  ORDER BY
    c.degree,
    CASE
      WHEN p.username = lower(p_prefix)                                THEN 1
      WHEN p.username = tp.v                                           THEN 1
      WHEN p.username        LIKE lower(p_prefix) || '%'               THEN 2
      WHEN p.username        LIKE tp.v            || '%'               THEN 2
      WHEN lower(p.name)     LIKE lower(p_prefix) || '%'               THEN 3
      WHEN lower(p.name)     LIKE tp.v            || '%'               THEN 3
      WHEN lower(p.surname)  LIKE lower(p_prefix) || '%'               THEN 4
      WHEN lower(p.surname)  LIKE tp.v            || '%'               THEN 4
      WHEN transliterate_ru(p.name)    LIKE lower(p_prefix) || '%'     THEN 5
      WHEN transliterate_ru(p.surname) LIKE lower(p_prefix) || '%'     THEN 6
      ELSE 7
    END,
    p.username
  LIMIT 15;
$$;

GRANT EXECUTE ON FUNCTION public.search_social_graph(text) TO authenticated;


-- ─── 3. search_global (extended return type) ─────────────────────────────────

DROP FUNCTION IF EXISTS public.search_global(text, uuid[]);

CREATE FUNCTION public.search_global(p_prefix text, p_exclude_ids uuid[])
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
    -- Transliterate the query once; reused across WHERE and ORDER BY.
    translit_prefix AS (
      SELECT transliterate_ru(lower(p_prefix)) AS v
    ),
    my_friends AS (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid()
    ),
    -- All profiles matching the prefix conditions (identical logic to prior version).
    matching AS (
      SELECT p.id, p.name, p.surname, p.avatar_url, p.username
      FROM   profiles p
      CROSS  JOIN translit_prefix tp
      WHERE  char_length(p_prefix) >= 2
        AND  p.id <> auth.uid()
        AND  NOT (p.id = ANY(p_exclude_ids))
        AND  (
               p.username        LIKE lower(p_prefix) || '%'
            OR p.username        LIKE tp.v            || '%'
            OR lower(p.name)     LIKE lower(p_prefix) || '%'
            OR lower(p.name)     LIKE tp.v            || '%'
            OR lower(p.surname)  LIKE lower(p_prefix) || '%'
            OR lower(p.surname)  LIKE tp.v            || '%'
            OR transliterate_ru(p.name)    LIKE lower(p_prefix) || '%'
            OR transliterate_ru(p.surname) LIKE lower(p_prefix) || '%'
             )
    ),
    mutual_counts AS (
      SELECT  f2.user_id,
              COUNT(*)::int AS mutual_count
      FROM    friendships f2
      WHERE   f2.user_id   IN (SELECT id FROM matching)
        AND   f2.friend_id IN (SELECT friend_id FROM my_friends)
      GROUP BY f2.user_id
    )
  SELECT m.id, m.name, m.surname, m.avatar_url, m.username,
         COALESCE(mc.mutual_count, 0) AS mutual_count
  FROM   matching m
  CROSS  JOIN translit_prefix tp
  LEFT   JOIN mutual_counts mc ON mc.user_id = m.id
  ORDER BY
    CASE
      WHEN m.username = lower(p_prefix)                                THEN 1
      WHEN m.username = tp.v                                           THEN 1
      WHEN m.username        LIKE lower(p_prefix) || '%'               THEN 2
      WHEN m.username        LIKE tp.v            || '%'               THEN 2
      WHEN lower(m.name)     LIKE lower(p_prefix) || '%'               THEN 3
      WHEN lower(m.name)     LIKE tp.v            || '%'               THEN 3
      WHEN lower(m.surname)  LIKE lower(p_prefix) || '%'               THEN 4
      WHEN lower(m.surname)  LIKE tp.v            || '%'               THEN 4
      WHEN transliterate_ru(m.name)    LIKE lower(p_prefix) || '%'     THEN 5
      WHEN transliterate_ru(m.surname) LIKE lower(p_prefix) || '%'     THEN 6
      ELSE 7
    END,
    m.username
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.search_global(text, uuid[]) TO authenticated;
