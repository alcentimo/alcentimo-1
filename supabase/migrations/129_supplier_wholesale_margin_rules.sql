-- Regla de margen global por proveedor: Precio mayorista = costo * (1 + percent/100).
CREATE TABLE IF NOT EXISTS public.supplier_wholesale_margin_rules (
  supplier_user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  margin_percent NUMERIC(8, 2) NOT NULL
    CHECK (margin_percent >= 0 AND margin_percent <= 1000),
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.supplier_wholesale_margin_rules IS
  'Margen global (%) que Alcéntimo aplica al costo_proveedor para calcular precio_mayorista.';

COMMENT ON COLUMN public.supplier_wholesale_margin_rules.margin_percent IS
  'Porcentaje sobre el costo del proveedor. Ej: 15 → precio_mayorista = costo * 1.15.';

ALTER TABLE public.supplier_wholesale_margin_rules ENABLE ROW LEVEL SECURITY;
