-- ============================================================
-- Usernames
-- Immutable after registration. Chosen at sign-up, auto-generated
-- from name + surname if not explicitly provided.
-- Format: a-z, 0-9, _ only. Min 3, max 30 chars.
-- ============================================================


-- ---- Helper: transliterate Russian to Latin ----
-- Multi-char substitutions run first (regexp_replace, order matters),
-- then single-char via translate(), then non-[a-z0-9] cleanup.
-- From string (25 Cyrillic chars):  абвгдезийклмнопрстуфхыэъь
-- To   string (23 Latin  chars):    abvgdeziyiklmnoprstufhye
-- ъ and ь (positions 24, 25) have no to-position → deleted by translate.

CREATE OR REPLACE FUNCTION public.transliterate_ru(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    translate(
      regexp_replace(
      regexp_replace(
      regexp_replace(
      regexp_replace(
      regexp_replace(
      regexp_replace(
      regexp_replace(
      regexp_replace(
      regexp_replace(
        lower(t),
        'кс', 'x',   'g'),
        'щ',  'sch', 'g'),
        'ш',  'sh',  'g'),
        'ж',  'zh',  'g'),
        'ч',  'ch',  'g'),
        'ц',  'ts',  'g'),
        'ю',  'yu',  'g'),
        'я',  'ya',  'g'),
        'ё',  'yo',  'g'),
      'абвгдезийклмнопрстуфхыэъь',
      'abvgdeziyiklmnoprstufhye'
    ),
    '[^a-z0-9]', '', 'g'
  )
$$;


-- ---- Helper: find next available username from name + surname ----
-- Takes up to 3 chars from transliterated name and surname, concatenates.
-- Appends an incrementing counter on collision: base, base1, base2 …
-- No padding. Fails loudly if 9999 candidates are exhausted (unreachable).

CREATE OR REPLACE FUNCTION public.generate_username(p_name text, p_surname text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base      text;
  v_candidate text;
  v_counter   int := 0;
BEGIN
  v_base := regexp_replace(
    substring(transliterate_ru(p_name),    1, 3) ||
    substring(transliterate_ru(p_surname), 1, 3),
    '[^a-z0-9]', '', 'g'
  );

  v_candidate := v_base;
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = v_candidate) THEN
      RETURN v_candidate;
    END IF;
    v_counter   := v_counter + 1;
    v_candidate := v_base || v_counter::text;
    EXIT WHEN v_counter > 9999;
  END LOOP;
  RAISE EXCEPTION 'generate_username: exhausted candidates for "% %"', p_name, p_surname;
END;
$$;


-- ---- Column ----

ALTER TABLE public.profiles
  ADD COLUMN username text UNIQUE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format CHECK (
    username ~ '^[a-z][a-z0-9_]{1,28}[a-z0-9]$'
    AND username !~ '__'
  );

CREATE UNIQUE INDEX profiles_username_idx ON public.profiles (username);


-- ---- Helper: availability check callable by unauthenticated users ----
-- Defined after the username column exists because LANGUAGE sql functions
-- are validated at creation time (unlike plpgsql).

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = lower(trim(p_username))
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;


-- ---- Backfill existing rows ----
-- Processed row-by-row so each generate_username() call sees previously
-- assigned usernames. A single UPDATE statement would use a snapshot taken
-- at statement start and would not see mid-statement assignments.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, name, surname FROM public.profiles WHERE username IS NULL
  LOOP
    UPDATE public.profiles
    SET    username = generate_username(r.name, r.surname)
    WHERE  id = r.id;
  END LOOP;
END;
$$;

ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;


-- ---- Updated trigger ----
-- Uses the username from raw_user_meta_data when provided and non-empty;
-- otherwise auto-generates from name + surname.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  v_username := lower(trim(COALESCE(
    nullif(trim(NEW.raw_user_meta_data->>'username'), ''),
    generate_username(
      COALESCE(NEW.raw_user_meta_data->>'name',    ''),
      COALESCE(NEW.raw_user_meta_data->>'surname', '')
    )
  )));

  INSERT INTO public.profiles (id, email, name, surname, birthday, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name',    ''),
    COALESCE(NEW.raw_user_meta_data->>'surname', ''),
    CASE
      WHEN (NEW.raw_user_meta_data->>'birthday') IS NOT NULL
        AND (NEW.raw_user_meta_data->>'birthday') <> ''
      THEN (NEW.raw_user_meta_data->>'birthday')::date
      ELSE NULL
    END,
    v_username
  );
  RETURN NEW;
END;
$$;
