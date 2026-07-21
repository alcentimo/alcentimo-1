-- Expand store rubro CHECK to include coleccionables (comics / figures / geek).
ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_rubro_tienda_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_rubro_tienda_check
  CHECK (
    rubro_tienda IN (
      'ferreteria',
      'ropa-moda',
      'calzado',
      'tecnologia',
      'alimentos',
      'coleccionables',
      'salud-belleza',
      'hogar-decoracion',
      'general'
    )
  );
