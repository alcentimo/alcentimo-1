-- ============================================================
-- alcentimo-1 — Rubros de tienda (CHECK constraint)
-- Ejecutar DESPUÉS de 026_stores_rubro_tienda.sql
-- Orden: columna → normalizar datos → CHECK
-- ============================================================

-- 1) Columna sin restricción CHECK (idempotente)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS rubro_tienda TEXT;

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_rubro_tienda_check;

-- 2) Normalizar datos existentes
UPDATE public.stores
SET rubro_tienda = 'general'
WHERE rubro_tienda IS NULL;

UPDATE public.stores
SET rubro_tienda = CASE rubro_tienda
  WHEN 'ropa' THEN 'ropa-moda'
  WHEN 'zapateria' THEN 'calzado'
  WHEN 'joyeria' THEN 'salud-belleza'
  WHEN 'cosmeticos' THEN 'salud-belleza'
  WHEN 'repuestos' THEN 'ferreteria'
  ELSE rubro_tienda
END
WHERE rubro_tienda IN ('ropa', 'zapateria', 'joyeria', 'cosmeticos', 'repuestos');

UPDATE public.stores
SET rubro_tienda = 'general'
WHERE rubro_tienda IS NULL
   OR rubro_tienda NOT IN (
     'ferreteria',
     'ropa-moda',
     'calzado',
     'tecnologia',
     'alimentos',
     'salud-belleza',
     'hogar-decoracion',
     'general'
   );

ALTER TABLE public.stores
  ALTER COLUMN rubro_tienda SET DEFAULT 'general';

UPDATE public.stores
SET rubro_tienda = 'general'
WHERE rubro_tienda IS NULL;

ALTER TABLE public.stores
  ALTER COLUMN rubro_tienda SET NOT NULL;

-- 3) CHECK constraint (incluye ferreteria usada por la app)
ALTER TABLE public.stores
  ADD CONSTRAINT stores_rubro_tienda_check
  CHECK (
    rubro_tienda IN (
      'ferreteria',
      'ropa-moda',
      'calzado',
      'tecnologia',
      'alimentos',
      'salud-belleza',
      'hogar-decoracion',
      'general'
    )
  );

COMMENT ON COLUMN public.stores.rubro_tienda IS
  'Rubro del negocio; define categorías sugeridas al crear productos.';
