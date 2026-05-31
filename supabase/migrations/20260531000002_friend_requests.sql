-- ============================================================
-- Friend Requests
-- Enables direct username-based friend requests as an alternative
-- to the existing token invite flow. Both flows remain active and
-- untouched by this migration.
-- ============================================================


-- ---- Table ----

CREATE TABLE public.friend_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_requests_no_self      CHECK (from_user_id <> to_user_id),
  CONSTRAINT friend_requests_unique_pair  UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX idx_friend_requests_from ON public.friend_requests(from_user_id);
CREATE INDEX idx_friend_requests_to   ON public.friend_requests(to_user_id);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Participants on either end may read their own requests.
-- All mutations go through SECURITY DEFINER RPCs — no direct user policies.
CREATE POLICY "friend_requests_select_own"
  ON public.friend_requests FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());


-- ---- Additional profile visibility ----

-- Allows a user to see the profile of anyone who sent them a request,
-- so the incoming-requests list can display name and avatar.
CREATE POLICY "profiles_select_incoming_request_sender"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.from_user_id = id
        AND fr.to_user_id   = auth.uid()
    )
  );


-- ---- RPCs ----

-- 1. Username prefix search (SECURITY DEFINER — bypasses profiles RLS).
--    Silently returns an empty set when p_prefix is fewer than 3 characters.
CREATE OR REPLACE FUNCTION public.search_profiles_by_username_prefix(p_prefix text)
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
  FROM   public.profiles p
  WHERE  char_length(p_prefix) >= 3
    AND  p.username LIKE lower(p_prefix) || '%'
    AND  p.id <> auth.uid()
  ORDER  BY p.username
  LIMIT  10;
$$;


-- 2. Send a friend request.
--    If a reverse pending request already exists, auto-creates the friendship
--    instead of leaving two pending rows.
CREATE OR REPLACE FUNCTION public.send_friend_request(p_to_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_to_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot send a friend request to yourself';
  END IF;

  IF is_friend(auth.uid(), p_to_user_id) THEN
    RAISE EXCEPTION 'Already friends';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE from_user_id = auth.uid() AND to_user_id = p_to_user_id
  ) THEN
    RAISE EXCEPTION 'Friend request already sent';
  END IF;

  -- Mutual intent: the other user already sent a request → create friendship now.
  IF EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE from_user_id = p_to_user_id AND to_user_id = auth.uid()
  ) THEN
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (auth.uid(), p_to_user_id), (p_to_user_id, auth.uid())
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    DELETE FROM public.friend_requests
    WHERE from_user_id = p_to_user_id AND to_user_id = auth.uid();

    RETURN;
  END IF;

  INSERT INTO public.friend_requests (from_user_id, to_user_id)
  VALUES (auth.uid(), p_to_user_id);
END;
$$;


-- 3. Accept an incoming friend request.
--    Inserts both mirrored friendship rows and cleans up the request plus
--    any reverse request that may have been created in a simultaneous send.
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.friend_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.friend_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found';
  END IF;

  IF v_req.to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised to accept this request';
  END IF;

  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (v_req.from_user_id, v_req.to_user_id),
         (v_req.to_user_id,   v_req.from_user_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  DELETE FROM public.friend_requests WHERE id = p_request_id;

  -- Clean up any reverse request (race-condition residue).
  DELETE FROM public.friend_requests
  WHERE from_user_id = v_req.to_user_id
    AND to_user_id   = v_req.from_user_id;
END;
$$;


-- 4. Decline an incoming friend request (soft dismiss — no block mechanic).
CREATE OR REPLACE FUNCTION public.decline_friend_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.friend_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.friend_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found';
  END IF;

  IF v_req.to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised to decline this request';
  END IF;

  DELETE FROM public.friend_requests WHERE id = p_request_id;
END;
$$;


GRANT EXECUTE ON FUNCTION public.search_profiles_by_username_prefix(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_friend_request(uuid)              TO authenticated;
