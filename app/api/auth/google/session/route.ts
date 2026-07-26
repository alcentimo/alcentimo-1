import { NextResponse } from "next/server";
import { finalizeAuthSessionRedirect } from "@/lib/auth/finalize-auth-session";
import { createClient } from "@/lib/supabase/server";

type GoogleSessionBody = {
  token?: string;
  nonce?: string;
  next?: string | null;
  store?: string | null;
  orderId?: string | null;
};

function parseBody(raw: unknown): GoogleSessionBody {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as Record<string, unknown>;
  return {
    token: typeof body.token === "string" ? body.token.trim() : undefined,
    nonce: typeof body.nonce === "string" ? body.nonce.trim() : undefined,
    next: typeof body.next === "string" ? body.next : null,
    store: typeof body.store === "string" ? body.store : null,
    orderId: typeof body.orderId === "string" ? body.orderId : null,
  };
}

/**
 * Intercambia el ID token de Google por sesión Supabase (cookies) y devuelve la URL final.
 * Evita Server Actions tras signInWithIdToken, que en Next.js pueden fallar con
 * «An unexpected response was received from the server».
 */
export async function POST(request: Request) {
  let body: GoogleSessionBody;

  try {
    body = parseBody(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida." },
      { status: 400 },
    );
  }

  const { token, nonce, next, store, orderId } = body;

  if (!token || !nonce) {
    return NextResponse.json(
      { error: "Faltan el token o el nonce de Google." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token,
    nonce,
  });

  if (signInError) {
    return NextResponse.json(
      { error: signInError.message },
      { status: 401 },
    );
  }

  try {
    const redirectTo = await finalizeAuthSessionRedirect(supabase, {
      nextPath: next,
      storeSlug: store,
      orderId,
    });

    return NextResponse.json({ redirectTo });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el inicio de sesión.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
