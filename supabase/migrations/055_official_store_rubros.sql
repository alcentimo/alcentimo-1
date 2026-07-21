-- Official store rubros only (modular product architecture).
-- Remap legacy values, then tighten CHECK to the 4 operative options.

UPDATE public.stores
SET rubro_tienda = CASE rubro_tienda
  WHEN 'calzado' THEN 'ropa-moda'
  WHEN 'zapateria' THEN 'ropa-moda'
  WHEN 'ropa' THEN 'ropa-moda'
  WHEN 'salud-belleza' THEN 'ropa-moda'
  WHEN 'cosmeticos' THEN 'ropa-moda'
  WHEN 'hogar-decoracion' THEN 'ropa-moda'
  WHEN 'general' THEN 'ropa-moda'
  WHEN 'ferreteria' THEN 'tecnologia'
  WHEN 'repuestos' THEN 'tecnologia'
  WHEN 'joyeria' THEN 'coleccionables'
  ELSE rubro_tienda
END
WHERE rubro_tienda IS NOT NULL
  AND rubro_tienda NOT IN (
    'ropa-moda',
    'alimentos',
    'tecnologia',
    'coleccionables'
  );

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
      'coleccionables'
    )
  );
