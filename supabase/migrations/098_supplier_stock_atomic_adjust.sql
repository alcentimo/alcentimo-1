-- Stock dropshipping: fuente de verdad en supplier_products.
-- Ajuste atómico para evitar sobreventas entre muchas tiendas.

CREATE OR REPLACE FUNCTION public.adjust_supplier_product_stock(
  p_supplier_product_id UUID,
  p_delta INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INTEGER;
  v_next INTEGER;
BEGIN
  IF p_supplier_product_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Producto mayorista inválido.');
  END IF;

  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cantidad de ajuste inválida.');
  END IF;

  SELECT sp.stock
  INTO v_stock
  FROM public.supplier_products sp
  WHERE sp.id = p_supplier_product_id
    AND sp.is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Producto mayorista no disponible.');
  END IF;

  v_next := COALESCE(v_stock, 0) + p_delta;
  IF v_next < 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Stock insuficiente en el mayorista.',
      'stock', COALESCE(v_stock, 0)
    );
  END IF;

  UPDATE public.supplier_products
  SET
    stock = v_next,
    updated_at = now()
  WHERE id = p_supplier_product_id;

  RETURN jsonb_build_object(
    'ok', true,
    'stock', v_next,
    'previous_stock', COALESCE(v_stock, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.adjust_supplier_product_stock(UUID, INTEGER) IS
  'Incrementa o descuenta stock del catálogo mayorista de forma atómica (FOR UPDATE).';

REVOKE ALL ON FUNCTION public.adjust_supplier_product_stock(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_supplier_product_stock(UUID, INTEGER) TO service_role;
