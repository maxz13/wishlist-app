-- Phase 2a: friends_list_visibility on profiles
--
-- Controls whether a user's full friends list is visible to their friends.
-- 'friends'  — friends can see the full list on the detail page (default)
-- 'private'  — friends see only mutual friends; full list is hidden
--
-- This is a display-only flag. It does NOT affect graph traversal for
-- recommendations or mutual-count computation (both use SECURITY DEFINER
-- RPCs that read friendships directly, bypassing this setting).
--
-- Phase 2c (profile toggle UI) is deferred; default 'friends' preserves
-- current implicit behavior for all existing users.

ALTER TABLE profiles
  ADD COLUMN friends_list_visibility text NOT NULL DEFAULT 'friends'
  CHECK (friends_list_visibility IN ('friends', 'private'));


-- ─── get_mutual_friends ───────────────────────────────────────────────────────
-- Returns profiles of users who are friends with BOTH auth.uid() and p_friend_id.
-- Friendship guard: caller must be friends with p_friend_id.
-- auth.uid() is excluded from results (caller IS in target's friend list).

CREATE FUNCTION public.get_mutual_friends(p_friend_id uuid)
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
  FROM   friendships f
  JOIN   profiles p ON p.id = f.friend_id
  WHERE  f.user_id    = p_friend_id
    AND  f.friend_id IN (SELECT friend_id FROM friendships WHERE user_id = auth.uid())
    AND  f.friend_id <> auth.uid()
    AND  EXISTS (
           SELECT 1 FROM friendships
           WHERE  user_id = auth.uid() AND friend_id = p_friend_id
         )
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_mutual_friends(uuid) TO authenticated;


-- ─── get_friends_of_friend ────────────────────────────────────────────────────
-- Returns p_friend_id's friends who are NOT already friends with auth.uid()
-- (i.e. non-mutual friends, so callers can render them separately from the
-- mutual section without duplication).
--
-- Friendship guard: caller must be friends with p_friend_id.
-- Privacy guard:    returns empty if target has friends_list_visibility = 'private'.
-- auth.uid() is excluded from results.
-- Mutual friends are excluded (NOT IN caller's friend list).

CREATE FUNCTION public.get_friends_of_friend(p_friend_id uuid)
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
  FROM   friendships f
  JOIN   profiles p ON p.id = f.friend_id
  WHERE  f.user_id    = p_friend_id
    AND  f.friend_id <> auth.uid()
    AND  f.friend_id NOT IN (
           SELECT friend_id FROM friendships WHERE user_id = auth.uid()
         )
    AND  EXISTS (
           SELECT 1 FROM friendships
           WHERE  user_id = auth.uid() AND friend_id = p_friend_id
         )
    AND  (SELECT friends_list_visibility FROM profiles WHERE id = p_friend_id) = 'friends'
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_friends_of_friend(uuid) TO authenticated;
