-- Papelería: pedidos por empaque descontar unidades base de inventario.

CREATE OR REPLACE FUNCTION public.order_item_stock_units(item JSONB)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(trim(item->>'stock_units'), '')::INTEGER,
    (item->>'quantity')::INTEGER
  );
$$;

CREATE OR REPLACE FUNCTION public.order_item_inventory_variant_id(
  p_variant_id UUID,
  p_item JSONB
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_explicit UUID;
  v_default UUID;
BEGIN
  v_explicit := NULLIF(trim(p_item->>'inventory_variant_id'), '')::UUID;
  IF v_explicit IS NOT NULL THEN
    RETURN v_explicit;
  END IF;

  SELECT vd.id
  INTO v_default
  FROM product_variants v
  JOIN product_variants vd
    ON vd.product_id = v.product_id
   AND vd.is_default = true
   AND vd.is_active = true
  WHERE v.id = p_variant_id;

  RETURN COALESCE(v_default, p_variant_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_order_inventory(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           RECORD;
  item              JSONB;
  v_line_variant_id UUID;
  v_variant_id      UUID;
  v_qty             INTEGER;
  v_available       INTEGER;
  v_loc_error       TEXT;
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
    v_line_variant_id := NULLIF(item->>'variant_id', '')::UUID;
    v_variant_id := public.order_item_inventory_variant_id(v_line_variant_id, item);
    v_qty := public.order_item_stock_units(item);

    IF v_line_variant_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RETURN jsonb_build_object('error', 'Ítem de pedido inválido.');
    END IF;

    IF public.order_inventory_movement_exists(p_order_id, v_line_variant_id, 'reserve') THEN
      CONTINUE;
    END IF;

    IF public.order_inventory_movement_exists(p_order_id, v_line_variant_id, 'sale_out') THEN
      CONTINUE;
    END IF;

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

CREATE OR REPLACE FUNCTION public.fulfill_order_inventory(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           RECORD;
  item              JSONB;
  v_line_variant_id UUID;
  v_variant_id      UUID;
  v_qty             INTEGER;
  v_available       INTEGER;
  v_has_reserve     BOOLEAN;
  v_loc_error       TEXT;
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
    v_line_variant_id := NULLIF(item->>'variant_id', '')::UUID;
    v_variant_id := public.order_item_inventory_variant_id(v_line_variant_id, item);
    v_qty := public.order_item_stock_units(item);

    IF v_line_variant_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RETURN jsonb_build_object('error', 'Ítem de pedido inválido.');
    END IF;

    IF public.order_inventory_movement_exists(p_order_id, v_line_variant_id, 'sale_out') THEN
      CONTINUE;
    END IF;

    v_has_reserve := public.order_inventory_movement_exists(
      p_order_id,
      v_line_variant_id,
      'reserve'
    );

    IF v_order.location_id IS NOT NULL THEN
      IF v_has_reserve
         AND NOT public.order_inventory_movement_exists(p_order_id, v_line_variant_id, 'release') THEN
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
       AND NOT public.order_inventory_movement_exists(p_order_id, v_line_variant_id, 'release') THEN
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
  v_order           RECORD;
  item              JSONB;
  v_line_variant_id UUID;
  v_variant_id      UUID;
  v_qty             INTEGER;
  v_loc_error       TEXT;
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
    v_line_variant_id := NULLIF(item->>'variant_id', '')::UUID;
    v_variant_id := public.order_item_inventory_variant_id(v_line_variant_id, item);
    v_qty := public.order_item_stock_units(item);

    IF v_line_variant_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    IF public.order_inventory_movement_exists(p_order_id, v_line_variant_id, 'sale_out') THEN
      CONTINUE;
    END IF;

    IF NOT public.order_inventory_movement_exists(p_order_id, v_line_variant_id, 'reserve') THEN
      CONTINUE;
    END IF;

    IF public.order_inventory_movement_exists(p_order_id, v_line_variant_id, 'release') THEN
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

GRANT EXECUTE ON FUNCTION public.order_item_stock_units(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.order_item_inventory_variant_id(UUID, JSONB) TO service_role;
