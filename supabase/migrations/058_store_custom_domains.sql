-- Dominios personalizados por tienda (autogestión + asignación admin).
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS custom_domain TEXT NULL,
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_custom_domain_unique
  ON stores (lower(trim(custom_domain)))
  WHERE custom_domain IS NOT NULL AND trim(custom_domain) <> '';

CREATE INDEX IF NOT EXISTS idx_stores_custom_domain_lookup
  ON stores (lower(trim(custom_domain)))
  WHERE custom_domain IS NOT NULL
    AND custom_domain_verified = true
    AND is_active = true;
