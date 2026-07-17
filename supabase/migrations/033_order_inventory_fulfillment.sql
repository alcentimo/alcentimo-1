-- Reserva y descuento de inventario para pedidos transaccionales (orders.items JSONB).
-- reserve_order_inventory: al crear el pedido (evita sobreventa concurrente).
-- fulfill/cancel: al marcar entregado o cancelado vía update_order_estado_with_inventory.

CREATE OR REPLACE FUNCTION public.order_inventory_movement_exists(
  p_order_id UUID,
  p_variant_id UUID,
  p_movement_type inventory_movement_type
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM inventory_logs il
    WHERE il.reference_type = 'order'
      AND il.reference_id = p_order_id
      AND il.variant_id = p_variant_id
      AND il.movement_type = p_movement_type
  );
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
BEGIN
  SELECT id, store_id, items
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

    IF v_available < v_qty THEN
      RETURN jsonb_build_object(
        'error',
        format('Stock insuficiente (disponible: %s, solicitado: %s).', v_available, v_qty)
      );
    END IF;

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
  v_order      RECORD;
  item         JSONB;
  v_variant_id UUID;
  v_qty        INTEGER;
  v_available  INTEGER;
  v_has_reserve BOOLEAN;
BEGIN
  SELECT id, store_id, items
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

    IF v_has_reserve
       AND NOT public.order_inventory_movement_exists(p_order_id, v_variant_id, 'release') THEN
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
        'release',
        -v_qty,
        0,
        0,
        'order',
        p_order_id,
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

      IF v_available IS NULL THEN
        RETURN jsonb_build_object('error', 'Producto no disponible en esta tienda.');
      END IF;

      IF v_available < v_qty THEN
        RETURN jsonb_build_object(
          'error',
          format('Stock insuficiente para entregar (disponible: %s, solicitado: %s).', v_available, v_qty)
        );
      END IF;
    END IF;

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
      'sale_out',
      -v_qty,
      0,
      0,
      'order',
      p_order_id,
      'Pedido entregado · catálogo transaccional'
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
BEGIN
  SELECT id, store_id, items
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

    IF public.order_inventory_movement_exists(p_order_id, v_variant_id, 'release') THEN
      CONTINUE;
    END IF;

    IF NOT public.order_inventory_movement_exists(p_order_id, v_variant_id, 'reserve') THEN
      CONTINUE;
    END IF;

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
      'release',
      -v_qty,
      0,
      0,
      'order',
      p_order_id,
      'Liberación reserva · pedido cancelado'
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_estado_with_inventory(
  p_order_id UUID,
  p_store_id UUID,
  p_new_estado TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_estado TEXT;
  v_result     JSONB;
BEGIN
  IF NOT public.is_member_of_store(p_store_id) THEN
    RETURN jsonb_build_object('error', 'No autorizado.');
  END IF;

  IF p_new_estado NOT IN (
    'pendiente',
    'verificando',
    'en_preparacion',
    'enviado',
    'entregado',
    'cancelado'
  ) THEN
    RETURN jsonb_build_object('error', 'Estado no válido.');
  END IF;

  SELECT estado
  INTO v_old_estado
  FROM orders
  WHERE id = p_order_id
    AND store_id = p_store_id
  FOR UPDATE;

  IF v_old_estado IS NULL THEN
    RETURN jsonb_build_object('error', 'Pedido no encontrado.');
  END IF;

  IF v_old_estado = p_new_estado THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  IF p_new_estado = 'entregado' AND v_old_estado <> 'entregado' THEN
    v_result := public.fulfill_order_inventory(p_order_id);
    IF v_result ? 'error' THEN
      RETURN v_result;
    END IF;
  END IF;

  IF p_new_estado = 'cancelado' AND v_old_estado <> 'cancelado' THEN
    v_result := public.cancel_order_inventory_reserves(p_order_id);
    IF v_result ? 'error' THEN
      RETURN v_result;
    END IF;
  END IF;

  UPDATE orders
  SET estado = p_new_estado
  WHERE id = p_order_id
    AND store_id = p_store_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_order_inventory(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_order_estado_with_inventory(UUID, UUID, TEXT) TO authenticated;
