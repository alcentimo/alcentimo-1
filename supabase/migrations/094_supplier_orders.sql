-- Pedidos B2B del hub de proveedores (mayoristas).
-- Vincula compras de comerciantes con productos de supplier_products.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'supplier_order_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.supplier_order_status AS ENUM (
      'pendiente',
      'preparando',
      'despachado'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.supplier_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Proveedor que recibe y despacha el pedido.
  supplier_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- Comerciante / tienda que origina el pedido (opcional hasta el marketplace).
  merchant_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  merchant_store_id UUID REFERENCES public.stores (id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_address TEXT,
  -- Agencia de encomienda (mrw, tealca, zoom, …) o texto libre.
  shipping_carrier TEXT,
  shipping_branch_name TEXT,
  shipping_branch_address TEXT,
  status public.supplier_order_status NOT NULL DEFAULT 'pendiente',
  tracking_number TEXT,
  notes TEXT NOT NULL DEFAULT '',
  total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_usd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_orders_supplier_created_idx
  ON public.supplier_orders (supplier_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS supplier_orders_status_idx
  ON public.supplier_orders (supplier_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.supplier_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.supplier_orders (id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.supplier_products (id) ON DELETE SET NULL,
  product_title TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_usd NUMERIC(12, 2) NOT NULL CHECK (unit_price_usd >= 0),
  line_total_usd NUMERIC(12, 2) NOT NULL CHECK (line_total_usd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_order_items_order_idx
  ON public.supplier_order_items (order_id);

COMMENT ON TABLE public.supplier_orders IS
  'Pedidos recibidos por proveedores/mayoristas (hub oculto).';

COMMENT ON TABLE public.supplier_order_items IS
  'Líneas de pedido del hub de proveedores (snapshot de título y precio).';

ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_order_items ENABLE ROW LEVEL SECURITY;

-- Sin policies para anon/authenticated: solo service_role vía acciones server.
