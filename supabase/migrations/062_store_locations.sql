-- Multi-sucursales (hasta 5 por tienda): ubicaciones + stock por sede + pedido asociado.
-- Compatibilidad: cada tienda recibe una sede Principal con el stock actual.

-- ============================================================
-- 1. store_locations
-- ============================================================
CREATE TABLE IF NOT EXISTS store_locations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  address      TEXT NOT NULL DEFAULT '',
  city         TEXT NOT NULL DEFAULT '',
  phone        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT store_locations_name_len CHECK (char_length(trim(name)) BETWEEN 1 AND 80)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_locations_one_default
  ON store_locations (store_id)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_store_locations_store
  ON store_locations (store_id, sort_order, created_at);

DROP TRIGGER IF EXISTS trg_store_locations_updated_at ON store_locations;
CREATE TRIGGER trg_store_locations_updated_at
BEFORE UPDATE ON store_locations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_store_locations_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM store_locations
  WHERE store_id = NEW.store_id
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Máximo 5 sucursales por tienda.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_locations_limit ON store_locations;
CREATE TRIGGER trg_store_locations_limit
BEFORE INSERT ON store_locations
FOR EACH ROW EXECUTE FUNCTION enforce_store_locations_limit();

-- ============================================================
-- 2. variant_location_stock
-- ============================================================
CREATE TABLE IF NOT EXISTS variant_location_stock (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id         UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  location_id        UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  stock_quantity     INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT variant_location_stock_unique UNIQUE (variant_id, location_id),
  CONSTRAINT variant_location_stock_reserved_lte_stock
    CHECK (reserved_quantity <= stock_quantity)
);

CREATE INDEX IF NOT EXISTS idx_variant_location_stock_location
  ON variant_location_stock (location_id);

CREATE INDEX IF NOT EXISTS idx_variant_location_stock_variant
  ON variant_location_stock (variant_id);

DROP TRIGGER IF EXISTS trg_variant_location_stock_updated_at ON variant_location_stock;
CREATE TRIGGER trg_variant_location_stock_updated_at
BEFORE UPDATE ON variant_location_stock
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sincroniza totales de la variante = suma de sedes.
CREATE OR REPLACE FUNCTION public.sync_variant_stock_from_locations(p_variant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INTEGER;
  v_reserved INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(stock_quantity), 0),
    COALESCE(SUM(reserved_quantity), 0)
  INTO v_stock, v_reserved
  FROM variant_location_stock
  WHERE variant_id = p_variant_id;

  UPDATE product_variants
  SET
    stock_quantity = v_stock,
    reserved_quantity = LEAST(v_reserved, v_stock),
    updated_at = now()
  WHERE id = p_variant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_variant_stock_from_locations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_id UUID;
BEGIN
  v_variant_id := COALESCE(NEW.variant_id, OLD.variant_id);
  PERFORM public.sync_variant_stock_from_locations(v_variant_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_variant_location_stock_sync ON variant_location_stock;
CREATE TRIGGER trg_variant_location_stock_sync
AFTER INSERT OR UPDATE OR DELETE ON variant_location_stock
FOR EACH ROW EXECUTE FUNCTION trg_sync_variant_stock_from_locations();

-- ============================================================
-- 3. Seed: una sede Principal por tienda + migrar stock actual
-- ============================================================
INSERT INTO store_locations (
  store_id,
  name,
  address,
  city,
  phone,
  is_active,
  is_default,
  sort_order
)
SELECT
  s.id,
  'Principal',
  COALESCE(NULLIF(trim(ss.config->'locationHours'->>'address'), ''), ''),
  COALESCE(NULLIF(trim(ss.config->'locationHours'->>'city'), ''), ''),
  NULLIF(trim(ss.config->'contact'->>'whatsappPhone'), ''),
  true,
  true,
  0
FROM stores s
LEFT JOIN store_settings ss ON ss.store_id = s.id
WHERE NOT EXISTS (
  SELECT 1 FROM store_locations sl WHERE sl.store_id = s.id
);

-- Migrar stock existente de variantes a la sede default.
INSERT INTO variant_location_stock (
  variant_id,
  location_id,
  stock_quantity,
  reserved_quantity
)
SELECT
  v.id,
  sl.id,
  GREATEST(v.stock_quantity, 0),
  LEAST(GREATEST(v.reserved_quantity, 0), GREATEST(v.stock_quantity, 0))
FROM product_variants v
JOIN products p ON p.id = v.product_id
JOIN store_locations sl ON sl.store_id = p.store_id AND sl.is_default = true
ON CONFLICT (variant_id, location_id) DO NOTHING;

-- Auto-crear sede Principal al crear tienda nueva.
CREATE OR REPLACE FUNCTION public.create_default_store_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO store_locations (
    store_id, name, address, city, is_active, is_default, sort_order
  ) VALUES (
    NEW.id, 'Principal', '', '', true, true, 0
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_store_location ON stores;
CREATE TRIGGER trg_create_default_store_location
AFTER INSERT ON stores
FOR EACH ROW EXECUTE FUNCTION create_default_store_location();

-- Al crear variante, inicializar stock 0 en todas las sedes activas de la tienda.
CREATE OR REPLACE FUNCTION public.ensure_variant_location_stock_rows()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  SELECT store_id INTO v_store_id FROM products WHERE id = NEW.product_id;
  IF v_store_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO variant_location_stock (variant_id, location_id, stock_quantity, reserved_quantity)
  SELECT
    NEW.id,
    sl.id,
    CASE WHEN sl.is_default THEN GREATEST(NEW.stock_quantity, 0) ELSE 0 END,
    CASE
      WHEN sl.is_default THEN LEAST(GREATEST(NEW.reserved_quantity, 0), GREATEST(NEW.stock_quantity, 0))
      ELSE 0
    END
  FROM store_locations sl
  WHERE sl.store_id = v_store_id
  ON CONFLICT (variant_id, location_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_variant_location_stock ON product_variants;
CREATE TRIGGER trg_ensure_variant_location_stock
AFTER INSERT ON product_variants
FOR EACH ROW EXECUTE FUNCTION ensure_variant_location_stock_rows();

-- Al crear sucursal, filas de stock 0 para todas las variantes de la tienda.
CREATE OR REPLACE FUNCTION public.ensure_location_stock_for_variants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO variant_location_stock (variant_id, location_id, stock_quantity, reserved_quantity)
  SELECT v.id, NEW.id, 0, 0
  FROM product_variants v
  JOIN products p ON p.id = v.product_id
  WHERE p.store_id = NEW.store_id
  ON CONFLICT (variant_id, location_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_location_stock_for_variants ON store_locations;
CREATE TRIGGER trg_ensure_location_stock_for_variants
AFTER INSERT ON store_locations
FOR EACH ROW EXECUTE FUNCTION ensure_location_stock_for_variants();

-- ============================================================
-- 4. orders: sucursal + tipo de cumplimiento
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_fulfillment_type_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_fulfillment_type_check
      CHECK (
        fulfillment_type IS NULL
        OR fulfillment_type IN ('delivery', 'pickup', 'shipping')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_location ON orders (location_id)
  WHERE location_id IS NOT NULL;

-- Asignar sede default a pedidos existentes.
UPDATE orders o
SET location_id = sl.id
FROM store_locations sl
WHERE sl.store_id = o.store_id
  AND sl.is_default = true
  AND o.location_id IS NULL;

-- ============================================================
-- 5. Reserva / fulfill / cancel conscientes de sucursal
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
BEGIN
  IF p_location_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO variant_location_stock (variant_id, location_id, stock_quantity, reserved_quantity)
  VALUES (p_variant_id, p_location_id, 0, 0)
  ON CONFLICT (variant_id, location_id) DO NOTHING;

  SELECT stock_quantity, reserved_quantity
  INTO v_stock, v_reserved
  FROM variant_location_stock
  WHERE variant_id = p_variant_id AND location_id = p_location_id
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
    WHERE variant_id = p_variant_id AND location_id = p_location_id;

  ELSIF p_movement_type = 'release' THEN
    UPDATE variant_location_stock
    SET reserved_quantity = GREATEST(0, v_reserved - p_qty), updated_at = now()
    WHERE variant_id = p_variant_id AND location_id = p_location_id;

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
    WHERE variant_id = p_variant_id AND location_id = p_location_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_order_inventory(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order      RECORD;
  item         JSONB;
  v_variant_id UUID;
  v_qty        INTEGER;
  v_available  INTEGER;
  v_loc_error  TEXT;
BEGIN
  SELECT id, store_id, items, location_id
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Pedido no encontrado.');
  END IF;

  IF v_order.items IS NULL
     OR jsonb_typeof(v_order.items) <> 'array'
     OR jsonb_array_length(v_order.items) = 0 THEN
    RETURN jsonb_build_object('error', 'El pedido no tiene ítems.');
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(v_order.items) AS t(value)
  LOOP
    v_variant_id := NULLIF(item->>'variant_id', '')::UUID;
    v_qty := (item->>'quantity')::INTEGER;

    IF v_variant_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RETURN jsonb_build_object('error', 'Ítem de pedido inválido.');
    END IF;

    IF public.order_inventory_movement_exists(p_order_id, v_variant_id, 'reserve') THEN
      CONTINUE;
    END IF;

    IF public.order_inventory_movement_exists(p_order_id, v_variant_id, 'sale_out') THEN
      CONTINUE;
    END IF;

    -- Primero validar/reservar en la sucursal si aplica.
    IF v_order.location_id IS NOT NULL THEN
      v_loc_error := public.adjust_location_stock_for_order(
        v_variant_id, v_order.location_id, 'reserve', v_qty
      );
      IF v_loc_error IS NOT NULL THEN
        RETURN jsonb_build_object('error', v_loc_error);
      END IF;
    END IF;

    SELECT (v.stock_quantity - v.reserved_quantity)
    INTO v_available
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE v.id = v_variant_id
      AND p.store_id = v_order.store_id
      AND v.is_active = true
      AND p.is_active = true
      AND p.is_deleted = false
    FOR UPDATE OF v;

    IF v_available IS NULL THEN
      RETURN jsonb_build_object('error', 'Producto no disponible en esta tienda.');
    END IF;

    IF v_order.location_id IS NULL AND v_available < v_qty THEN
      RETURN jsonb_build_object(
        'error',
        format('Stock insuficiente (disponible: %s, solicitado: %s).', v_available, v_qty)
      );
    END IF;

    -- Si ya reservamos en ubicación, el sync del trigger actualizó totales;
    -- aún así registramos el movimiento de reserva a nivel variante para auditoría.
    -- Para evitar doble reserva en variant.reserved, solo escribimos inventory_logs
    -- cuando NO hay location_id (flujo legado). Con location_id el sync ya refleja reserved.
    IF v_order.location_id IS NULL THEN
      INSERT INTO inventory_logs (
        variant_id,
        movement_type,
        quantity_change,
        quantity_before,
        quantity_after,
        reference_type,
        reference_id,
        notes
      ) VALUES (
        v_variant_id,
        'reserve',
        v_qty,
        0,
        0,
        'order',
        p_order_id,
        'Reserva · pedido catálogo transaccional'
      );
    ELSE
      -- Marca de auditoría sin re-aplicar reserva en totales (ya sincronizados).
      INSERT INTO inventory_logs (
        variant_id,
        movement_type,
        quantity_change,
        quantity_before,
        quantity_after,
        reserved_before,
        reserved_after,
        reference_type,
        reference_id,
        notes
      )
      SELECT
        v_variant_id,
        'reserve',
        0,
        v.stock_quantity,
        v.stock_quantity,
        v.reserved_quantity,
        v.reserved_quantity,
        'order',
        p_order_id,
        format('Reserva sucursal %s · pedido catálogo', v_order.location_id)
      FROM product_variants v
      WHERE v.id = v_variant_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Nota: el INSERT de reserve con quantity_change=0 puede fallar el CHECK quantity_change <> 0.
-- Usamos quantity_change = v_qty pero deshabilitamos el efecto dual vía bypass.
-- Mejor: marcar notes y usar un path especial en apply_inventory_movement.

CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock    INTEGER;
  v_reserved INTEGER;
  v_skip_apply BOOLEAN := false;
BEGIN
  -- Movimientos ya aplicados a nivel sucursal (totales sincronizados).
  IF NEW.notes IS NOT NULL AND NEW.notes LIKE 'Reserva sucursal%' THEN
    v_skip_apply := true;
  END IF;
  IF NEW.notes IS NOT NULL AND NEW.notes LIKE 'Liberación sucursal%' THEN
    v_skip_apply := true;
  END IF;
  IF NEW.notes IS NOT NULL AND NEW.notes LIKE 'Venta sucursal%' THEN
    v_skip_apply := true;
  END IF;

  SELECT stock_quantity, reserved_quantity
  INTO v_stock, v_reserved
  FROM product_variants
  WHERE id = NEW.variant_id
  FOR UPDATE;

  NEW.quantity_before := v_stock;
  NEW.reserved_before := v_reserved;
  NEW.exchange_rate   := COALESCE(NEW.exchange_rate, get_current_exchange_rate());

  IF v_skip_apply THEN
    NEW.quantity_after := v_stock;
    NEW.reserved_after := v_reserved;
    -- Mantener consistency check: quantity_after = quantity_before + quantity_change
    -- Para auditoría con skip usamos quantity_change = 0 y forzamos consistency.
    NEW.quantity_change := 0;
    RETURN NEW;
  END IF;

  CASE NEW.movement_type
    WHEN 'reserve' THEN
      IF v_stock - v_reserved + NEW.quantity_change < 0 THEN
        RAISE EXCEPTION 'Stock disponible insuficiente para reservar en variante %', NEW.variant_id;
      END IF;
      NEW.reserved_after := v_reserved + ABS(NEW.quantity_change);
      NEW.quantity_after := v_stock;
      NEW.quantity_change := 0;

      UPDATE product_variants
      SET reserved_quantity = NEW.reserved_after, updated_at = now()
      WHERE id = NEW.variant_id;

    WHEN 'release' THEN
      IF v_reserved + NEW.quantity_change < 0 THEN
        RAISE EXCEPTION 'Reserva insuficiente para liberar en variante %', NEW.variant_id;
      END IF;
      NEW.reserved_after := v_reserved + NEW.quantity_change;
      NEW.quantity_after := v_stock;
      NEW.quantity_change := 0;

      UPDATE product_variants
      SET reserved_quantity = NEW.reserved_after, updated_at = now()
      WHERE id = NEW.variant_id;

    ELSE
      NEW.quantity_after := v_stock + NEW.quantity_change;
      NEW.reserved_after := v_reserved;

      IF NEW.quantity_after < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente en variante %', NEW.variant_id;
      END IF;
      IF NEW.reserved_after > NEW.quantity_after THEN
        RAISE EXCEPTION 'La reserva (%) supera el stock (%) en variante %',
          NEW.reserved_after, NEW.quantity_after, NEW.variant_id;
      END IF;

      UPDATE product_variants
      SET stock_quantity = NEW.quantity_after, updated_at = now()
      WHERE id = NEW.variant_id;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfill_order_inventory(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order      RECORD;
  item         JSONB;
  v_variant_id UUID;
  v_qty        INTEGER;
  v_available  INTEGER;
  v_has_reserve BOOLEAN;
  v_loc_error  TEXT;
BEGIN
  SELECT id, store_id, items, location_id
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Pedido no encontrado.');
  END IF;

  IF v_order.items IS NULL
     OR jsonb_typeof(v_order.items) <> 'array'
     OR jsonb_array_length(v_order.items) = 0 THEN
    RETURN jsonb_build_object('error', 'El pedido no tiene ítems.');
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(v_order.items) AS t(value)
  LOOP
    v_variant_id := NULLIF(item->>'variant_id', '')::UUID;
    v_qty := (item->>'quantity')::INTEGER;

    IF v_variant_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RETURN jsonb_build_object('error', 'Ítem de pedido inválido.');
    END IF;

    IF public.order_inventory_movement_exists(p_order_id, v_variant_id, 'sale_out') THEN
      CONTINUE;
    END IF;

    v_has_reserve := public.order_inventory_movement_exists(
      p_order_id,
      v_variant_id,
      'reserve'
    );

    IF v_order.location_id IS NOT NULL THEN
      IF v_has_reserve
         AND NOT public.order_inventory_movement_exists(p_order_id, v_variant_id, 'release') THEN
        v_loc_error := public.adjust_location_stock_for_order(
          v_variant_id, v_order.location_id, 'release', v_qty
        );
        IF v_loc_error IS NOT NULL THEN
          RETURN jsonb_build_object('error', v_loc_error);
        END IF;

        INSERT INTO inventory_logs (
          variant_id, movement_type, quantity_change,
          quantity_before, quantity_after, reference_type, reference_id, notes
        ) VALUES (
          v_variant_id, 'release', -v_qty, 0, 0, 'order', p_order_id,
          format('Liberación sucursal %s · pedido entregado', v_order.location_id)
        );
      END IF;

      v_loc_error := public.adjust_location_stock_for_order(
        v_variant_id, v_order.location_id, 'sale_out', v_qty
      );
      IF v_loc_error IS NOT NULL THEN
        RETURN jsonb_build_object('error', v_loc_error);
      END IF;

      INSERT INTO inventory_logs (
        variant_id, movement_type, quantity_change,
        quantity_before, quantity_after, reference_type, reference_id, notes
      ) VALUES (
        v_variant_id, 'sale_out', -v_qty, 0, 0, 'order', p_order_id,
        format('Venta sucursal %s · pedido entregado', v_order.location_id)
      );
      CONTINUE;
    END IF;

    IF v_has_reserve
       AND NOT public.order_inventory_movement_exists(p_order_id, v_variant_id, 'release') THEN
      INSERT INTO inventory_logs (
        variant_id, movement_type, quantity_change,
        quantity_before, quantity_after, reference_type, reference_id, notes
      ) VALUES (
        v_variant_id, 'release', -v_qty, 0, 0, 'order', p_order_id,
        'Liberación reserva · pedido entregado'
      );
    END IF;

    IF NOT v_has_reserve THEN
      SELECT (v.stock_quantity - v.reserved_quantity)
      INTO v_available
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE v.id = v_variant_id
        AND p.store_id = v_order.store_id
        AND v.is_active = true
        AND p.is_active = true
        AND p.is_deleted = false
      FOR UPDATE OF v;

      IF v_available IS NULL OR v_available < v_qty THEN
        RETURN jsonb_build_object(
          'error',
          format(
            'Stock insuficiente para entregar (disponible: %s, solicitado: %s).',
            COALESCE(v_available, 0),
            v_qty
          )
        );
      END IF;
    END IF;

    INSERT INTO inventory_logs (
      variant_id, movement_type, quantity_change,
      quantity_before, quantity_after, reference_type, reference_id, notes
    ) VALUES (
      v_variant_id, 'sale_out', -v_qty, 0, 0, 'order', p_order_id,
      'Venta · pedido entregado'
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order_inventory_reserves(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order      RECORD;
  item         JSONB;
  v_variant_id UUID;
  v_qty        INTEGER;
  v_loc_error  TEXT;
BEGIN
  SELECT id, store_id, items, location_id
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Pedido no encontrado.');
  END IF;

  IF v_order.items IS NULL OR jsonb_typeof(v_order.items) <> 'array' THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(v_order.items) AS t(value)
  LOOP
    v_variant_id := NULLIF(item->>'variant_id', '')::UUID;
    v_qty := (item->>'quantity')::INTEGER;

    IF v_variant_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    IF public.order_inventory_movement_exists(p_order_id, v_variant_id, 'sale_out') THEN
      CONTINUE;
    END IF;

    IF NOT public.order_inventory_movement_exists(p_order_id, v_variant_id, 'reserve') THEN
      CONTINUE;
    END IF;

    IF public.order_inventory_movement_exists(p_order_id, v_variant_id, 'release') THEN
      CONTINUE;
    END IF;

    IF v_order.location_id IS NOT NULL THEN
      v_loc_error := public.adjust_location_stock_for_order(
        v_variant_id, v_order.location_id, 'release', v_qty
      );
      IF v_loc_error IS NOT NULL THEN
        RETURN jsonb_build_object('error', v_loc_error);
      END IF;

      INSERT INTO inventory_logs (
        variant_id, movement_type, quantity_change,
        quantity_before, quantity_after, reference_type, reference_id, notes
      ) VALUES (
        v_variant_id, 'release', -v_qty, 0, 0, 'order', p_order_id,
        format('Liberación sucursal %s · pedido cancelado', v_order.location_id)
      );
    ELSE
      INSERT INTO inventory_logs (
        variant_id, movement_type, quantity_change,
        quantity_before, quantity_after, reference_type, reference_id, notes
      ) VALUES (
        v_variant_id, 'release', -v_qty, 0, 0, 'order', p_order_id,
        'Liberación reserva · pedido cancelado'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 6. RLS
-- ============================================================
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_location_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_locations_select_public ON store_locations;
CREATE POLICY store_locations_select_public
  ON store_locations FOR SELECT
  USING (
    is_active = true
    OR public.is_member_of_store(store_id)
  );

DROP POLICY IF EXISTS store_locations_member_write ON store_locations;
CREATE POLICY store_locations_member_write
  ON store_locations FOR ALL TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

DROP POLICY IF EXISTS variant_location_stock_select ON variant_location_stock;
CREATE POLICY variant_location_stock_select
  ON variant_location_stock FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE v.id = variant_location_stock.variant_id
        AND (
          (p.is_active = true AND p.is_deleted = false)
          OR public.is_member_of_store(p.store_id)
        )
    )
  );

DROP POLICY IF EXISTS variant_location_stock_member_write ON variant_location_stock;
CREATE POLICY variant_location_stock_member_write
  ON variant_location_stock FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE v.id = variant_location_stock.variant_id
        AND public.is_member_of_store(p.store_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE v.id = variant_location_stock.variant_id
        AND public.is_member_of_store(p.store_id)
    )
  );

-- Permite filas de auditoría de sucursal con quantity_change = 0 (ya aplicado en location stock).
ALTER TABLE public.inventory_logs
  DROP CONSTRAINT IF EXISTS inventory_logs_quantity_change_check;

ALTER TABLE public.inventory_logs
  ADD CONSTRAINT inventory_logs_quantity_change_check
  CHECK (
    quantity_change <> 0
    OR movement_type IN ('reserve', 'release')
    OR (
      notes IS NOT NULL
      AND (
        notes LIKE 'Reserva sucursal%'
        OR notes LIKE 'Liberación sucursal%'
        OR notes LIKE 'Venta sucursal%'
      )
    )
  );

GRANT SELECT ON store_locations TO anon, authenticated;
GRANT ALL ON store_locations TO authenticated;
GRANT SELECT ON variant_location_stock TO anon, authenticated;
GRANT ALL ON variant_location_stock TO authenticated;
