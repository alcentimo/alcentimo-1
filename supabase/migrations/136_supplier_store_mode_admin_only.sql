-- El modo tienda / dropshipper del proveedor solo lo controla el admin.
-- El proveedor lee el flag; no hay policy de UPDATE para authenticated.

COMMENT ON COLUMN public.supplier_profiles.store_mode_enabled IS
  'Habilitado solo desde el panel admin. Si es true, el proveedor ve «Ir a mi tienda» y accede a /dashboard además del inventario mayorista.';
