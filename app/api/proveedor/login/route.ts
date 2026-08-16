import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import {
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  isAuthEmailVerified,
} from "@/lib/auth/email-verified";
import { requireSupabasePublicEnv } from "@/lib/supabase/config";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  supplierLoginUnexpectedError,
  validateSupplierLoginCredentials,
} from "@/lib/supplier/validate-login";

type LoginBody = {
  email?: string;
  password?: string;
};

/**
 * Login de proveedores con cookies en Route Handler (no Server Action).
 * Evita «An unexpected response was received from the server» al cruzar
 * perfiles de tienda/cliente con supplier_profiles.
 */
export async function POST(request: NextRequest) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  try {
    const check = await validateSupplierLoginCredentials({ email, password });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 401 });
    }

    const { url, anonKey } = requireSupabasePublicEnv();
    const hostname = request.nextUrl.hostname;

    const response = NextResponse.json({
      ok: true,
      redirectTo: check.redirectTo,
    });

    const supabase = createServerClient(url, anonKey, {
      cookieOptions: getSupabaseCookieOptions(hostname),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Cerrar sesión previa (tienda/cliente) antes de abrir la de proveedor.
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    if (check.mode === "supplier_token") {
      const otpTypes = ["magiclink", "email"] as const;
      let lastError: string | null = null;

      for (const type of otpTypes) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: check.sessionTokenHash,
          type,
        });

        if (!error && data.session && data.user) {
          if (!isAuthEmailVerified(data.user)) {
            await supabase.auth.signOut();
            return NextResponse.json(
              { error: EMAIL_VERIFICATION_REQUIRED_MESSAGE },
              { status: 403 },
            );
          }
          return response;
        }

        lastError = error?.message ?? null;
      }

      return NextResponse.json(
        {
          error: formatAuthError(
            lastError ??
              "No se pudo abrir la sesión de proveedor. Intenta de nuevo.",
          ),
        },
        { status: 401 },
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: check.email,
      password,
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        {
          error: formatAuthError(
            error?.message ?? "Correo o contraseña incorrectos.",
          ),
        },
        { status: 401 },
      );
    }

    if (!isAuthEmailVerified(data.user)) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: EMAIL_VERIFICATION_REQUIRED_MESSAGE },
        { status: 403 },
      );
    }

    return response;
  } catch (caught) {
    return NextResponse.json(
      { error: supplierLoginUnexpectedError(caught) },
      { status: 500 },
    );
  }
}
