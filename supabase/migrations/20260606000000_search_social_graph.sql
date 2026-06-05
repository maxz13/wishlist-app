-- Social-graph-aware friend search.
-- Replaces username-only prefix search with two focused RPCs:
--   search_social_graph: 2nd + 3rd degree connections only, ranked by degree then match quality.
--   search_global: full profiles table for explicit extended search, excluding already-shown IDs.
--
-- The old search_profiles_by_username_prefix is left in place and receives no new callers.

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
    -- Guard: short-circuits all CTEs when prefix is too short.
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
  WHERE  (
           p.username LIKE lower(p_prefix) || '%'
        OR lower(p.name)              LIKE lower(p_prefix) || '%'
        OR lower(p.surname)           LIKE lower(p_prefix) || '%'
        OR transliterate_ru(p.name)    LIKE lower(p_prefix) || '%'
        OR transliterate_ru(p.surname) LIKE lower(p_prefix) || '%'
         )
  ORDER BY
    c.degree,
    CASE
      WHEN p.username = lower(p_prefix)                               THEN 1
      WHEN p.username LIKE lower(p_prefix) || '%'                     THEN 2
      WHEN lower(p.name)              LIKE lower(p_prefix) || '%'     THEN 3
      WHEN lower(p.surname)           LIKE lower(p_prefix) || '%'     THEN 4
      WHEN transliterate_ru(p.name)    LIKE lower(p_prefix) || '%'    THEN 5
      WHEN transliterate_ru(p.surname) LIKE lower(p_prefix) || '%'    THEN 6
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
  WHERE  char_length(p_prefix) >= 2
    AND  p.id <> auth.uid()
    AND  NOT (p.id = ANY(p_exclude_ids))
    AND  (
           p.username LIKE lower(p_prefix) || '%'
        OR lower(p.name)              LIKE lower(p_prefix) || '%'
        OR lower(p.surname)           LIKE lower(p_prefix) || '%'
        OR transliterate_ru(p.name)    LIKE lower(p_prefix) || '%'
        OR transliterate_ru(p.surname) LIKE lower(p_prefix) || '%'
         )
  ORDER BY
    CASE
      WHEN p.username = lower(p_prefix)                               THEN 1
      WHEN p.username LIKE lower(p_prefix) || '%'                     THEN 2
      WHEN lower(p.name)              LIKE lower(p_prefix) || '%'     THEN 3
      WHEN lower(p.surname)           LIKE lower(p_prefix) || '%'     THEN 4
      WHEN transliterate_ru(p.name)    LIKE lower(p_prefix) || '%'    THEN 5
      WHEN transliterate_ru(p.surname) LIKE lower(p_prefix) || '%'    THEN 6
      ELSE 7
    END,
    p.username
  LIMIT 20;
$$;
