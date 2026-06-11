-- Add expiration date and auto-archive timestamp to wishlists
ALTER TABLE wishlists ADD COLUMN expires_on DATE NULL;
ALTER TABLE wishlists ADD COLUMN auto_archived_at TIMESTAMPTZ NULL;
