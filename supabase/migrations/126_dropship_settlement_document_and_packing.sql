-- Cédula del comprador final en el lote de liquidación y en el pedido de acopio.

ALTER TABLE public.dropship_daily_settlement_lines
  ADD COLUMN IF NOT EXISTS customer_document_id TEXT;

COMMENT ON COLUMN public.dropship_daily_settlement_lines.customer_document_id IS
  'Cédula o RIF del cliente final (snapshot al reportar el pago consolidado).';

ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS buyer_document_id TEXT;

COMMENT ON COLUMN public.supplier_orders.buyer_document_id IS
  'Cédula o RIF del destinatario para la etiqueta de despacho del centro de acopio.';
