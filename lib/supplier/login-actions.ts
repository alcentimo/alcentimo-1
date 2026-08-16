"use server";

import {
  supplierLoginUnexpectedError,
  validateSupplierLoginCredentials,
  type SupplierCredentialCheck,
} from "@/lib/supplier/validate-login";

export type SupplierLoginResult =
  | {
      ok: true;
      redirectTo: string;
      mode: "supplier_token" | "auth_password";
      sessionTokenHash?: string;
      email: string;
    }
  | { ok: false; error: string };

/**
 * Solo valida credenciales (sin cookies). Preferir POST /api/proveedor/login
 * desde el cliente para abrir la sesión.
 */
export async function loginSupplierAction(input: {
  email: string;
  password: string;
}): Promise<SupplierLoginResult> {
  try {
    const result: SupplierCredentialCheck =
      await validateSupplierLoginCredentials(input);

    if (!result.ok) return result;

    if (result.mode === "supplier_token") {
      return {
        ok: true,
        mode: "supplier_token",
        email: result.email,
        redirectTo: result.redirectTo,
        sessionTokenHash: result.sessionTokenHash,
      };
    }

    return {
      ok: true,
      mode: "auth_password",
      email: result.email,
      redirectTo: result.redirectTo,
    };
  } catch (caught) {
    return { ok: false, error: supplierLoginUnexpectedError(caught) };
  }
}
