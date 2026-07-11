import { NextResponse } from "next/server";
import {
  isApiSecretConfigured,
  verifyApiSecret,
} from "@/lib/api/verify-api-secret";
import {
  importVentaFromApi,
  parseImportVentaPayload,
} from "@/lib/sales/import-venta-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Puerta de entrada para POS externos, cajas registradoras e importadores CSV.
 *
 * POST /api/ventas/import
 * Headers:
 *   Authorization: Bearer <API_SECRET_KEY>  (o X-API-Key)
 *   X-Store-Id: <uuid>  (opcional — si se envía, valida que el producto pertenezca a esa tienda)
 *
 * Body JSON:
 * {
 *   "producto_id": "uuid",
 *   "cantidad": 1,
 *   "monto": 25.50,
 *   "metodo_pago": "Efectivo",
 *   "canal_venta": "Tienda Fisica",
 *   "external_reference": "POS-2026-001"
 * }
 */
export async function POST(request: Request) {
  if (!isApiSecretConfigured()) {
    return NextResponse.json(
      { error: "API_SECRET_KEY no configurada en el servidor." },
      { status: 503 },
    );
  }

  if (!verifyApiSecret(request)) {
    return NextResponse.json({ error: "API key inválida o ausente." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const payload = parseImportVentaPayload(body);

  if (!payload) {
    return NextResponse.json(
      {
        error:
          "Faltan datos requeridos. Se espera: producto_id, cantidad, monto, metodo_pago, canal_venta, external_reference.",
      },
      { status: 400 },
    );
  }

  const storeIdHeader = request.headers.get("x-store-id")?.trim() || undefined;

  try {
    const admin = createAdminClient();
    const result = await importVentaFromApi(admin, payload, {
      storeId: storeIdHeader,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        sale_id: result.saleId,
        store_id: result.storeId,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[api/ventas/import]", err);
    return NextResponse.json(
      { error: "Error interno al registrar la venta." },
      { status: 500 },
    );
  }
}
