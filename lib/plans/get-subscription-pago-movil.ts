import { createClient } from "@/lib/supabase/server";
import {
  getDefaultSubscriptionPaymentMethods,
  type SubscriptionPaymentMethod,
} from "@/src/config/subscription-pago-movil";

export const SUBSCRIPTION_PAGO_MOVIL_KEY = "subscription_pago_movil" as const;

type PaymentMethodRow = {
  method_key: string;
  display_name?: string | null;
  bank: string | null;
  phone: string | null;
  ci: string | null;
  holder_name: string | null;
  qr_image_url?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
};

function mapRow(row: PaymentMethodRow): SubscriptionPaymentMethod {
  const bank = row.bank?.trim() || "";
  const name =
    row.display_name?.trim() ||
    (bank ? `Pago Móvil ${bank}` : "Método de pago");

  return {
    id: row.method_key,
    name,
    bank,
    phone: row.phone?.trim() || "",
    ci: row.ci?.trim() || "",
    holderName: row.holder_name?.trim() || "",
    qrImageUrl: row.qr_image_url?.trim() || null,
    isActive: row.is_active !== false,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

function sortMethods(
  methods: SubscriptionPaymentMethod[],
): SubscriptionPaymentMethod[] {
  return [...methods].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, "es");
  });
}

/**
 * Lista todos los métodos de cobro de suscripción (admin).
 * Si la tabla falla o está vacía, usa el fallback de env.
 */
export async function fetchSubscriptionPaymentMethods(): Promise<
  SubscriptionPaymentMethod[]
> {
  const defaults = getDefaultSubscriptionPaymentMethods();

  try {
    const supabase = await createClient();
    const full = await supabase
      .from("payment_methods")
      .select(
        "method_key, display_name, bank, phone, ci, holder_name, qr_image_url, is_active, sort_order",
      )
      .order("sort_order", { ascending: true });

    if (!full.error && full.data?.length) {
      return sortMethods(full.data.map(mapRow));
    }

    // Compatibilidad si la migración 103 aún no se aplicó.
    const legacy = await supabase
      .from("payment_methods")
      .select("method_key, bank, phone, ci, holder_name");

    if (legacy.error || !legacy.data?.length) return defaults;

    return sortMethods(legacy.data.map(mapRow));
  } catch {
    return defaults;
  }
}

/** Solo métodos activos para el checkout de suscripción. */
export async function fetchActiveSubscriptionPaymentMethods(): Promise<
  SubscriptionPaymentMethod[]
> {
  const all = await fetchSubscriptionPaymentMethods();
  const active = all.filter((method) => method.isActive);
  return active.length > 0 ? active : all.slice(0, 1);
}

/**
 * @deprecated Preferir fetchActiveSubscriptionPaymentMethods.
 * Conserva la forma de un solo Pago Móvil (primer método activo).
 */
export async function fetchSubscriptionPagoMovilDetails() {
  const methods = await fetchActiveSubscriptionPaymentMethods();
  const first = methods[0] ?? getDefaultSubscriptionPaymentMethods()[0];
  return {
    bank: first.bank,
    phone: first.phone,
    ci: first.ci,
    holderName: first.holderName,
  };
}
