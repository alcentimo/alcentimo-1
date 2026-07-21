-- Add Salud, Belleza y Cuidado Personal as a 5th official store rubro.

UPDATE public.stores
SET rubro_tienda = 'salud-belleza'
WHERE rubro_tienda IN ('cosmeticos');

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_rubro_tienda_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_rubro_tienda_check
  CHECK (
    rubro_tienda IS NULL
    OR rubro_tienda IN (
      'ropa-moda',
      'alimentos',
      'tecnologia',
      'coleccionables',
      'salud-belleza'
    )
  );
