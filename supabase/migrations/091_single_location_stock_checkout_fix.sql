-- ============================================================
-- Checkout: tiendas de una sola sede no deben fallar por
-- variant_location_stock en 0 cuando product_variants sí tiene stock.
-- Causa típica: movimientos/ajustes que actualizan solo la variante,
-- o filas de sede creadas en 0 con ON CONFLICT DO NOTHING.
-- ============================================================

CREATE OR REPLACE FUNCTION public.adjust_location_stock_for_order(
  p_variant_id UUID,
  p_location_id UUID,
  p_movement_type inventory_movement_type,
  p_qty INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INTEGER;
  v_reserved INTEGER;
  v_available INTEGER;
  v_store_id UUID;
  v_active_locations INTEGER;
  v_variant_stock INTEGER;
  v_variant_reserved INTEGER;
BEGIN
  IF p_location_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.store_id, v.stock_quantity, v.reserved_quantity
  INTO v_store_id, v_variant_stock, v_variant_reserved
  FROM product_variants v
  JOIN products p ON p.id = v.product_id
  WHERE v.id = p_variant_id;

  IF v_store_id IS NULL THEN
    RETURN 'Producto no disponible en esta tienda.';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_active_locations
  FROM store_locations
  WHERE store_id = v_store_id
    AND is_active = true;

  -- Una sola sede activa: espejar el inventario global en esa sede
  -- antes de validar (evita bloqueos falsos con disponible: 0).
  IF COALESCE(v_active_locations, 0) <= 1 THEN
    INSERT INTO variant_location_stock (
      variant_id,
      location_id,
      stock_quantity,
      reserved_quantity
    )
    VALUES (
      p_variant_id,
      p_location_id,
      GREATEST(COALESCE(v_variant_stock, 0), 0),
      LEAST(
        GREATEST(COALESCE(v_variant_reserved, 0), 0),
        GREATEST(COALESCE(v_variant_stock, 0), 0)
      )
    )
    ON CONFLICT (variant_id, location_id) DO UPDATE
    SET
      stock_quantity = GREATEST(EXCLUDED.stock_quantity, 0),
      reserved_quantity = LEAST(
        GREATEST(EXCLUDED.reserved_quantity, 0),
        GREATEST(EXCLUDED.stock_quantity, 0)
      ),
      updated_at = now();
  ELSE
    INSERT INTO variant_location_stock (
      variant_id,
      location_id,
      stock_quantity,
      reserved_quantity
    )
    VALUES (p_variant_id, p_location_id, 0, 0)
    ON CONFLICT (variant_id, location_id) DO NOTHING;
  END IF;

  SELECT stock_quantity, reserved_quantity
  INTO v_stock, v_reserved
  FROM variant_location_stock
  WHERE variant_id = p_variant_id
    AND location_id = p_location_id
  FOR UPDATE;

  v_available := v_stock - v_reserved;

  IF p_movement_type = 'reserve' THEN
    IF v_available < p_qty THEN
      RETURN format(
        'Stock insuficiente en la sucursal (disponible: %s, solicitado: %s).',
        v_available,
        p_qty
      );
    END IF;
    UPDATE variant_location_stock
    SET reserved_quantity = v_reserved + p_qty, updated_at = now()
    WHERE variant_id = p_variant_id
      AND location_id = p_location_id;

  ELSIF p_movement_type = 'release' THEN
    UPDATE variant_location_stock
    SET reserved_quantity = GREATEST(0, v_reserved - p_qty), updated_at = now()
    WHERE variant_id = p_variant_id
      AND location_id = p_location_id;

  ELSIF p_movement_type = 'sale_out' THEN
    IF v_stock < p_qty THEN
      RETURN format(
        'Stock insuficiente en la sucursal para entregar (stock: %s, solicitado: %s).',
        v_stock,
        p_qty
      );
    END IF;
    UPDATE variant_location_stock
    SET
      stock_quantity = v_stock - p_qty,
      reserved_quantity = LEAST(v_reserved, v_stock - p_qty),
      updated_at = now()
    WHERE variant_id = p_variant_id
      AND location_id = p_location_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Backfill: sedes principales de tiendas mono-sede desfasadas respecto al global.
UPDATE variant_location_stock AS vls
SET
  stock_quantity = GREATEST(v.stock_quantity, 0),
  reserved_quantity = LEAST(
    GREATEST(v.reserved_quantity, 0),
    GREATEST(v.stock_quantity, 0)
  ),
  updated_at = now()
FROM product_variants AS v
JOIN products AS p ON p.id = v.product_id
JOIN store_locations AS sl
  ON sl.store_id = p.store_id
 AND sl.is_default = true
WHERE vls.variant_id = v.id
  AND vls.location_id = sl.id
  AND (
    SELECT COUNT(*)::INTEGER
    FROM store_locations AS x
    WHERE x.store_id = p.store_id
      AND x.is_active = true
  ) <= 1
  AND (
    vls.stock_quantity IS DISTINCT FROM GREATEST(v.stock_quantity, 0)
    OR vls.reserved_quantity IS DISTINCT FROM LEAST(
      GREATEST(v.reserved_quantity, 0),
      GREATEST(v.stock_quantity, 0)
    )
  );

-- Mantener alineada la sede principal cuando el stock global cambia
-- (p. ej. inventory_logs) en tiendas con una sola sede activa.
CREATE OR REPLACE FUNCTION public.mirror_variant_stock_to_default_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
  v_location_id UUID;
  v_active_locations INTEGER;
  v_stock INTEGER;
  v_reserved INTEGER;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.stock_quantity IS NOT DISTINCT FROM OLD.stock_quantity
     AND NEW.reserved_quantity IS NOT DISTINCT FROM OLD.reserved_quantity THEN
    RETURN NEW;
  END IF;

  SELECT store_id INTO v_store_id
  FROM products
  WHERE id = NEW.product_id;

  IF v_store_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_active_locations
  FROM store_locations
  WHERE store_id = v_store_id
    AND is_active = true;

  IF COALESCE(v_active_locations, 0) > 1 THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO v_location_id
  FROM store_locations
  WHERE store_id = v_store_id
    AND is_default = true
  ORDER BY sort_order ASC
  LIMIT 1;

  IF v_location_id IS NULL THEN
    SELECT id
    INTO v_location_id
    FROM store_locations
    WHERE store_id = v_store_id
      AND is_active = true
    ORDER BY sort_order ASC
    LIMIT 1;
  END IF;

  IF v_location_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_stock := GREATEST(COALESCE(NEW.stock_quantity, 0), 0);
  v_reserved := LEAST(
    GREATEST(COALESCE(NEW.reserved_quantity, 0), 0),
    v_stock
  );

  INSERT INTO variant_location_stock (
    variant_id,
    location_id,
    stock_quantity,
    reserved_quantity
  )
  VALUES (NEW.id, v_location_id, v_stock, v_reserved)
  ON CONFLICT (variant_id, location_id) DO UPDATE
  SET
    stock_quantity = EXCLUDED.stock_quantity,
    reserved_quantity = EXCLUDED.reserved_quantity,
    updated_at = now()
  WHERE variant_location_stock.stock_quantity IS DISTINCT FROM EXCLUDED.stock_quantity
     OR variant_location_stock.reserved_quantity IS DISTINCT FROM EXCLUDED.reserved_quantity;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_variant_stock_to_default_location ON product_variants;
CREATE TRIGGER trg_mirror_variant_stock_to_default_location
AFTER INSERT OR UPDATE OF stock_quantity, reserved_quantity ON product_variants
FOR EACH ROW
EXECUTE FUNCTION public.mirror_variant_stock_to_default_location();
