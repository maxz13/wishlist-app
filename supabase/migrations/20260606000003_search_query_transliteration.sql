-- Add Cyrillic-query → Latin-field matching to both search RPCs.
--
-- Problem: searching "Вит" did not find a user with username/name "Vitalii".
-- The RPCs transliterate *profile fields* to match Latin queries, but never
-- transliterate *the query itself* to match Latin fields.
--
-- Fix: compute transliterate_ru(lower(p_prefix)) once and add three new conditions:
--   p.username        LIKE <translit_query> || '%'   → rank 2 (same as username prefix)
--   lower(p.name)     LIKE <translit_query> || '%'   → rank 3 (same as name prefix)
--   lower(p.surname)  LIKE <translit_query> || '%'   → rank 4 (same as surname prefix)
--
-- When p_prefix is already Latin, transliterate_ru returns it unchanged,
-- so the new conditions become exact duplicates of existing ones — harmless.
--
-- No functional indexes are affected. No RLS changes. No UI changes.

CREATE OR REPLACE FUNCTION public.search_social_graph(p_prefix text)
RETURNS TABLE (
  id         uuid,
  name       text,
  surname    text,
  avatar_url text,
  username   text
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
    )
  SELECT p.id, p.name, p.surname, p.avatar_url, p.username
  FROM   candidates c
  JOIN   profiles p ON p.id = c.id
  CROSS  JOIN translit_prefix tp
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


CREATE OR REPLACE FUNCTION public.search_global(p_prefix text, p_exclude_ids uuid[])
RETURNS TABLE (
  id         uuid,
  name       text,
  surname    text,
  avatar_url text,
  username   text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.name, p.surname, p.avatar_url, p.username
  FROM   profiles p
  -- Transliterate the query once via inline subquery.
  CROSS  JOIN (SELECT transliterate_ru(lower(p_prefix)) AS v) AS tp
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
  ORDER BY
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
  LIMIT 20;
$$;
