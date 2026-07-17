-- reserve/release zero out quantity_change in apply_inventory_movement (BEFORE INSERT),
-- but inventory_logs had CHECK (quantity_change <> 0), blocking order reservations.

ALTER TABLE public.inventory_logs
  DROP CONSTRAINT IF EXISTS inventory_logs_quantity_change_check;

ALTER TABLE public.inventory_logs
  ADD CONSTRAINT inventory_logs_quantity_change_check
  CHECK (
    quantity_change <> 0
    OR movement_type IN ('reserve', 'release')
  );
