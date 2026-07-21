-- Acelera listados paginados del catálogo por tienda (dashboard).
CREATE INDEX IF NOT EXISTS idx_products_store_active_sort_created
  ON products (store_id, sort_order ASC, created_at DESC)
  WHERE is_deleted = false AND is_active = true;

-- Acelera conteos/filtros de stock bajo sobre la variante principal.
CREATE INDEX IF NOT EXISTS idx_product_variants_product_default_stock
  ON product_variants (product_id, stock_quantity)
  WHERE is_default = true AND is_active = true;
