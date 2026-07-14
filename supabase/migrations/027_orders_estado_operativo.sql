-- ============================================================
-- alcentimo-1 — Estados operativos de pedidos + teléfono cliente
-- Ejecutar DESPUÉS de 026_stores_rubro_tienda.sql
--
-- ORDEN SEGURO:
--   1. Preparar esquema (columna teléfono, renombrar status → estado)
--   2. Quitar constraints viejos (permite actualizar valores libremente)
--   3. Limpiar datos inválidos → 'pendiente'
--   4. Aplicar CHECK constraint solo cuando la tabla ya está limpia
-- ============================================================

-- ── 1. Preparar esquema ─────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

COMMENT ON COLUMN public.orders.customer_phone IS
  'Teléfono del cliente para contacto por WhatsApp.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'estado'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN status TO estado;
  END IF;
END $$;

-- ── 2. Quitar constraints ANTES de limpiar datos ──────────
--    (si no, el CHECK viejo bloquea valores como 'pendiente')

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_estado_check;

-- ── 3. Limpieza de datos ────────────────────────────────────

-- Valores legacy en inglés
UPDATE public.orders SET estado = 'pendiente' WHERE estado = 'pending';
UPDATE public.orders SET estado = 'entregado' WHERE estado = 'confirmed';
UPDATE public.orders SET estado = 'cancelado' WHERE estado = 'cancelled';

-- NULL o vacío
UPDATE public.orders
SET estado = 'pendiente'
WHERE estado IS NULL
   OR TRIM(estado) = '';

-- Cualquier otro valor no reconocido
UPDATE public.orders
SET estado = 'pendiente'
WHERE estado NOT IN (
  'pendiente',
  'verificando',
  'en_preparacion',
  'enviado',
  'entregado',
  'cancelado'
);

-- ── 4. Default y constraint (tabla ya limpia) ───────────────

ALTER TABLE public.orders
  ALTER COLUMN estado SET DEFAULT 'pendiente';

ALTER TABLE public.orders
  ALTER COLUMN estado SET NOT NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_estado_check
  CHECK (
    estado IN (
      'pendiente',
      'verificando',
      'en_preparacion',
      'enviado',
      'entregado',
      'cancelado'
    )
  );

COMMENT ON COLUMN public.orders.estado IS
  'Estado operativo del pedido en el dashboard.';
