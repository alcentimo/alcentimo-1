"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { uploadPlatformPaymentQrImage } from "@/lib/storage";
import type { SubscriptionPaymentMethod } from "@/src/config/subscription-pago-movil";

export type PaymentMethodActionResult = {
  error?: string;
  success?: boolean;
  method?: SubscriptionPaymentMethod;
  methods?: SubscriptionPaymentMethod[];
};

function revalidatePaymentPaths() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/upgrade");
  revalidatePath("/dashboard/pago");
}

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { error: "No tienes permiso para editar la configuración de pago." as const };
  }

  return { user };
}

function normalizeRequired(
  value: unknown,
  label: string,
  max = 120,
): string | { error: string } {
  if (typeof value !== "string") {
    return { error: `${label} es obligatorio.` };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: `${label} es obligatorio.` };
  }
  if (trimmed.length > max) {
    return { error: `${label} es demasiado largo.` };
  }
  return trimmed;
}

function normalizeOptional(value: unknown, max = 120): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function slugifyMethodKey(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base || "metodo"}_${suffix}`;
}

function mapRow(row: {
  method_key: string;
  display_name: string | null;
  bank: string;
  phone: string;
  ci: string;
  holder_name: string;
  qr_image_url: string | null;
  is_active: boolean;
  sort_order: number;
}): SubscriptionPaymentMethod {
  return {
    id: row.method_key,
    name: row.display_name?.trim() || row.bank,
    bank: row.bank,
    phone: row.phone,
    ci: row.ci,
    holderName: row.holder_name,
    qrImageUrl: row.qr_image_url,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

async function fetchAllMethods(
  admin: ReturnType<typeof createAdminClient>,
): Promise<SubscriptionPaymentMethod[]> {
  const { data } = await admin
    .from("payment_methods")
    .select(
      "method_key, display_name, bank, phone, ci, holder_name, qr_image_url, is_active, sort_order",
    )
    .order("sort_order", { ascending: true });

  return (data ?? []).map(mapRow);
}

function parseMethodFields(formData: FormData) {
  const name = normalizeRequired(formData.get("name"), "Nombre del método");
  if (typeof name === "object") return name;

  const bank = normalizeRequired(formData.get("bank"), "Banco o plataforma");
  if (typeof bank === "object") return bank;

  const phone = normalizeRequired(
    formData.get("phone"),
    "Teléfono / Correo",
  );
  if (typeof phone === "object") return phone;

  const ci = normalizeRequired(formData.get("ci"), "Cédula / RIF");
  if (typeof ci === "object") return ci;

  const holderName = normalizeOptional(formData.get("holderName"));
  const qrImageUrl = normalizeOptional(formData.get("qrImageUrl"), 500);
  const isActiveRaw = formData.get("isActive");
  const isActive =
    isActiveRaw === "false" || isActiveRaw === "0" ? false : true;

  return {
    name,
    bank,
    phone,
    ci,
    holderName,
    qrImageUrl: qrImageUrl || null,
    isActive,
  };
}

/** @deprecated Usar upsertSubscriptionPaymentMethod. */
export type UpdatePaymentMethodsResult = PaymentMethodActionResult & {
  details?: {
    bank: string;
    phone: string;
    ci: string;
    holderName: string;
  };
};

/** @deprecated Preferir upsertSubscriptionPaymentMethod. */
export async function updateSubscriptionPagoMovil(
  formData: FormData,
): Promise<UpdatePaymentMethodsResult> {
  if (!formData.get("name")) {
    formData.set("name", "Pago Móvil");
  }
  if (!formData.get("id")) {
    formData.set("id", "subscription_pago_movil");
  }
  const result = await upsertSubscriptionPaymentMethod(formData);
  if (result.error || !result.method) {
    return { error: result.error ?? "No se pudo guardar." };
  }
  return {
    success: true,
    method: result.method,
    details: {
      bank: result.method.bank,
      phone: result.method.phone,
      ci: result.method.ci,
      holderName: result.method.holderName,
    },
  };
}

export async function upsertSubscriptionPaymentMethod(
  formData: FormData,
): Promise<PaymentMethodActionResult> {
  const auth = await requireSupportAdmin();
  if ("error" in auth) return auth;

  const fields = parseMethodFields(formData);
  if ("error" in fields) return fields;

  const existingId = normalizeOptional(formData.get("id"), 80);
  const methodKey = existingId || slugifyMethodKey(fields.name);

  const admin = createAdminClient();

  let sortOrder = 0;
  if (!existingId) {
    const { data: last } = await admin
      .from("payment_methods")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder =
      typeof last?.sort_order === "number" ? last.sort_order + 1 : 0;
  } else {
    const { data: current } = await admin
      .from("payment_methods")
      .select("sort_order")
      .eq("method_key", methodKey)
      .maybeSingle();
    sortOrder =
      typeof current?.sort_order === "number" ? current.sort_order : 0;
  }

  const { data, error } = await admin
    .from("payment_methods")
    .upsert(
      {
        method_key: methodKey,
        display_name: fields.name,
        bank: fields.bank,
        phone: fields.phone,
        ci: fields.ci,
        holder_name: fields.holderName,
        qr_image_url: fields.qrImageUrl,
        is_active: fields.isActive,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      },
      { onConflict: "method_key" },
    )
    .select(
      "method_key, display_name, bank, phone, ci, holder_name, qr_image_url, is_active, sort_order",
    )
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se pudo guardar el método de pago." };
  }

  revalidatePaymentPaths();

  const methods = await fetchAllMethods(admin);
  return {
    success: true,
    method: mapRow(data),
    methods,
  };
}

export async function toggleSubscriptionPaymentMethod(
  methodKey: string,
  isActive: boolean,
): Promise<PaymentMethodActionResult> {
  const auth = await requireSupportAdmin();
  if ("error" in auth) return auth;

  const key = methodKey.trim();
  if (!key) return { error: "Método no válido." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_methods")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.id,
    })
    .eq("method_key", key)
    .select(
      "method_key, display_name, bank, phone, ci, holder_name, qr_image_url, is_active, sort_order",
    )
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se pudo actualizar el estado." };
  }

  revalidatePaymentPaths();
  return {
    success: true,
    method: mapRow(data),
    methods: await fetchAllMethods(admin),
  };
}

export async function deleteSubscriptionPaymentMethod(
  methodKey: string,
): Promise<PaymentMethodActionResult> {
  const auth = await requireSupportAdmin();
  if ("error" in auth) return auth;

  const key = methodKey.trim();
  if (!key) return { error: "Método no válido." };

  const admin = createAdminClient();
  const { count } = await admin
    .from("payment_methods")
    .select("method_key", { count: "exact", head: true });

  if ((count ?? 0) <= 1) {
    return {
      error: "Debes conservar al menos un método de pago.",
    };
  }

  const { error } = await admin
    .from("payment_methods")
    .delete()
    .eq("method_key", key);

  if (error) {
    return { error: error.message };
  }

  revalidatePaymentPaths();
  return {
    success: true,
    methods: await fetchAllMethods(admin),
  };
}

export async function uploadSubscriptionPaymentQr(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const auth = await requireSupportAdmin();
  if ("error" in auth) return auth;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen de código QR." };
  }

  const admin = createAdminClient();
  return uploadPlatformPaymentQrImage(admin, file);
}
