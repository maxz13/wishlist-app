-- Fix off-by-one bug in transliterate_ru().
--
-- Root cause: the translate() TO string had 24 characters instead of 23.
-- An extra 'i' at position 10 caused к→i (instead of к→k), which shifted
-- every subsequent character by one position: л→k, м→l, н→m, р→p, т→s, etc.
--
-- Effect on search: transliterate_ru('Ирина') returned 'ipima' instead of
-- 'irina', making Latin-prefix searches like 'ir' or 'yul' fail to match
-- Cyrillic names through the transliteration branch.
--
-- Fix: remove the duplicate 'i', restoring the correct 23-char TO string:
--   FROM: абвгдезийклмнопрстуфхыэъь  (25 chars)
--   TO:   abvgdeziyklmnoprstufhye     (23 chars; ъ and ь have no to-position → deleted)
--
-- No functional indexes use transliterate_ru, so no index rebuild is needed.
-- The function stays IMMUTABLE. Existing stored usernames are unaffected.

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
      'abvgdeziyklmnoprstufhye'
    ),
    '[^a-z0-9]', '', 'g'
  )
$$;
