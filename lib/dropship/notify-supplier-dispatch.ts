import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send-email";
import { escapeHtml } from "@/lib/email/escape-html";
import { getPublicSiteUrl } from "@/lib/env/server";
import {
  buildDispatchOrderText,
  type DispatchOrderDetails,
  type DispatchOrderLine,
} from "@/lib/dropship/dispatch-order-message";
import { normalizeSupplierPaymentConfig } from "@/lib/supplier/payment-types";

export type SupplierDispatchNotifyPayload = {
  supplierOrderId: string;
  supplierUserId: string;
  alreadyNotified: boolean;
  senderName: string;
  shipOn: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  customerDocumentId?: string | null;
  shippingCarrier: string | null;
  shippingBranchName: string | null;
  shippingBranchAddress: string | null;
  items: DispatchOrderLine[];
};

function orderCode(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

function buildDispatchHtml(details: DispatchOrderDetails): string {
  const productRows = details.items
    .map(
      (item) =>
        `<li style="margin:0 0 6px;">${escapeHtml(String(item.quantity))}× ${escapeHtml(item.productTitle)}</li>`,
    )
    .join("");

  const destinationRows = [
    details.customerName,
    details.customerDocumentId ? `Cédula ${details.customerDocumentId}` : null,
    details.customerPhone,
    details.customerAddress,
    details.shippingBranchName,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => `<li style="margin:0 0 6px;">${escapeHtml(value)}</li>`)
    .join("");

  const dashboardLink = details.dashboardUrl?.trim()
    ? `<p style="margin:20px 0 0;">
        <a href="${escapeHtml(details.dashboardUrl.trim())}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
          Abrir órdenes de compra
        </a>
      </p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#18181b;max-width:560px;margin:0 auto;padding:24px;">
      <p style="margin:0 0 12px;font-size:14px;color:#52525b;">Alcéntimo · Centro de acopio</p>
      <h1 style="margin:0 0 12px;font-size:22px;">Orden de compra #${escapeHtml(details.orderCode)}</h1>
      <p style="margin:0 0 16px;">
        Alcéntimo te compra estos productos.
        Apártalos y márcalos listos para recolección; el personal de
        logística de Alcéntimo pasará a retirarlos.
      </p>
      <h2 style="margin:20px 0 8px;font-size:16px;">Productos a apartar</h2>
      <ul style="margin:0;padding-left:18px;">${productRows || "<li>—</li>"}</ul>
      <h2 style="margin:20px 0 8px;font-size:16px;">Referencia para retiro Alcéntimo</h2>
      <ul style="margin:0;padding-left:18px;">${destinationRows || "<li>Sin destino registrado</li>"}</ul>
      <p style="margin:16px 0 0;font-size:13px;color:#52525b;">
        No despaches ni cobres al cliente final. Alcéntimo retira
        el stock y te paga la liquidación.
      </p>
      ${dashboardLink}
    </div>
  `.trim();
}

async function resolveSupplierEmail(
  admin: ReturnType<typeof createAdminClient>,
  supplierUserId: string,
  profileEmail: string | null,
): Promise<string | null> {
  const fromProfile = profileEmail?.trim().toLowerCase() ?? "";
  if (fromProfile.includes("@")) return fromProfile;

  try {
    const { data } = await admin.auth.admin.getUserById(supplierUserId);
    const authEmail =
      typeof data?.user?.email === "string" ? data.user.email.trim().toLowerCase() : "";
    return authEmail.includes("@") ? authEmail : null;
  } catch (error) {
    console.error("[notifySupplierDispatch] getUserById", error);
    return null;
  }
}

/**
 * Avisa a cada proveedor los productos a apartar para recolección de Alcéntimo.
 * El fallo de un correo no revierte el pedido.
 */
export async function notifySuppliersOfDispatchOrders(
  payloads: SupplierDispatchNotifyPayload[],
): Promise<void> {
  const pending = payloads.filter((payload) => !payload.alreadyNotified);
  if (pending.length === 0) return;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;
  const supplierIds = [...new Set(pending.map((payload) => payload.supplierUserId))];

  const profileByUser = new Map<
    string,
    { email: string | null; phone: string | null }
  >();
  if (supplierIds.length > 0) {
    const { data: profiles } = await client
      .from("supplier_profiles")
      .select("user_id, email, phone")
      .in("user_id", supplierIds);
    for (const row of (profiles as Record<string, unknown>[] | null) ?? []) {
      profileByUser.set(String(row.user_id), {
        email: typeof row.email === "string" ? row.email : null,
        phone: typeof row.phone === "string" ? row.phone : null,
      });
    }

    const { data: paymentProfiles } = await client
      .from("supplier_payment_profiles")
      .select("supplier_user_id, payment_config")
      .in("supplier_user_id", supplierIds);
    for (const row of (paymentProfiles as Record<string, unknown>[] | null) ?? []) {
      const config = normalizeSupplierPaymentConfig(row.payment_config);
      const current = profileByUser.get(String(row.supplier_user_id)) ?? {
        email: null,
        phone: null,
      };
      if (!current.phone && config.whatsappPhone.trim()) {
        current.phone = config.whatsappPhone.trim();
      }
      profileByUser.set(String(row.supplier_user_id), current);
    }
  }

  const dashboardUrl = `${getPublicSiteUrl()}/proveedor/dashboard/hub/pedidos`;
  const now = new Date().toISOString();

  for (const payload of pending) {
    const profile = profileByUser.get(payload.supplierUserId) ?? {
      email: null,
      phone: null,
    };
    const details: DispatchOrderDetails = {
      orderCode: orderCode(payload.supplierOrderId),
      senderName: payload.senderName,
      shipOn: payload.shipOn,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerAddress: payload.customerAddress,
      customerDocumentId: payload.customerDocumentId,
      shippingCarrier: payload.shippingCarrier,
      shippingBranchName: payload.shippingBranchName,
      shippingBranchAddress: payload.shippingBranchAddress,
      items: payload.items,
      dashboardUrl,
    };
    const text = buildDispatchOrderText(details);
    const email = await resolveSupplierEmail(
      admin,
      payload.supplierUserId,
      profile.email,
    );

    let marked = false;
    if (email) {
      const sent = await sendEmail({
        to: email,
        subject: `Orden de compra #${details.orderCode} · Alcéntimo te retira el stock`,
        html: buildDispatchHtml(details),
        text,
      });
      if (sent.ok) {
        marked = true;
      } else {
        console.error(
          "[notifySupplierDispatch] email failed",
          payload.supplierOrderId,
          sent.error,
        );
      }
    } else {
      console.warn(
        "[notifySupplierDispatch] missing email",
        payload.supplierOrderId,
        payload.supplierUserId,
        profile.phone ? `phone=${profile.phone}` : "no-phone",
      );
    }

    if (marked || !email) {
      const { error } = await client
        .from("supplier_orders")
        .update({ dispatch_notified_at: now, updated_at: now })
        .eq("id", payload.supplierOrderId);
      if (error) {
        console.error(
          "[notifySupplierDispatch] stamp failed",
          payload.supplierOrderId,
          error.message,
        );
      }
    }
  }
}
