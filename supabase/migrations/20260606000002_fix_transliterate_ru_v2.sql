-- Replace transliterate_ru() with a correct replace()-based implementation.
--
-- The previous translate()-based approach had two fundamental problems:
--   1. translate() is 1-to-1: it cannot expand one Cyrillic char to multiple Latin chars.
--      щ→shch, х→kh, ш→sh, etc. require 1-to-many mapping that translate() cannot do.
--   2. The multi-char regexp_replace() block in the old function only handled some
--      characters (щ→sch wrong, х→h wrong via translate, ё→yo wrong).
--
-- New approach: ordered replace() calls, multi-char before single-char.
-- No functional indexes use transliterate_ru, so no index rebuild is needed.
-- Function stays IMMUTABLE (pure string computation, no DB access).
--
-- Verified expected outputs (see tests after):
--   Ирина      → irina
--   Юлия       → yuliya
--   Юля        → yulya
--   Трофимова  → trofimova
--   Петров     → petrov
--   Жуков      → zhukov
--   Шаповалов  → shapovalov
--   Чайковский → chaykovskiy
--   Щербаков   → shcherbakov
--   Хромов     → khromov
--   Царев      → tsarev
--   Семёнов    → semenov

CREATE OR REPLACE FUNCTION public.transliterate_ru(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  r text;
BEGIN
  r := lower(t);

  -- Multi-character substitutions first (щ before ш to avoid any ambiguity).
  r := replace(r, 'щ', 'shch');
  r := replace(r, 'ш', 'sh');
  r := replace(r, 'ж', 'zh');
  r := replace(r, 'ч', 'ch');
  r := replace(r, 'х', 'kh');
  r := replace(r, 'ц', 'ts');
  r := replace(r, 'ю', 'yu');
  r := replace(r, 'я', 'ya');
  r := replace(r, 'ё', 'e');

  -- Single-character substitutions.
  r := replace(r, 'а', 'a');
  r := replace(r, 'б', 'b');
  r := replace(r, 'в', 'v');
  r := replace(r, 'г', 'g');
  r := replace(r, 'д', 'd');
  r := replace(r, 'е', 'e');
  r := replace(r, 'з', 'z');
  r := replace(r, 'и', 'i');
  r := replace(r, 'й', 'y');
  r := replace(r, 'к', 'k');
  r := replace(r, 'л', 'l');
  r := replace(r, 'м', 'm');
  r := replace(r, 'н', 'n');
  r := replace(r, 'о', 'o');
  r := replace(r, 'п', 'p');
  r := replace(r, 'р', 'r');
  r := replace(r, 'с', 's');
  r := replace(r, 'т', 't');
  r := replace(r, 'у', 'u');
  r := replace(r, 'ф', 'f');
  r := replace(r, 'ы', 'y');
  r := replace(r, 'э', 'e');

  -- Soft and hard signs: remove entirely.
  r := replace(r, 'ъ', '');
  r := replace(r, 'ь', '');

  -- Strip anything that is not a-z or 0-9 (spaces, punctuation, non-Latin).
  r := regexp_replace(r, '[^a-z0-9]', '', 'g');

  RETURN r;
END;
$$;
