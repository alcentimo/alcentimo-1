export interface SupplierHubProfile {
  userId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  warehouseAddress: string;
  pickupHours: string;
}

export const WAREHOUSE_ADDRESS_MIN_LENGTH = 8;
export const PICKUP_HOURS_MIN_LENGTH = 4;

export function validateSupplierPickupFields(input: {
  warehouseAddress: string;
  pickupHours: string;
}):
  | { ok: true; warehouseAddress: string; pickupHours: string }
  | { ok: false; error: string } {
  const warehouseAddress = input.warehouseAddress.trim().slice(0, 400);
  if (warehouseAddress.length < WAREHOUSE_ADDRESS_MIN_LENGTH) {
    return {
      ok: false,
      error:
        "Indica la dirección física del almacén o tienda (calle, número, ciudad).",
    };
  }

  const pickupHours = input.pickupHours.trim().slice(0, 200);
  if (pickupHours.length < PICKUP_HOURS_MIN_LENGTH) {
    return {
      ok: false,
      error: "Indica los horarios de retiro (por ejemplo: Lun–Vie 8:00–16:00).",
    };
  }

  return { ok: true, warehouseAddress, pickupHours };
}
