-- Categoría y variantes simples en productos del hub de proveedores.

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'otros';

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '{"attribute":"color","options":[]}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'supplier_products_category_check'
  ) THEN
    ALTER TABLE public.supplier_products
      ADD CONSTRAINT supplier_products_category_check
      CHECK (
        category IN (
          'electronica',
          'hogar',
          'belleza',
          'accesorios',
          'alimentos',
          'ropa',
          'salud',
          'juguetes',
          'papeleria',
          'automotriz',
          'otros'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS supplier_products_category_idx
  ON public.supplier_products (category, is_active, created_at DESC)
  WHERE is_active = true;

COMMENT ON COLUMN public.supplier_products.category IS
  'Categoría mayorista para filtrar el catálogo dropshipping.';

COMMENT ON COLUMN public.supplier_products.variants IS
  'Variantes simples opcionales: { attribute, attributeLabel?, options: [{ id, label, priceExtraUsd? }] }.';
