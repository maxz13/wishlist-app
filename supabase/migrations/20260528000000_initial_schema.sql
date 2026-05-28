-- ============================================================
-- V1 Initial Schema
-- ============================================================


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Sets updated_at to now() before any UPDATE.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLE: profiles
-- Public user profile linked to auth.users.
-- Email is set at registration and not editable via profile forms.
-- ============================================================

CREATE TABLE public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL UNIQUE,
  name       text        NOT NULL CHECK (name <> ''),
  surname    text        NOT NULL CHECK (surname <> ''),
  avatar_url text,
  birthday   date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE: friendships
-- Stored as mirrored rows: one row per direction.
-- Querying friends requires only WHERE user_id = ?.
-- ============================================================

CREATE TABLE public.friendships (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self_reference CHECK (user_id <> friend_id),
  CONSTRAINT friendships_unique_pair       UNIQUE (user_id, friend_id)
);

CREATE INDEX idx_friendships_user_id   ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);

-- Returns true if user_a and user_b are friends.
-- SECURITY DEFINER avoids recursive RLS evaluation when called from policies.
CREATE OR REPLACE FUNCTION public.is_friend(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE user_id  = user_a
      AND friend_id = user_b
  );
$$;


-- ============================================================
-- TABLE: invites
-- Represents friend invitations sent by link or email.
-- Resolved via the accept_invite() RPC, which creates friendship rows.
-- ============================================================

CREATE TABLE public.invites (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token               text        NOT NULL UNIQUE CHECK (length(token) >= 24),
  inviter_user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  accepted_at         timestamptz,
  accepted_by_user_id uuid        REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_invites_inviter_user_id ON public.invites(inviter_user_id);
CREATE INDEX idx_invites_invited_email   ON public.invites(invited_email);


-- ============================================================
-- TABLE: wishlists
-- Belongs to one owner. Can be active or archived.
-- Archived wishlists remain visible to friends.
-- ============================================================

CREATE TABLE public.wishlists (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text        NOT NULL CHECK (title <> ''),
  is_archived boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wishlists_owner_id ON public.wishlists(owner_id);

CREATE TRIGGER wishlists_set_updated_at
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE: wishlist_items
-- Individual gift wishes inside a wishlist.
-- ============================================================

CREATE TABLE public.wishlist_items (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid           NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  title       text           NOT NULL CHECK (title <> ''),
  link        text,
  price       numeric(10,2)  CHECK (price IS NULL OR price >= 0),
  created_at  timestamptz    NOT NULL DEFAULT now(),
  updated_at  timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);

CREATE TRIGGER wishlist_items_set_updated_at
  BEFORE UPDATE ON public.wishlist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE: reservations
-- One reservation per gift item enforced by the UNIQUE constraint.
-- Only the reserver can remove their own reservation.
-- ============================================================

CREATE TABLE public.reservations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_item_id    uuid        NOT NULL UNIQUE REFERENCES public.wishlist_items(id) ON DELETE CASCADE,
  reserved_by_user_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_reserved_by_user_id ON public.reservations(reserved_by_user_id);


-- ============================================================
-- TRIGGER: create profile on auth user signup
-- Reads name and surname from raw_user_meta_data passed at registration.
-- Registration must always supply non-empty name and surname or the
-- CHECK constraints on profiles will reject the insert.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, surname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'surname', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations   ENABLE ROW LEVEL SECURITY;


-- ---- profiles ----

CREATE POLICY "profiles_select_own_or_friend"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR is_friend(auth.uid(), id)
  );

-- Profile is created by the handle_new_user trigger (SECURITY DEFINER);
-- no INSERT policy is granted to regular users.

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING    (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ---- friendships ----

CREATE POLICY "friendships_select_own"
  ON public.friendships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT and DELETE are managed via accept_invite() (SECURITY DEFINER).
-- No direct user policies are granted.


-- ---- invites ----

CREATE POLICY "invites_select_own"
  ON public.invites FOR SELECT TO authenticated
  USING (inviter_user_id = auth.uid());

CREATE POLICY "invites_insert_own"
  ON public.invites FOR INSERT TO authenticated
  WITH CHECK (inviter_user_id = auth.uid());

-- UPDATE (marking accepted) is managed via accept_invite() (SECURITY DEFINER).


-- ---- wishlists ----

CREATE POLICY "wishlists_select_owner_or_friend"
  ON public.wishlists FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_friend(auth.uid(), owner_id)
  );

CREATE POLICY "wishlists_insert_own"
  ON public.wishlists FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "wishlists_update_own"
  ON public.wishlists FOR UPDATE TO authenticated
  USING    (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "wishlists_delete_own"
  ON public.wishlists FOR DELETE TO authenticated
  USING (owner_id = auth.uid());


-- ---- wishlist_items ----

CREATE POLICY "wishlist_items_select_if_can_see_wishlist"
  ON public.wishlist_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_id
        AND (w.owner_id = auth.uid() OR is_friend(auth.uid(), w.owner_id))
    )
  );

CREATE POLICY "wishlist_items_insert_if_owner"
  ON public.wishlist_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_id
        AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "wishlist_items_update_if_owner"
  ON public.wishlist_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_id
        AND w.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_id
        AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "wishlist_items_delete_if_owner"
  ON public.wishlist_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_id
        AND w.owner_id = auth.uid()
    )
  );


-- ---- reservations ----

-- The wishlist owner and all their friends can see reservations,
-- including reserved_by_user_id, which is useful for gift coordination.
CREATE POLICY "reservations_select_if_can_see_wishlist"
  ON public.reservations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wishlist_items wi
      JOIN public.wishlists w ON w.id = wi.wishlist_id
      WHERE wi.id = wishlist_item_id
        AND (w.owner_id = auth.uid() OR is_friend(auth.uid(), w.owner_id))
    )
  );

-- Only friends of the wishlist owner may reserve (not the owner themselves).
CREATE POLICY "reservations_insert_if_friend_of_owner"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (
    reserved_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.wishlist_items wi
      JOIN public.wishlists w ON w.id = wi.wishlist_id
      WHERE wi.id = wishlist_item_id
        AND is_friend(auth.uid(), w.owner_id)
    )
  );

-- Only the user who reserved can remove the reservation.
CREATE POLICY "reservations_delete_own"
  ON public.reservations FOR DELETE TO authenticated
  USING (reserved_by_user_id = auth.uid());


-- ============================================================
-- RPC: accept_invite
-- If invited_email is set, only the user whose profile email
-- matches may accept. Inserts both mirrored friendship rows.
-- Runs as SECURITY DEFINER to bypass RLS on friendships and invites.
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite       public.invites%ROWTYPE;
  v_caller_email text;
BEGIN
  SELECT * INTO v_invite
  FROM public.invites
  WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already accepted';
  END IF;

  IF v_invite.inviter_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot accept your own invite';
  END IF;

  -- If the invite was addressed to a specific email, enforce it.
  IF v_invite.invited_email IS NOT NULL THEN
    SELECT email INTO v_caller_email
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_caller_email IS DISTINCT FROM v_invite.invited_email THEN
      RAISE EXCEPTION 'This invite was sent to a different email address';
    END IF;
  END IF;

  UPDATE public.invites
  SET
    accepted_at         = now(),
    accepted_by_user_id = auth.uid()
  WHERE id = v_invite.id;

  INSERT INTO public.friendships (user_id, friend_id)
  VALUES
    (v_invite.inviter_user_id, auth.uid()),
    (auth.uid(), v_invite.inviter_user_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;
END;
$$;
