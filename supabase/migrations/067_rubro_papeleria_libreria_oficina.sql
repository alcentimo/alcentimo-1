-- Add Papelería, Librería y Oficina as a 6th official store rubro.

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
      'salud-belleza',
      'papeleria-libreria-oficina'
    )
  );
