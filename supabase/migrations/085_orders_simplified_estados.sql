-- Simplifica estados de órdenes a: pendiente, procesando, enviado, entregado, cancelado.
-- Migra verificando / en_preparacion → procesando.
-- Añade tracking_number (guía de encomienda, opcional).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;

COMMENT ON COLUMN public.orders.tracking_number IS
  'Número de guía de la empresa de encomiendas (opcional, al marcar Enviado).';

-- Quitar el check antes de remapear estados (el constraint viejo no admite "procesando").
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_estado_check;

UPDATE public.orders
SET estado = 'procesando'
WHERE estado IN ('verificando', 'en_preparacion');

ALTER TABLE public.orders
  ADD CONSTRAINT orders_estado_check
  CHECK (
    estado IN (
      'pendiente',
      'procesando',
      'enviado',
      'entregado',
      'cancelado'
    )
  );

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
    'procesando',
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

GRANT EXECUTE ON FUNCTION public.update_order_estado_with_inventory(UUID, UUID, TEXT) TO authenticated;
