-- ============================================================
-- Family Requests — Phase 3a
--
-- Adds a mutual-consent flow for family relationships:
--   1. family_requests   — pending invitations (delete-on-resolve)
--   2. family_request_declines — feed-readable records for the sender
--   3. RPCs: send / accept / decline / remove
--   4. Updates remove_friend() to clean up all family state
--
-- family_members table is unchanged. Accepting an invitation
-- inserts both directions there, same as friendships.
--
-- After applying: run  NOTIFY pgrst, 'reload schema';  in SQL editor.
-- ============================================================


-- ---- family_requests ----------------------------------------

CREATE TABLE public.family_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT family_requests_no_self     CHECK (from_user_id <> to_user_id),
  CONSTRAINT family_requests_unique_pair UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX idx_family_requests_from ON public.family_requests(from_user_id);
CREATE INDEX idx_family_requests_to   ON public.family_requests(to_user_id);

ALTER TABLE public.family_requests ENABLE ROW LEVEL SECURITY;

-- Both participants may read; all mutations go through SECURITY DEFINER RPCs.
CREATE POLICY "family_requests_select_own"
  ON public.family_requests FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());


-- ---- family_request_declines --------------------------------
-- Written when a recipient declines, so the sender sees a feed event.
-- Only the original sender reads their own decline records.

CREATE TABLE public.family_request_declines (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  declined_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_request_declines_from ON public.family_request_declines(from_user_id);
CREATE INDEX idx_family_request_declines_to   ON public.family_request_declines(to_user_id);

ALTER TABLE public.family_request_declines ENABLE ROW LEVEL SECURITY;

-- Only the original sender sees that their invitation was declined.
CREATE POLICY "family_request_declines_sender_read"
  ON public.family_request_declines FOR SELECT TO authenticated
  USING (from_user_id = auth.uid());


-- ---- Profile visibility for family request senders ----------
-- Allows a recipient to read the profile of whoever sent them a
-- family request, so the notification card can display name/avatar.

CREATE POLICY "profiles_select_incoming_family_request_sender"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_requests fr
      WHERE fr.from_user_id = id
        AND fr.to_user_id   = auth.uid()
    )
  );


-- ---- RPC: send_family_request --------------------------------
-- Guards: must be friends, no existing family relationship,
-- no duplicate pending request. If the target already sent a
-- request in the reverse direction, auto-accepts instead.

CREATE OR REPLACE FUNCTION public.send_family_request(p_to_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_to_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot send a family request to yourself';
  END IF;

  IF NOT is_friend(auth.uid(), p_to_user_id) THEN
    RAISE EXCEPTION 'Can only invite friends to family';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid() AND family_user_id = p_to_user_id
  ) THEN
    RAISE EXCEPTION 'Already family members';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.family_requests
    WHERE from_user_id = auth.uid() AND to_user_id = p_to_user_id
  ) THEN
    RAISE EXCEPTION 'Family request already sent';
  END IF;

  -- Mutual intent: other user already sent a request → accept immediately.
  IF EXISTS (
    SELECT 1 FROM public.family_requests
    WHERE from_user_id = p_to_user_id AND to_user_id = auth.uid()
  ) THEN
    INSERT INTO public.family_members (user_id, family_user_id)
    VALUES (auth.uid(), p_to_user_id), (p_to_user_id, auth.uid())
    ON CONFLICT (user_id, family_user_id) DO NOTHING;

    DELETE FROM public.family_requests
    WHERE from_user_id = p_to_user_id AND to_user_id = auth.uid();

    RETURN;
  END IF;

  INSERT INTO public.family_requests (from_user_id, to_user_id)
  VALUES (auth.uid(), p_to_user_id);
END;
$$;


-- ---- RPC: accept_family_request ------------------------------
-- Inserts both mirrored family_members rows and deletes the request.

CREATE OR REPLACE FUNCTION public.accept_family_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.family_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.family_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Family request not found';
  END IF;

  IF v_req.to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised to accept this request';
  END IF;

  INSERT INTO public.family_members (user_id, family_user_id)
  VALUES (v_req.from_user_id, v_req.to_user_id),
         (v_req.to_user_id,   v_req.from_user_id)
  ON CONFLICT (user_id, family_user_id) DO NOTHING;

  DELETE FROM public.family_requests WHERE id = p_request_id;

  -- Clean up any reverse request (race-condition residue).
  DELETE FROM public.family_requests
  WHERE from_user_id = v_req.to_user_id
    AND to_user_id   = v_req.from_user_id;
END;
$$;


-- ---- RPC: decline_family_request -----------------------------
-- Records the decline for the sender's feed, then deletes the request.

CREATE OR REPLACE FUNCTION public.decline_family_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.family_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.family_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Family request not found';
  END IF;

  IF v_req.to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised to decline this request';
  END IF;

  INSERT INTO public.family_request_declines (from_user_id, to_user_id)
  VALUES (v_req.from_user_id, v_req.to_user_id);

  DELETE FROM public.family_requests WHERE id = p_request_id;
END;
$$;


-- ---- RPC: remove_family_member --------------------------------
-- Deletes both directions from family_members atomically.
-- SECURITY DEFINER is required because RLS only permits users to
-- write rows where user_id = auth.uid() — the reverse row belongs
-- to the other user and needs bypassing here.

CREATE OR REPLACE FUNCTION public.remove_family_member(p_family_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_family_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;

  DELETE FROM public.family_members
  WHERE (user_id = auth.uid() AND family_user_id = p_family_user_id)
     OR (user_id = p_family_user_id AND family_user_id = auth.uid());
END;
$$;


-- ---- UPDATE: remove_friend -----------------------------------
-- Extends the existing remove_friend() to also clean up
-- family_requests and family_request_declines in both directions.

CREATE OR REPLACE FUNCTION public.remove_friend(p_friend_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_friend_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;

  -- Remove family membership in both directions.
  DELETE FROM family_members
  WHERE (user_id = auth.uid() AND family_user_id = p_friend_id)
     OR (user_id = p_friend_id AND family_user_id = auth.uid());

  -- Remove any pending family requests in both directions.
  DELETE FROM family_requests
  WHERE (from_user_id = auth.uid() AND to_user_id = p_friend_id)
     OR (from_user_id = p_friend_id AND to_user_id = auth.uid());

  -- Remove any family request decline records in both directions.
  DELETE FROM family_request_declines
  WHERE (from_user_id = auth.uid() AND to_user_id = p_friend_id)
     OR (from_user_id = p_friend_id AND to_user_id = auth.uid());

  -- Remove cross-wishlist-access in both directions.
  DELETE FROM wishlist_access
  WHERE (
    user_id = p_friend_id
    AND wishlist_id IN (SELECT id FROM wishlists WHERE owner_id = auth.uid())
  )
  OR (
    user_id = auth.uid()
    AND wishlist_id IN (SELECT id FROM wishlists WHERE owner_id = p_friend_id)
  );

  DELETE FROM friendships
  WHERE (user_id = auth.uid() AND friend_id = p_friend_id)
     OR (user_id = p_friend_id AND friend_id = auth.uid());
END;
$$;


-- ---- Grants --------------------------------------------------

GRANT EXECUTE ON FUNCTION public.send_family_request(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_family_request(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_family_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_family_member(uuid)   TO authenticated;
