-- Reservas temporales de stock dropship (carrito 20 min) y descuento
-- definitivo solo al confirmar la compra del cliente final.
-- El stock físico vive en supplier_products; reserved_quantity es la suma
-- de holds activos. Disponible = stock - reserved_quantity.

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0
    CHECK (reserved_quantity >= 0);

COMMENT ON COLUMN public.supplier_products.reserved_quantity IS
  'Unidades apartadas (carrito u orden no confirmada). No descuenta stock físico.';

CREATE TABLE IF NOT EXISTS public.dropship_stock_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL
    REFERENCES public.supplier_products (id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  customer_user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  session_key TEXT,
  catalog_order_id UUID REFERENCES public.orders (id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products (id) ON DELETE SET NULL,
  variant_id TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  kind TEXT NOT NULL CHECK (kind IN ('cart', 'order')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'committed', 'released')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dropship_stock_holds_owner_chk CHECK (
    customer_user_id IS NOT NULL
    OR (session_key IS NOT NULL AND char_length(btrim(session_key)) >= 8)
  )
);

CREATE INDEX IF NOT EXISTS dropship_stock_holds_supplier_active_idx
  ON public.dropship_stock_holds (supplier_product_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS dropship_stock_holds_expires_idx
  ON public.dropship_stock_holds (expires_at)
  WHERE status = 'active' AND kind = 'cart' AND expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS dropship_stock_holds_order_idx
  ON public.dropship_stock_holds (catalog_order_id)
  WHERE catalog_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dropship_stock_holds_cart_owner_uidx
  ON public.dropship_stock_holds (
    store_id,
    supplier_product_id,
    kind,
    COALESCE(customer_user_id::text, ''),
    COALESCE(session_key, '')
  )
  WHERE status = 'active' AND kind = 'cart';

COMMENT ON TABLE public.dropship_stock_holds IS
  'Apartados globales de stock mayorista. Carrito expira; la orden confirma o libera.';

ALTER TABLE public.dropship_stock_holds ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.recompute_supplier_reserved_quantity(
  p_supplier_product_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserved INTEGER;
BEGIN
  SELECT COALESCE(SUM(h.quantity), 0)
    INTO v_reserved
  FROM public.dropship_stock_holds h
  WHERE h.supplier_product_id = p_supplier_product_id
    AND h.status = 'active';

  UPDATE public.supplier_products
  SET
    reserved_quantity = v_reserved,
    updated_at = now()
  WHERE id = p_supplier_product_id;

  RETURN v_reserved;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_expired_dropship_stock_holds()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
  v_id UUID;
BEGIN
  WITH expired AS (
    UPDATE public.dropship_stock_holds
    SET
      status = 'released',
      updated_at = now()
    WHERE status = 'active'
      AND kind = 'cart'
      AND expires_at IS NOT NULL
      AND expires_at <= now()
    RETURNING supplier_product_id
  )
  SELECT ARRAY_AGG(DISTINCT supplier_product_id)
    INTO v_ids
  FROM expired;

  IF v_ids IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'affected_ids', '[]'::jsonb, 'released', 0);
  END IF;

  FOREACH v_id IN ARRAY v_ids LOOP
    PERFORM public.recompute_supplier_reserved_quantity(v_id);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'affected_ids', to_jsonb(v_ids),
    'released', COALESCE(array_length(v_ids, 1), 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_dropship_cart_holds(
  p_store_id UUID,
  p_customer_user_id UUID,
  p_session_key TEXT,
  p_lines JSONB,
  p_ttl_minutes INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires TIMESTAMPTZ;
  v_line JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_supplier_id UUID;
  v_stock INTEGER;
  v_reserved INTEGER;
  v_old INTEGER;
  v_granted INTEGER;
  v_available INTEGER;
  v_session TEXT;
  v_affected UUID[] := ARRAY[]::UUID[];
  v_holds JSONB := '[]'::jsonb;
  v_mark UUID;
BEGIN
  PERFORM public.release_expired_dropship_stock_holds();

  IF p_store_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tienda inválida.');
  END IF;

  v_session := NULLIF(btrim(COALESCE(p_session_key, '')), '');
  IF p_customer_user_id IS NULL AND v_session IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sesión de carrito inválida.');
  END IF;

  v_expires := now() + make_interval(mins => GREATEST(COALESCE(p_ttl_minutes, 20), 1));

  CREATE TEMP TABLE IF NOT EXISTS _ds_cart_desired (
    supplier_product_id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL
  ) ON COMMIT DROP;
  DELETE FROM _ds_cart_desired;

  FOR v_line IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_lines, '[]'::jsonb))
  LOOP
    BEGIN
      v_product_id := NULLIF(v_line->>'product_id', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_product_id := NULL;
    END;
    v_qty := GREATEST(0, FLOOR(COALESCE((v_line->>'quantity')::NUMERIC, 0)));
    IF v_product_id IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT l.supplier_product_id
      INTO v_supplier_id
    FROM public.store_dropship_links l
    WHERE l.store_id = p_store_id
      AND l.product_id = v_product_id
    LIMIT 1;

    IF v_supplier_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO _ds_cart_desired (supplier_product_id, product_id, quantity)
    VALUES (v_supplier_id, v_product_id, v_qty)
    ON CONFLICT (supplier_product_id) DO UPDATE
      SET quantity = _ds_cart_desired.quantity + EXCLUDED.quantity;
  END LOOP;

  -- Liberar holds de carrito que ya no están en el carrito.
  FOR v_mark IN
    SELECT h.supplier_product_id
    FROM public.dropship_stock_holds h
    WHERE h.store_id = p_store_id
      AND h.kind = 'cart'
      AND h.status = 'active'
      AND (
        (p_customer_user_id IS NOT NULL AND h.customer_user_id = p_customer_user_id)
        OR (p_customer_user_id IS NULL AND h.session_key = v_session)
      )
      AND NOT EXISTS (
        SELECT 1 FROM _ds_cart_desired d
        WHERE d.supplier_product_id = h.supplier_product_id
      )
  LOOP
    UPDATE public.dropship_stock_holds
    SET status = 'released', updated_at = now()
    WHERE store_id = p_store_id
      AND supplier_product_id = v_mark
      AND kind = 'cart'
      AND status = 'active'
      AND (
        (p_customer_user_id IS NOT NULL AND customer_user_id = p_customer_user_id)
        OR (p_customer_user_id IS NULL AND session_key = v_session)
      );
    PERFORM public.recompute_supplier_reserved_quantity(v_mark);
    v_affected := array_append(v_affected, v_mark);
  END LOOP;

  FOR v_supplier_id, v_product_id, v_qty IN
    SELECT supplier_product_id, product_id, quantity FROM _ds_cart_desired
  LOOP
    SELECT sp.stock, sp.reserved_quantity
      INTO v_stock, v_reserved
    FROM public.supplier_products sp
    WHERE sp.id = v_supplier_id
      AND sp.is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(h.quantity), 0)
      INTO v_old
    FROM public.dropship_stock_holds h
    WHERE h.store_id = p_store_id
      AND h.supplier_product_id = v_supplier_id
      AND h.kind = 'cart'
      AND h.status = 'active'
      AND (
        (p_customer_user_id IS NOT NULL AND h.customer_user_id = p_customer_user_id)
        OR (p_customer_user_id IS NULL AND h.session_key = v_session)
      );

    v_available := GREATEST(COALESCE(v_stock, 0) - COALESCE(v_reserved, 0) + v_old, 0);
    v_granted := LEAST(v_qty, v_available);

    IF v_granted <= 0 THEN
      UPDATE public.dropship_stock_holds
      SET status = 'released', updated_at = now()
      WHERE store_id = p_store_id
        AND supplier_product_id = v_supplier_id
        AND kind = 'cart'
        AND status = 'active'
        AND (
          (p_customer_user_id IS NOT NULL AND customer_user_id = p_customer_user_id)
          OR (p_customer_user_id IS NULL AND session_key = v_session)
        );
      PERFORM public.recompute_supplier_reserved_quantity(v_supplier_id);
      v_affected := array_append(v_affected, v_supplier_id);
      CONTINUE;
    END IF;

    UPDATE public.dropship_stock_holds
    SET
      quantity = v_granted,
      product_id = v_product_id,
      expires_at = v_expires,
      updated_at = now()
    WHERE store_id = p_store_id
      AND supplier_product_id = v_supplier_id
      AND kind = 'cart'
      AND status = 'active'
      AND (
        (p_customer_user_id IS NOT NULL AND customer_user_id = p_customer_user_id)
        OR (p_customer_user_id IS NULL AND session_key = v_session)
      );

    IF NOT FOUND THEN
      INSERT INTO public.dropship_stock_holds (
        supplier_product_id,
        store_id,
        customer_user_id,
        session_key,
        product_id,
        quantity,
        kind,
        status,
        expires_at
      ) VALUES (
        v_supplier_id,
        p_store_id,
        p_customer_user_id,
        CASE WHEN p_customer_user_id IS NULL THEN v_session ELSE NULL END,
        v_product_id,
        v_granted,
        'cart',
        'active',
        v_expires
      );
    END IF;

    PERFORM public.recompute_supplier_reserved_quantity(v_supplier_id);
    v_affected := array_append(v_affected, v_supplier_id);
    v_holds := v_holds || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product_id,
        'supplier_product_id', v_supplier_id,
        'quantity', v_granted,
        'expires_at', v_expires
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'affected_ids', to_jsonb(ARRAY(SELECT DISTINCT unnest(v_affected))),
    'holds', v_holds
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_dropship_cart_holds(
  p_store_id UUID,
  p_session_key TEXT,
  p_customer_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session TEXT;
  v_ids UUID[];
BEGIN
  v_session := NULLIF(btrim(COALESCE(p_session_key, '')), '');
  IF p_store_id IS NULL OR p_customer_user_id IS NULL OR v_session IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'affected_ids', '[]'::jsonb);
  END IF;

  WITH moved AS (
    UPDATE public.dropship_stock_holds
    SET
      customer_user_id = p_customer_user_id,
      session_key = NULL,
      updated_at = now()
    WHERE store_id = p_store_id
      AND kind = 'cart'
      AND status = 'active'
      AND session_key = v_session
      AND customer_user_id IS NULL
    RETURNING supplier_product_id
  )
  SELECT ARRAY_AGG(DISTINCT supplier_product_id) INTO v_ids FROM moved;

  RETURN jsonb_build_object(
    'ok', true,
    'affected_ids', COALESCE(to_jsonb(v_ids), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_dropship_cart_holds_to_order(
  p_store_id UUID,
  p_customer_user_id UUID,
  p_session_key TEXT,
  p_order_id UUID,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_supplier_id UUID;
  v_stock INTEGER;
  v_reserved INTEGER;
  v_old INTEGER;
  v_session TEXT;
  v_affected UUID[] := ARRAY[]::UUID[];
BEGIN
  PERFORM public.release_expired_dropship_stock_holds();

  IF p_store_id IS NULL OR p_order_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pedido inválido.');
  END IF;

  v_session := NULLIF(btrim(COALESCE(p_session_key, '')), '');

  CREATE TEMP TABLE IF NOT EXISTS _ds_order_desired (
    supplier_product_id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL
  ) ON COMMIT DROP;
  DELETE FROM _ds_order_desired;

  FOR v_line IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_lines, '[]'::jsonb))
  LOOP
    BEGIN
      v_product_id := NULLIF(v_line->>'product_id', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_product_id := NULL;
    END;
    v_qty := GREATEST(0, FLOOR(COALESCE((v_line->>'quantity')::NUMERIC, 0)));
    BEGIN
      v_supplier_id := NULLIF(v_line->>'supplier_product_id', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_supplier_id := NULL;
    END;
    IF v_product_id IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;
    IF v_supplier_id IS NULL THEN
      SELECT l.supplier_product_id
        INTO v_supplier_id
      FROM public.store_dropship_links l
      WHERE l.store_id = p_store_id
        AND l.product_id = v_product_id
      LIMIT 1;
    END IF;
    IF v_supplier_id IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO _ds_order_desired (supplier_product_id, product_id, quantity)
    VALUES (v_supplier_id, v_product_id, v_qty)
    ON CONFLICT (supplier_product_id) DO UPDATE
      SET quantity = _ds_order_desired.quantity + EXCLUDED.quantity;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM _ds_order_desired) THEN
    RETURN jsonb_build_object('ok', true, 'affected_ids', '[]'::jsonb, 'converted', 0);
  END IF;

  FOR v_supplier_id, v_product_id, v_qty IN
    SELECT supplier_product_id, product_id, quantity FROM _ds_order_desired
  LOOP
    SELECT sp.stock, sp.reserved_quantity
      INTO v_stock, v_reserved
    FROM public.supplier_products sp
    WHERE sp.id = v_supplier_id
      AND sp.is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Producto mayorista no disponible.');
    END IF;

    SELECT COALESCE(SUM(h.quantity), 0)
      INTO v_old
    FROM public.dropship_stock_holds h
    WHERE h.store_id = p_store_id
      AND h.supplier_product_id = v_supplier_id
      AND h.status = 'active'
      AND h.kind = 'cart'
      AND (
        (p_customer_user_id IS NOT NULL AND h.customer_user_id = p_customer_user_id)
        OR (v_session IS NOT NULL AND h.session_key = v_session)
      );

    IF GREATEST(COALESCE(v_stock, 0) - COALESCE(v_reserved, 0) + v_old, 0) < v_qty THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'No hay stock suficiente en el proveedor para completar este pedido.'
      );
    END IF;

    UPDATE public.dropship_stock_holds
    SET
      status = 'released',
      updated_at = now()
    WHERE store_id = p_store_id
      AND supplier_product_id = v_supplier_id
      AND kind = 'cart'
      AND status = 'active'
      AND (
        (p_customer_user_id IS NOT NULL AND customer_user_id = p_customer_user_id)
        OR (v_session IS NOT NULL AND session_key = v_session)
      );

    INSERT INTO public.dropship_stock_holds (
      supplier_product_id,
      store_id,
      customer_user_id,
      session_key,
      catalog_order_id,
      product_id,
      quantity,
      kind,
      status,
      expires_at
    ) VALUES (
      v_supplier_id,
      p_store_id,
      p_customer_user_id,
      NULL,
      p_order_id,
      v_product_id,
      v_qty,
      'order',
      'active',
      NULL
    );

    PERFORM public.recompute_supplier_reserved_quantity(v_supplier_id);
    v_affected := array_append(v_affected, v_supplier_id);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'affected_ids', to_jsonb(ARRAY(SELECT DISTINCT unnest(v_affected))),
    'converted', COALESCE(array_length(v_affected, 1), 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_dropship_order_holds(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
  v_id UUID;
  v_qty INTEGER;
  v_stock INTEGER;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pedido inválido.');
  END IF;

  SELECT ARRAY_AGG(DISTINCT supplier_product_id)
    INTO v_ids
  FROM public.dropship_stock_holds
  WHERE catalog_order_id = p_order_id
    AND kind = 'order'
    AND status = 'active';

  IF v_ids IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'affected_ids', '[]'::jsonb, 'committed', 0);
  END IF;

  FOR v_id IN SELECT DISTINCT h.supplier_product_id
              FROM public.dropship_stock_holds h
              WHERE h.catalog_order_id = p_order_id
                AND h.kind = 'order'
                AND h.status = 'active'
  LOOP
    SELECT COALESCE(SUM(quantity), 0)
      INTO v_qty
    FROM public.dropship_stock_holds
    WHERE catalog_order_id = p_order_id
      AND supplier_product_id = v_id
      AND kind = 'order'
      AND status = 'active';

    SELECT stock INTO v_stock
    FROM public.supplier_products
    WHERE id = v_id
    FOR UPDATE;

    IF COALESCE(v_stock, 0) < v_qty THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Stock insuficiente en el mayorista.',
        'stock', COALESCE(v_stock, 0)
      );
    END IF;

    UPDATE public.supplier_products
    SET stock = stock - v_qty, updated_at = now()
    WHERE id = v_id;

    UPDATE public.dropship_stock_holds
    SET status = 'committed', updated_at = now()
    WHERE catalog_order_id = p_order_id
      AND supplier_product_id = v_id
      AND kind = 'order'
      AND status = 'active';

    PERFORM public.recompute_supplier_reserved_quantity(v_id);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'affected_ids', to_jsonb(v_ids),
    'committed', COALESCE(array_length(v_ids, 1), 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_dropship_order_holds(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_ids UUID[] := ARRAY[]::UUID[];
  v_physical INTEGER := 0;
  v_reserved INTEGER := 0;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pedido inválido.');
  END IF;

  FOR r IN
    SELECT supplier_product_id, status, SUM(quantity) AS qty
    FROM public.dropship_stock_holds
    WHERE catalog_order_id = p_order_id
      AND kind = 'order'
      AND status IN ('active', 'committed')
    GROUP BY supplier_product_id, status
  LOOP
    IF r.status = 'committed' THEN
      UPDATE public.supplier_products
      SET stock = stock + r.qty, updated_at = now()
      WHERE id = r.supplier_product_id;
      v_physical := v_physical + 1;
    ELSE
      v_reserved := v_reserved + 1;
    END IF;

    UPDATE public.dropship_stock_holds
    SET status = 'released', updated_at = now()
    WHERE catalog_order_id = p_order_id
      AND supplier_product_id = r.supplier_product_id
      AND kind = 'order'
      AND status = r.status;

    PERFORM public.recompute_supplier_reserved_quantity(r.supplier_product_id);
    v_ids := array_append(v_ids, r.supplier_product_id);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'affected_ids', to_jsonb(ARRAY(SELECT DISTINCT unnest(v_ids))),
    'released_reserved', v_reserved,
    'restored_physical', v_physical,
    'missing', COALESCE(array_length(v_ids, 1), 0) = 0
  );
END;
$$;

-- Disponible no puede quedar por debajo de las reservas activas.
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
  v_reserved INTEGER;
  v_next INTEGER;
BEGIN
  IF p_supplier_product_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Producto mayorista inválido.');
  END IF;

  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cantidad de ajuste inválida.');
  END IF;

  SELECT sp.stock, sp.reserved_quantity
  INTO v_stock, v_reserved
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
  IF v_next < COALESCE(v_reserved, 0) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'El stock no puede ser menor que las unidades reservadas.',
      'stock', COALESCE(v_stock, 0),
      'reserved', COALESCE(v_reserved, 0)
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
    'reserved', COALESCE(v_reserved, 0),
    'available', GREATEST(v_next - COALESCE(v_reserved, 0), 0),
    'previous_stock', COALESCE(v_stock, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_supplier_reserved_quantity(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_expired_dropship_stock_holds() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_dropship_cart_holds(UUID, UUID, TEXT, JSONB, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_dropship_cart_holds(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.convert_dropship_cart_holds_to_order(UUID, UUID, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.commit_dropship_order_holds(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_dropship_order_holds(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_supplier_product_stock(UUID, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recompute_supplier_reserved_quantity(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_dropship_stock_holds() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_dropship_cart_holds(UUID, UUID, TEXT, JSONB, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_dropship_cart_holds(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.convert_dropship_cart_holds_to_order(UUID, UUID, TEXT, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_dropship_order_holds(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_dropship_order_holds(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_supplier_product_stock(UUID, INTEGER) TO service_role;
