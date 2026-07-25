-- Toggle per-store for "Arma tu PC" (tech stores only).
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS enable_pc_builder BOOLEAN NOT NULL DEFAULT false;

-- Keep existing technology stores enabled (previous behavior was rubro-only).
UPDATE stores
SET enable_pc_builder = true
WHERE rubro_tienda = 'tecnologia';

COMMENT ON COLUMN stores.enable_pc_builder IS
  'When true and rubro_tienda is tecnologia, shows the public PC Builder tab and routes.';
